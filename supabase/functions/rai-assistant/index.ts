import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateSession, requireAuth, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";

// Fractal RAI-OS System Knowledge Base
const SYSTEM_KNOWLEDGE = `
# Fractal RAI-OS - Responsible AI Operating System

## Overview
Fractal RAI-OS is the world's first end-to-end, open-source Responsible AI Operating System. It provides:
- 5 RAI Evaluation Engines (Fairness, Toxicity, Privacy, Hallucination, Explainability)
- Real-time monitoring and drift detection
- Human-in-the-loop (HITL) governance workflows
- CI/CD integration for deployment gates
- Knowledge graph for model lineage tracking
- EU AI Act and GDPR compliance support

## RAI Engines & Metrics

### 1. Fairness Engine (5 metrics, weighted formula)
- **Demographic Parity (25%)**: DPD = max(sel_rate) - min(sel_rate), score = 1 - min(DPD/0.1, 1)
- **Equal Opportunity (25%)**: EOD = max(TPR) - min(TPR), score = 1 - min(EOD/0.1, 1)
- **Equalized Odds (25%)**: EODs = max|TPR-TPR*| + max|FPR-FPR*|, score = 1 - min(EODs/0.1, 1)
- **Group Loss Ratio (15%)**: GLR = max(loss) / min(loss), score = 1/GLR capped at 1
- **Bias Tag Rate (10%)**: BRG = max(bias_rate) - min(bias_rate), score = 1 - min(BRG/0.1, 1)
- **Thresholds**: Pass ≥70%, Warn ≥50%, Fail <50%

### 2. Toxicity Engine (5 metrics, weighted formula)
- **Overall Toxic Rate (30%)**: TOR = toxic_outputs / total_outputs, score = 1 - TOR
- **Severe Toxicity (25%)**: STOR = severely_toxic / total, score = 1 - STOR
- **Toxicity Differential (20%)**: Δtox = output_tox - input_tox, score = 1 - max(0, Δtox)
- **Topic Toxicity (15%)**: TTOR = max topic toxicity rate, score = 1 - TTOR
- **Guardrail Catch (10%)**: GCR = safed_outputs / toxic_inputs, score = GCR
- **Thresholds**: Pass ≥95%, Warn ≥85%, Fail <85%

### 3. Privacy Engine (5 metrics, weighted formula)
- **PII Leak Rate (30%)**: PLR = pii_leaked / total_outputs, score = 1 - PLR
- **Anonymization Quality (25%)**: AQ = successfully_anonymized / total_pii, score = AQ
- **Reidentification Risk (20%)**: RR = reidentified / anonymized_records, score = 1 - RR
- **Consent Compliance (15%)**: CC = consented_uses / total_uses, score = CC
- **Retention Compliance (10%)**: RC = compliant_records / total_records, score = RC
- **Thresholds**: Pass ≥90%, Warn ≥80%, Fail <80%

### 4. Hallucination Engine (5 metrics, weighted formula)
- **Response Hallucination (30%)**: HR = hallucinatory_responses / total, score = 1 - HR
- **Claim Hallucination (25%)**: CHF = unsupported_claims / total_claims, score = 1 - CHF
- **Faithfulness (25%)**: FS = avg_judge_score / max_score, score = FS
- **Unsupported Span (10%)**: USL = unsupported_tokens / total_tokens, score = 1 - USL
- **Abstention Quality (10%)**: AQ = abstentions / risky_queries, score = AQ
- **Thresholds**: Pass ≥80%, Warn ≥60%, Fail <60%

### 5. Explainability Engine (5 metrics, weighted formula)
- **Feature Attribution Coverage (25%)**: FAC = explained_features / total_features
- **Explanation Consistency (25%)**: EC = consistent_explanations / total
- **Contrastive Quality (20%)**: CQ = valid_counterfactuals / total
- **Audience Appropriateness (15%)**: AA = appropriate_explanations / total
- **Decision Audit Trail (15%)**: DAT = audited_decisions / total_decisions
- **Thresholds**: Pass ≥75%, Warn ≥55%, Fail <55%

## Trust Boundaries & Enforcement Levels

### 1. Advisory Level
- Logs warnings but doesn't block requests
- Used during development and testing
- Generates alerts for review

### 2. Soft Enforcement
- Blocks requests only when critical thresholds exceeded (score < 40%)
- Allows with warnings for moderate issues (40-70%)
- Used in staging environments

### 3. Strict Enforcement
- Blocks any request that fails any metric
- Requires HITL approval for exceptions
- Used in production for high-risk systems

## Risk Tiers (EU AI Act Aligned)

### Unacceptable Risk
- Biometric categorization
- Social scoring
- Real-time remote biometric identification
- **Action**: Prohibited, cannot deploy

### High Risk
- Critical infrastructure (water, electricity)
- Education and vocational training
- Employment, worker management
- Essential services access (credit, emergency)
- Law enforcement
- Migration and border control
- Justice administration
- **Requirements**: Conformity assessment, human oversight, transparency, accuracy testing

### Limited Risk
- Chatbots and conversational AI
- Emotion recognition
- Biometric categorization (non-prohibited uses)
- AI-generated content
- **Requirements**: Transparency obligations

### Minimal Risk
- Video games
- Spam filters
- Inventory management
- **Requirements**: Voluntary codes of conduct

## Governance Workflows

### Human-in-the-Loop (HITL)
- Review queue for flagged requests
- SLA countdown for urgent reviews
- Decision audit trail
- Escalation to business owners

### CI/CD Integration
- Pre-deployment evaluation gates
- Minimum score requirements per engine
- Blocking vs warning configurations
- Deployment status tracking

### Registry Management
- System and model registration
- Approval workflows for high-risk systems
- Registry locking for non-compliant systems

## Common Issues & Solutions

### Engine Timeout Errors
- **Cause**: Model endpoint slow or unreachable
- **Solution**: Check endpoint health, verify HuggingFace token, ensure model is deployed

### Low Fairness Scores
- **Cause**: Unbalanced training data, biased features
- **Solution**: Audit demographic distribution, implement re-sampling, remove proxy variables

### High Toxicity Rates
- **Cause**: Insufficient guardrails, toxic training data
- **Solution**: Add content filters, fine-tune on clean data, implement output screening

### Privacy Leaks
- **Cause**: PII in training data, insufficient anonymization
- **Solution**: Scrub training data, implement differential privacy, add PII detection

### Hallucination Issues
- **Cause**: Outdated knowledge, insufficient grounding
- **Solution**: Add RAG retrieval, implement fact-checking, improve abstention training
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication required for RAI Assistant
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    console.log(`[rai-assistant] User ${authResult.user?.id} accessing assistant...`);

    const { messages, currentPage, systemId, thinkingMode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service client for platform-wide data access
    const supabase = getServiceClient();

    // Fetch live system context
    const contextParts: string[] = [SYSTEM_KNOWLEDGE];

    // Add current page context
    if (currentPage) {
      contextParts.push(`\n## Current User Context\nThe user is currently viewing: ${currentPage}`);
    }

    // Fetch recent platform stats
    const [systemsRes, modelsRes, incidentsRes, evaluationsRes, alertsRes] = await Promise.all([
      supabase.from("systems").select("id, name, status, deployment_status, provider, system_type").limit(20),
      supabase.from("models").select("id, name, status, fairness_score, toxicity_score, privacy_score, overall_score").limit(20),
      supabase.from("incidents").select("id, title, severity, status, created_at").eq("status", "open").limit(10),
      supabase.from("evaluation_runs").select("id, engine_type, status, overall_score, created_at, model_id").order("created_at", { ascending: false }).limit(20),
      supabase.from("drift_alerts").select("id, drift_type, severity, status, feature").eq("status", "open").limit(10),
    ]);

    // Build live context
    if (systemsRes.data && systemsRes.data.length > 0) {
      contextParts.push(`\n## Live Systems (${systemsRes.data.length} registered)`);
      systemsRes.data.forEach((s: any) => {
        contextParts.push(`- ${s.name}: ${s.status}, deployment=${s.deployment_status}, provider=${s.provider}`);
      });
    }

    if (modelsRes.data && modelsRes.data.length > 0) {
      contextParts.push(`\n## Live Models (${modelsRes.data.length} registered)`);
      modelsRes.data.forEach((m: any) => {
        const scores = [];
        if (m.fairness_score) scores.push(`fairness=${m.fairness_score}%`);
        if (m.toxicity_score) scores.push(`toxicity=${m.toxicity_score}%`);
        if (m.privacy_score) scores.push(`privacy=${m.privacy_score}%`);
        if (m.overall_score) scores.push(`overall=${m.overall_score}%`);
        contextParts.push(`- ${m.name}: ${m.status}${scores.length > 0 ? ` (${scores.join(', ')})` : ''}`);
      });
    }

    if (incidentsRes.data && incidentsRes.data.length > 0) {
      contextParts.push(`\n## Open Incidents (${incidentsRes.data.length})`);
      incidentsRes.data.forEach((i: any) => {
        contextParts.push(`- [${i.severity}] ${i.title}`);
      });
    }

    if (alertsRes.data && alertsRes.data.length > 0) {
      contextParts.push(`\n## Active Drift Alerts (${alertsRes.data.length})`);
      alertsRes.data.forEach((a: any) => {
        contextParts.push(`- [${a.severity}] ${a.drift_type} drift on ${a.feature}`);
      });
    }

    if (evaluationsRes.data && evaluationsRes.data.length > 0) {
      contextParts.push(`\n## Recent Evaluations (last ${evaluationsRes.data.length})`);
      const byEngine: Record<string, any[]> = {};
      evaluationsRes.data.forEach((e: any) => {
        const engine = e.engine_type || 'unknown';
        if (!byEngine[engine]) byEngine[engine] = [];
        byEngine[engine].push(e);
      });
      Object.entries(byEngine).forEach(([engine, evals]) => {
        const avgScore = evals.filter(e => e.overall_score).reduce((sum, e) => sum + e.overall_score, 0) / evals.filter(e => e.overall_score).length;
        contextParts.push(`- ${engine}: ${evals.length} runs, avg score=${isNaN(avgScore) ? 'N/A' : avgScore.toFixed(1)}%`);
      });
    }

    // If specific system context requested
    if (systemId) {
      const { data: system } = await supabase
        .from("systems")
        .select("*, projects(*)")
        .eq("id", systemId)
        .single();
      
      if (system) {
        contextParts.push(`\n## Selected System: ${system.name}`);
        contextParts.push(`- Type: ${system.system_type}`);
        contextParts.push(`- Provider: ${system.provider}`);
        contextParts.push(`- Status: ${system.status}`);
        contextParts.push(`- Deployment: ${system.deployment_status}`);
        contextParts.push(`- URI Score: ${system.uri_score ?? 'Not calculated'}`);
        contextParts.push(`- Runtime Risk: ${system.runtime_risk_score ?? 'Not calculated'}`);
      }
    }

    const systemPrompt = `You are Fractal, the AI assistant for Fractal RAI-OS - a Responsible AI Operating System.

Your role:
1. Answer questions about RAI metrics, formulas, and their interpretation
2. Help users understand why models pass or fail evaluations
3. Suggest improvements to increase RAI scores
4. Explain governance workflows and compliance requirements
5. Provide guidance on EU AI Act and regulatory compliance

Guidelines:
- Be concise and technical when appropriate
- Reference specific metrics, formulas, and thresholds
- When discussing scores, explain what affects them
- Suggest actionable improvements
- Use the live system data when relevant
${thinkingMode ? '\n- THINKING MODE ENABLED: Show your step-by-step reasoning before giving the final answer. Format as:\n<thinking>\nStep 1: ...\nStep 2: ...\n</thinking>\n\nFinal answer: ...' : ''}

${contextParts.join('\n')}`;

    // Select model based on thinking mode
    const model = thinkingMode ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    // Stream the response
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("RAI Assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
