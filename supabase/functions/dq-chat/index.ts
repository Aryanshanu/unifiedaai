import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// TYPES - Governance-Grade Contracts
// ============================================

type DQIntent =
  | 'SUMMARY'
  | 'FAILED_RULES'
  | 'COLUMN_ISSUE'
  | 'INCIDENT_STATUS'
  | 'ROOT_CAUSE'
  | 'REMEDIATION'
  | 'TREND'
  | 'GOVERNANCE_TRUST'
  | 'UNKNOWN';

interface ExtractedEntities {
  columns: string[];
  rules: string[];
  dimensions: string[];
  severities: string[];
  steps: string[];
}

interface ColumnProfileInfo {
  name: string;
  dtype: string;
  completeness: number;
  null_count: number;
  distinct_count: number;
  uniqueness?: number;
}

interface FailedRuleInfo {
  rule_id: string;
  rule_name: string;
  dimension: string;
  column_name: string | null;
  success_rate: number;
  failed_count: number;
  threshold: number;
  severity: string;
}

interface RuleInfo {
  id: string;
  rule_name: string;
  dimension: string;
  column_name: string | null;
  severity: string;
  threshold: number;
}

interface IncidentInfo {
  id: string;
  dimension: string;
  severity: 'P0' | 'P1' | 'P2';
  status: string;
  action: string;
  rule_id?: string | null;
}

interface LiveDQContext {
  dataset_id: string;
  dataset_name: string | null;
  pipeline_run_id: string | null;
  timestamp: string;
  profiling?: {
    row_count: number;
    column_count: number;
    column_profiles: Record<string, ColumnProfileInfo>;
    available_dimensions: string[];
    unavailable_dimensions: string[];
  };
  rules?: {
    total: number;
    by_dimension: Record<string, number>;
    critical: number;
    warning: number;
    info: number;
    items: RuleInfo[];
  };
  execution?: {
    id: string;
    total_rules: number;
    passed: number;
    failed: number;
    critical_failure: boolean;
    overall_score: number | null;
    failed_rules: FailedRuleInfo[];
  };
  incidents?: {
    open: number;
    by_severity: Record<'P0' | 'P1' | 'P2', number>;
    items: IncidentInfo[];
  };
  governance_report?: {
    integrity_score: number;
    missing_dimensions: string[];
    inconsistencies: string[];
    score_breakdown?: {
      base: number;
      dimension_penalty: number;
      simulated_penalty: number;
      critical_penalty: number;
      warning_penalty: number;
    };
  };
}

interface ChatRequest {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: LiveDQContext | null;
  extracted_entities: ExtractedEntities | null;
  mode: 'dataset' | 'general';
}

interface ChatResponse {
  status: 'success' | 'error';
  answer?: string;
  error_code?: 'NO_CONTEXT' | 'MODEL_UNAVAILABLE' | 'INVALID_REQUEST' | 'RATE_LIMITED' | 'MISSING_DATA';
  error_message?: string;
  metadata?: {
    intent?: DQIntent;
    entities?: ExtractedEntities;
    context_timestamp?: string;
    mode: 'dataset' | 'general';
  };
}

// ============================================
// INTENT CLASSIFICATION (via tool calling)
// ============================================

async function classifyIntent(message: string, apiKey: string): Promise<DQIntent> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "Classify the user's data quality question intent. Choose the most specific intent that matches." 
          },
          { role: "user", content: message }
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_intent",
            description: "Classify the user's data quality question intent",
            parameters: {
              type: "object",
              properties: {
                intent: {
                  type: "string",
                  enum: ["SUMMARY", "FAILED_RULES", "COLUMN_ISSUE", "INCIDENT_STATUS", "ROOT_CAUSE", "REMEDIATION", "TREND", "GOVERNANCE_TRUST", "UNKNOWN"],
                  description: "SUMMARY=general status, FAILED_RULES=what failed, COLUMN_ISSUE=specific column, INCIDENT_STATUS=open incidents, ROOT_CAUSE=why it happened, REMEDIATION=how to fix, TREND=historical, GOVERNANCE_TRUST=integrity score explanation"
                },
                confidence: { type: "number", minimum: 0, maximum: 1 }
              },
              required: ["intent"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "classify_intent" } },
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.log("[dq-chat] Intent classification failed, defaulting to UNKNOWN");
      return "UNKNOWN";
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`[dq-chat] Intent classified: ${args.intent} (confidence: ${args.confidence || 'N/A'})`);
      return args.intent as DQIntent || "UNKNOWN";
    }
    
    return "UNKNOWN";
  } catch (error) {
    console.error("[dq-chat] Intent classification error:", error);
    return "UNKNOWN";
  }
}

// ============================================
// CONTEXT VALIDATION
// ============================================

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

function validateContextForIntent(intent: DQIntent, context: LiveDQContext): ValidationResult {
  switch (intent) {
    case "FAILED_RULES":
    case "ROOT_CAUSE":
    case "REMEDIATION":
      if (!context.execution) {
        return { valid: false, reason: "Execution data not available. Please run the pipeline first." };
      }
      if (context.execution.failed === 0) {
        return { valid: true }; // No failures, but context is valid
      }
      break;
      
    case "COLUMN_ISSUE":
      if (!context.profiling) {
        return { valid: false, reason: "Profiling data not available. Please run profiling first." };
      }
      break;
      
    case "INCIDENT_STATUS":
      if (!context.incidents) {
        return { valid: false, reason: "No incidents data available." };
      }
      break;
      
    case "GOVERNANCE_TRUST":
      if (!context.governance_report) {
        return { valid: false, reason: "Governance Integrity Report not available. Complete a full pipeline run." };
      }
      break;
      
    case "TREND":
      // Trend requires historical data - we only have current snapshot
      return { valid: false, reason: "Historical trend analysis is not available in the current pipeline run. Only current snapshot data is accessible." };
  }
  
  return { valid: true };
}

// ============================================
// GOVERNANCE-GRADE SYSTEM PROMPT
// ============================================

function buildGovernancePrompt(
  context: LiveDQContext, 
  intent: DQIntent, 
  entities: ExtractedEntities
): string {
  const contextSummary = buildContextSummary(context);
  
  // Enhanced system prompt with mandatory markdown formatting for better UX
  return `You are the Data Quality Governance Assistant for the Fractal Unified Governance Platform.

You are a governance-bound assistant with access ONLY to the provided live pipeline context.

STRICT RULES:
- You must NEVER invent metrics, scores, rules, incidents, or counts.
- You must NEVER infer values that are not explicitly present in context.
- If data is unavailable, say "This information is not available in the current pipeline run."
- If a question refers to a column, rule, or dimension that does not exist, state this clearly and professionally.
- Your answers must always match the latest pipeline snapshot timestamp.
- Reference exact numbers from the context - never approximate.

RESPONSE FORMAT (MANDATORY - Always use this structure):
Structure every response using clear markdown formatting:

## Summary
[One sentence overview of the situation - be direct and informative]

## Key Findings
- **Finding 1**: Value with context
- **Finding 2**: Value with context
(Include 2-5 bullet points with the most important metrics)

## Details
[If needed, provide additional context in organized paragraphs or sub-bullets]

## Recommendations
1. First actionable step
2. Second actionable step
(Number your recommendations for clarity)

## Next Steps
Let me know if you need more details on any specific finding.

CALCULATION TRANSPARENCY (Always include when discussing rates):
When mentioning error rates or scores, include the formula:
- Example: "Error Rate = 142 failing rows / 10,000 total rows × 100 = **1.42%**"
- Example: "Pass Rate = 18 passed / 20 total rules × 100 = **90%**"

COMMUNICATION STYLE (CRITICAL):
- Strictly professional and formal tone
- Concise, helpful, suitable for enterprise stakeholders
- Never use aggressive language, warnings, or alarming phrases
- Present findings factually without dramatization
- Provide actionable recommendations in a supportive manner
- Be respectful and constructive at all times
- No emojis, no exclamation marks, no casual language
- No phrases like "WARNING!", "CRITICAL!", "ALERT!"
- Use clear markdown headers (##), bold (**text**), and bullet points (-)

=== CURRENT PIPELINE CONTEXT ===
${contextSummary}

=== USER INTENT ===
${intent}

=== EXTRACTED ENTITIES ===
- Columns mentioned: ${entities.columns.length > 0 ? entities.columns.join(', ') : 'none'}
- Rules mentioned: ${entities.rules.length > 0 ? entities.rules.join(', ') : 'none'}
- Dimensions mentioned: ${entities.dimensions.length > 0 ? entities.dimensions.join(', ') : 'none'}
- Severities mentioned: ${entities.severities.length > 0 ? entities.severities.join(', ') : 'none'}

=== INSTRUCTIONS ===
- Answer ONLY the user's intent using the provided context.
- Reference exact counts, columns, rules, and severities from context.
- Use the RESPONSE FORMAT above for all answers.
- If intent is SUMMARY, provide a professional overview with Key Findings and Recommendations.
- If intent is FAILED_RULES, list specific failed rules with their details under Key Findings.
- If intent is COLUMN_ISSUE, explain column issues professionally with data from profiling.
- If intent is REMEDIATION, provide clear numbered steps under Recommendations.
- If intent is GOVERNANCE_TRUST, explain the integrity score breakdown under Details.
- If intent is INCIDENT_STATUS, summarize open incidents by severity under Key Findings.
- If intent is UNKNOWN, ask ONE clarifying question politely.
- If data is not available, clearly state it is not available in the current pipeline run.

BEGIN RESPONSE.`;
}

function buildContextSummary(context: LiveDQContext): string {
  const parts: string[] = [];
  
  // Dataset info
  parts.push(`Dataset: ${context.dataset_name || context.dataset_id || 'Unknown'}`);
  parts.push(`Pipeline Run ID: ${context.pipeline_run_id || 'N/A'}`);
  parts.push(`Timestamp: ${context.timestamp}`);
  
  // Profiling
  if (context.profiling) {
    parts.push(`\n--- PROFILING ---`);
    parts.push(`Row Count: ${context.profiling.row_count.toLocaleString()}`);
    parts.push(`Column Count: ${context.profiling.column_count}`);
    
    // List columns with completeness issues
    const lowCompleteness = Object.values(context.profiling.column_profiles)
      .filter(c => c.completeness < 95)
      .sort((a, b) => a.completeness - b.completeness);
    
    if (lowCompleteness.length > 0) {
      parts.push(`Columns with <95% completeness:`);
      lowCompleteness.slice(0, 10).forEach(c => {
        parts.push(`  - ${c.name}: ${c.completeness.toFixed(1)}% (${c.null_count} nulls)`);
      });
      if (lowCompleteness.length > 10) {
        parts.push(`  ... and ${lowCompleteness.length - 10} more`);
      }
    }
    
    parts.push(`Available dimensions: ${context.profiling.available_dimensions.join(', ') || 'none'}`);
    parts.push(`Missing dimensions: ${context.profiling.unavailable_dimensions.join(', ') || 'none'}`);
  } else {
    parts.push(`\n--- PROFILING ---`);
    parts.push(`Status: Not available`);
  }
  
  // Rules
  if (context.rules) {
    parts.push(`\n--- RULES ---`);
    parts.push(`Total Rules: ${context.rules.total}`);
    parts.push(`By Severity: Critical=${context.rules.critical}, Warning=${context.rules.warning}, Info=${context.rules.info}`);
    parts.push(`By Dimension: ${Object.entries(context.rules.by_dimension).map(([k,v]) => `${k}=${v}`).join(', ')}`);
  } else {
    parts.push(`\n--- RULES ---`);
    parts.push(`Status: No rules defined`);
  }
  
  // Execution
  if (context.execution) {
    parts.push(`\n--- EXECUTION ---`);
    parts.push(`Total Rules Executed: ${context.execution.total_rules}`);
    parts.push(`Passed: ${context.execution.passed}`);
    parts.push(`Failed: ${context.execution.failed}`);
    parts.push(`Overall Score: ${context.execution.overall_score !== null ? `${context.execution.overall_score}%` : 'N/A'}`);
    parts.push(`Critical Failure: ${context.execution.critical_failure ? 'YES' : 'No'}`);
    
    if (context.execution.failed_rules.length > 0) {
      parts.push(`\nFailed Rules Details:`);
      context.execution.failed_rules.forEach(r => {
        parts.push(`  - ${r.rule_name} [${r.dimension}/${r.severity}]: ${(r.success_rate * 100).toFixed(1)}% success (${r.failed_count} failures, threshold: ${(r.threshold * 100).toFixed(0)}%)`);
        if (r.column_name) {
          parts.push(`    Column: ${r.column_name}`);
        }
      });
    }
  } else {
    parts.push(`\n--- EXECUTION ---`);
    parts.push(`Status: Not executed`);
  }
  
  // Incidents
  if (context.incidents) {
    parts.push(`\n--- INCIDENTS ---`);
    parts.push(`Total Open: ${context.incidents.open}`);
    parts.push(`By Severity: P0=${context.incidents.by_severity.P0}, P1=${context.incidents.by_severity.P1}, P2=${context.incidents.by_severity.P2}`);
    
    if (context.incidents.items.length > 0) {
      parts.push(`\nIncident Details:`);
      context.incidents.items.slice(0, 5).forEach(i => {
        parts.push(`  - [${i.severity}/${i.status}] ${i.dimension}: ${i.action}`);
      });
      if (context.incidents.items.length > 5) {
        parts.push(`  ... and ${context.incidents.items.length - 5} more`);
      }
    }
  } else {
    parts.push(`\n--- INCIDENTS ---`);
    parts.push(`Status: No incidents`);
  }
  
  // Governance Report
  if (context.governance_report) {
    parts.push(`\n--- GOVERNANCE INTEGRITY REPORT ---`);
    parts.push(`Integrity Score: ${context.governance_report.integrity_score}/100`);
    
    if (context.governance_report.missing_dimensions.length > 0) {
      parts.push(`Missing Dimensions: ${context.governance_report.missing_dimensions.join(', ')}`);
    }
    
    if (context.governance_report.inconsistencies.length > 0) {
      parts.push(`Inconsistencies Found:`);
      context.governance_report.inconsistencies.forEach(i => {
        parts.push(`  - ${i}`);
      });
    }
    
    if (context.governance_report.score_breakdown) {
      const sb = context.governance_report.score_breakdown;
      parts.push(`\nScore Breakdown:`);
      parts.push(`  Base: ${sb.base}`);
      parts.push(`  Dimension Penalty: -${sb.dimension_penalty}`);
      parts.push(`  Simulated Penalty: -${sb.simulated_penalty}`);
      parts.push(`  Critical Penalty: -${sb.critical_penalty}`);
      parts.push(`  Warning Penalty: -${sb.warning_penalty}`);
    }
  }
  
  return parts.join('\n');
}

// ============================================
// GENERAL DATA GOVERNANCE PROMPT
// ============================================

function buildGeneralGovernancePrompt(): string {
  return `You are the Data Quality Governance Assistant for the Fractal Unified Governance Platform.

You are in **General Data Governance Mode**. You should answer questions about:
- Data quality concepts and dimensions (completeness, uniqueness, validity, accuracy, timeliness, consistency)
- Data governance best practices and frameworks
- Industry standards (DAMA DMBOK, ISO 8000, etc.)
- Data quality tools and methodologies
- Data stewardship and ownership
- Metadata management
- Data lineage concepts
- Regulatory compliance (GDPR, CCPA, etc.)

STRICT RULES:
- Do NOT reference any specific dataset, pipeline, or results
- Provide educational, conceptual answers
- Use examples when helpful (but make them generic)
- Be accurate and cite industry standards when relevant
- If asked about specific data or metrics, explain you're in General mode and suggest switching to Dataset Context mode

RESPONSE FORMAT (MANDATORY):
Structure every response using clear markdown formatting:

## Summary
[One sentence overview of the concept]

## Key Points
- **Point 1**: Clear explanation
- **Point 2**: Clear explanation

## Details
[Additional context and explanation]

## Best Practices
1. First recommendation
2. Second recommendation

## Learn More
Suggest related topics or questions.

COMMUNICATION STYLE:
- Professional and formal tone
- Educational and supportive
- No hallucinations - admit if unsure
- Use markdown headers (##), bold (**text**), and bullet points (-)
- No emojis, no exclamation marks
- No aggressive warnings or alarming language

BEGIN RESPONSE.`;
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Extract mode (default to 'dataset' for backward compatibility)
    const mode = body.mode || 'dataset';
    
    // Handle both old string-based context and new structured context
    const isLegacyRequest = typeof body.context === 'string';
    
    let message: string;
    let history: Array<{ role: 'user' | 'assistant'; content: string }>;
    let context: LiveDQContext | null;
    let extractedEntities: ExtractedEntities;
    
    if (isLegacyRequest) {
      // Legacy: context is a string
      message = body.message;
      history = body.history || [];
      extractedEntities = { columns: [], rules: [], dimensions: [], severities: [], steps: [] };
      
      // Convert string context to minimal LiveDQContext
      context = {
        dataset_id: 'legacy',
        dataset_name: null,
        pipeline_run_id: null,
        timestamp: new Date().toISOString()
      };
      
      // If context string indicates no data, return error
      if (!body.context || body.context === 'No data quality context available.') {
        console.log("[dq-chat] No context provided (legacy)");
        const response: ChatResponse = {
          status: 'error',
          error_code: 'NO_CONTEXT',
          error_message: 'No data quality data is available. Please run the DQ pipeline first.',
          metadata: { mode }
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } else {
      // New structured request
      const request = body as ChatRequest;
      message = request.message;
      history = request.history || [];
      context = request.context;
      extractedEntities = request.extracted_entities || { columns: [], rules: [], dimensions: [], severities: [], steps: [] };
    }

    // Validation: message required
    if (!message || typeof message !== 'string' || !message.trim()) {
      console.log("[dq-chat] Invalid request: empty message");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'INVALID_REQUEST',
        error_message: 'Please enter a valid question.',
        metadata: { mode }
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[dq-chat] LOVABLE_API_KEY not configured");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'MODEL_UNAVAILABLE',
        error_message: 'AI service is not configured. Please contact support.',
        metadata: { mode }
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============================================
    // GENERAL MODE - No context required
    // ============================================
    if (mode === 'general') {
      console.log(`[dq-chat] General mode query: "${message.substring(0, 50)}..."`);
      
      const systemPrompt = buildGeneralGovernancePrompt();
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ];
      
      console.log(`[dq-chat] Calling Lovable AI Gateway for general mode`);
      
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });
      
      // Handle rate limiting
      if (aiResponse.status === 429) {
        console.log("[dq-chat] Rate limited by Lovable AI");
        const response: ChatResponse = {
          status: 'error',
          error_code: 'RATE_LIMITED',
          error_message: 'Too many requests. Please wait a moment and try again.',
          metadata: { mode }
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Handle payment required
      if (aiResponse.status === 402) {
        console.log("[dq-chat] Payment required for Lovable AI");
        const response: ChatResponse = {
          status: 'error',
          error_code: 'MODEL_UNAVAILABLE',
          error_message: 'AI credits exhausted. Please add credits to continue.',
          metadata: { mode }
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Handle other errors
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("[dq-chat] AI gateway error:", aiResponse.status, errorText);
        const response: ChatResponse = {
          status: 'error',
          error_code: 'MODEL_UNAVAILABLE',
          error_message: 'The AI model is temporarily unavailable. Please try again in a moment.',
          metadata: { mode }
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Parse successful response
      const data = await aiResponse.json();
      const answer = data.choices?.[0]?.message?.content;

      if (!answer) {
        console.error("[dq-chat] Empty response from AI");
        const response: ChatResponse = {
          status: 'error',
          error_code: 'MODEL_UNAVAILABLE',
          error_message: 'The AI returned an empty response. Please try again.',
          metadata: { mode }
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`[dq-chat] General mode response generated successfully`);
      
      const response: ChatResponse = {
        status: 'success',
        answer,
        metadata: { mode }
      };
      
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============================================
    // DATASET MODE - Context required
    // ============================================
    
    // Validation: context required for dataset mode
    if (!context || !context.dataset_id) {
      console.log("[dq-chat] No context provided for dataset mode");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'NO_CONTEXT',
        error_message: 'No data quality data is available. Please run the DQ pipeline first.',
        metadata: { mode }
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Step 1: Classify intent
    console.log(`[dq-chat] Classifying intent for: "${message.substring(0, 50)}..."`);
    const intent = await classifyIntent(message, LOVABLE_API_KEY);
    console.log(`[dq-chat] Intent: ${intent}`);

    // Step 2: Validate context for intent
    const validation = validateContextForIntent(intent, context);
    if (!validation.valid) {
      console.log(`[dq-chat] Context validation failed: ${validation.reason}`);
      const response: ChatResponse = {
        status: 'error',
        error_code: 'MISSING_DATA',
        error_message: validation.reason,
        metadata: {
          intent,
          entities: extractedEntities,
          context_timestamp: context.timestamp,
          mode
        }
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Step 3: Build governance-grade system prompt
    const systemPrompt = buildGovernancePrompt(context, intent, extractedEntities);

    // Step 4: Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    console.log(`[dq-chat] Calling Lovable AI Gateway with ${messages.length} messages, intent=${intent}`);

    // Step 5: Call Lovable AI Gateway

    // Step 5: Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.2, // Lower temperature for more consistent formatting
        max_tokens: 2000, // Increased for detailed structured responses
      }),
    });

    // Handle rate limiting
    if (aiResponse.status === 429) {
      console.log("[dq-chat] Rate limited by Lovable AI");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'RATE_LIMITED',
        error_message: 'Too many requests. Please wait a moment and try again.',
        metadata: { mode: 'dataset' }
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handle payment required
    if (aiResponse.status === 402) {
      console.log("[dq-chat] Payment required for Lovable AI");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'MODEL_UNAVAILABLE',
        error_message: 'AI credits exhausted. Please add credits to continue.',
        metadata: { mode: 'dataset' }
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handle other errors
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[dq-chat] AI gateway error:", aiResponse.status, errorText);
      const response: ChatResponse = {
        status: 'error',
        error_code: 'MODEL_UNAVAILABLE',
        error_message: 'The AI model is temporarily unavailable. Please try again in a moment.',
        metadata: { mode: 'dataset' }
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse successful response
    const data = await aiResponse.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      console.error("[dq-chat] Empty response from AI");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'MODEL_UNAVAILABLE',
        error_message: 'The AI returned an empty response. Please try again.',
        metadata: { mode: 'dataset' }
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[dq-chat] Response generated successfully (intent=${intent})`);
    
    const response: ChatResponse = {
      status: 'success',
      answer,
      metadata: {
        intent,
        entities: extractedEntities,
        context_timestamp: context.timestamp,
        mode: 'dataset'
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[dq-chat] Error:", error);
    const response: ChatResponse = {
      status: 'error',
      error_code: 'MODEL_UNAVAILABLE',
      error_message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      metadata: { mode: 'dataset' }
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
