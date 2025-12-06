import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple PII detection patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
};

// Harmful content keywords (basic safety check)
const HARMFUL_KEYWORDS = [
  "kill yourself", "self-harm", "suicide methods", "how to make a bomb",
  "synthesize drugs", "child exploitation"
];

// Secret patterns
const SECRET_PATTERNS = {
  apiKey: /\b(api[_-]?key|apikey)\s*[:=]\s*['"]?[\w-]{20,}['"]?/gi,
  bearer: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/gi,
  awsKey: /\bAKIA[0-9A-Z]{16}\b/g,
  privateKey: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
};

interface EngineScore {
  engine: string;
  scores: Record<string, number>;
  verdict: "ALLOW" | "WARN" | "BLOCK";
  details?: string;
}

// Privacy Engine: Detect PII in text
function runPrivacyEngine(text: string): EngineScore {
  const scores: Record<string, number> = {};
  let piiCount = 0;
  let hasSensitivePII = false;

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern) || [];
    scores[`${type}_count`] = matches.length;
    piiCount += matches.length;
    if (type === "ssn" || type === "creditCard") {
      hasSensitivePII = matches.length > 0;
    }
  }

  scores.pii_present = piiCount > 0 ? 1 : 0;
  scores.total_pii = piiCount;

  return {
    engine: "privacy",
    scores,
    verdict: hasSensitivePII ? "BLOCK" : piiCount > 0 ? "WARN" : "ALLOW",
    details: hasSensitivePII 
      ? "Sensitive PII detected (SSN/Credit Card)" 
      : piiCount > 0 
        ? `Found ${piiCount} PII entities` 
        : undefined,
  };
}

// Safety Engine: Detect harmful content
function runSafetyEngine(text: string): EngineScore {
  const lowerText = text.toLowerCase();
  const detectedHarmful: string[] = [];

  for (const keyword of HARMFUL_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      detectedHarmful.push(keyword);
    }
  }

  const toxicityScore = detectedHarmful.length / HARMFUL_KEYWORDS.length;

  return {
    engine: "safety",
    scores: {
      toxicity: toxicityScore,
      harmful_keywords: detectedHarmful.length,
    },
    verdict: detectedHarmful.length > 0 ? "BLOCK" : "ALLOW",
    details: detectedHarmful.length > 0 
      ? `Harmful content detected: ${detectedHarmful.join(", ")}` 
      : undefined,
  };
}

// Security Engine: Detect secrets/credentials
function runSecurityEngine(text: string): EngineScore {
  const scores: Record<string, number> = {};
  let secretFound = false;

  for (const [type, pattern] of Object.entries(SECRET_PATTERNS)) {
    const matches = text.match(pattern) || [];
    scores[`${type}_count`] = matches.length;
    if (matches.length > 0) secretFound = true;
  }

  scores.secret_leak = secretFound ? 1 : 0;

  return {
    engine: "security",
    scores,
    verdict: secretFound ? "BLOCK" : "ALLOW",
    details: secretFound ? "Potential secrets/credentials detected" : undefined,
  };
}

// Combine engine verdicts
function combineVerdicts(engines: EngineScore[]): "ALLOW" | "WARN" | "BLOCK" {
  if (engines.some(e => e.verdict === "BLOCK")) return "BLOCK";
  if (engines.some(e => e.verdict === "WARN")) return "WARN";
  return "ALLOW";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { systemId, input, traceId } = await req.json();

    if (!systemId) {
      return new Response(
        JSON.stringify({ error: "systemId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch system configuration
    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("*, projects(*)")
      .eq("id", systemId)
      .single();

    if (systemError || !system) {
      return new Response(
        JSON.stringify({ error: "System not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if system requires approval and is not approved
    if (system.requires_approval && system.deployment_status !== "approved" && system.deployment_status !== "deployed") {
      const logEntry = {
        system_id: systemId,
        project_id: system.project_id,
        request_body: input,
        response_body: { error: "System not approved for deployment" },
        status_code: 403,
        latency_ms: Date.now() - startTime,
        error_message: "Governance block: System requires approval",
        trace_id: traceId,
        decision: "BLOCK",
        engine_scores: {
          governance: { verdict: "BLOCK", reason: "Not approved" }
        },
      };
      await supabase.from("request_logs").insert(logEntry);

      return new Response(
        JSON.stringify({ error: "System not approved for deployment", decision: "BLOCK" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user input text for evaluation
    const messages = input?.messages || [];
    const userMessage = messages.find((m: any) => m.role === "user")?.content || "";
    
    // Run input evaluations
    const inputEngineScores: EngineScore[] = [
      runPrivacyEngine(userMessage),
      runSafetyEngine(userMessage),
      runSecurityEngine(userMessage),
    ];

    const inputVerdict = combineVerdicts(inputEngineScores);

    // Block if input is harmful
    if (inputVerdict === "BLOCK") {
      const logEntry = {
        system_id: systemId,
        project_id: system.project_id,
        request_body: input,
        response_body: { error: "Input blocked by safety policy" },
        status_code: 451,
        latency_ms: Date.now() - startTime,
        error_message: inputEngineScores.find(e => e.verdict === "BLOCK")?.details,
        trace_id: traceId,
        decision: "BLOCK",
        engine_scores: Object.fromEntries(inputEngineScores.map(e => [e.engine, e])),
      };
      await supabase.from("request_logs").insert(logEntry);

      return new Response(
        JSON.stringify({ 
          error: "Request blocked by safety policy",
          decision: "BLOCK",
          details: inputEngineScores.filter(e => e.verdict === "BLOCK").map(e => e.details)
        }),
        { status: 451, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward to AI Gateway
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
        model: input?.model || "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system.use_case || "You are a helpful AI assistant." },
          ...messages,
        ],
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
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || "";

    // Run output evaluations
    const outputEngineScores: EngineScore[] = [
      runPrivacyEngine(assistantMessage),
      runSafetyEngine(assistantMessage),
      runSecurityEngine(assistantMessage),
    ];

    const outputVerdict = combineVerdicts(outputEngineScores);
    const allEngineScores = {
      input: Object.fromEntries(inputEngineScores.map(e => [e.engine, e])),
      output: Object.fromEntries(outputEngineScores.map(e => [e.engine, e])),
    };

    let finalResponse = aiData;
    let finalStatusCode = 200;
    let decision = outputVerdict;

    // Modify response if output is blocked
    if (outputVerdict === "BLOCK") {
      finalResponse = {
        ...aiData,
        choices: [{
          ...aiData.choices?.[0],
          message: {
            role: "assistant",
            content: "I apologize, but I cannot provide that response as it was flagged by our safety systems.",
          }
        }]
      };
      decision = "BLOCK";
    }

    // Log the request
    const latencyMs = Date.now() - startTime;
    const logEntry = {
      system_id: systemId,
      project_id: system.project_id,
      request_body: input,
      response_body: { message: assistantMessage.substring(0, 500) },
      status_code: finalStatusCode,
      latency_ms: latencyMs,
      trace_id: traceId,
      decision,
      engine_scores: allEngineScores,
    };

    await supabase.from("request_logs").insert(logEntry);

    // Update runtime metrics
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    
    await supabase.from("risk_metrics").insert([
      { system_id: systemId, metric_name: "request_logged", metric_value: 1, time_window: "5m" },
      { system_id: systemId, metric_name: "latency_ms", metric_value: latencyMs, time_window: "5m" },
      { system_id: systemId, metric_name: decision === "BLOCK" ? "blocked_count" : "allowed_count", metric_value: 1, time_window: "5m" },
    ]);

    return new Response(
      JSON.stringify({
        ...finalResponse,
        _meta: {
          decision,
          latency_ms: latencyMs,
          trace_id: traceId,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Gateway error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
