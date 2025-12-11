import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HuggingFace model: vectara/hallucination_evaluation_model
const HF_HALLUCINATION_MODEL = "vectara/hallucination_evaluation_model";
const HF_HALLUCINATION_API = `https://api-inference.huggingface.co/models/${HF_HALLUCINATION_MODEL}`;

interface HallucinationResult {
  success: boolean;
  model_id: string;
  model_version: string;
  factuality_score: number; // 0-1, higher = more factual
  groundedness_score: number;
  overall_score: number; // 0-100, higher = better
  verdict: "FACTUAL" | "UNCERTAIN" | "HALLUCINATION";
  inference_latency_ms: number;
  details: {
    raw_output: any;
    claims_analyzed: number;
    threshold_applied: number;
  };
}

interface ClaimCheck {
  premise: string;
  hypothesis: string;
}

async function callHuggingFaceNLI(input: ClaimCheck | string, hfToken: string): Promise<any> {
  // Vectara model expects { premise, hypothesis } for NLI-style evaluation
  const payload = typeof input === "string" 
    ? { inputs: input }
    : { inputs: `premise: ${input.premise}\nhypothesis: ${input.hypothesis}` };

  const response = await fetch(HF_HALLUCINATION_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

function parseFactualityOutput(output: any): number {
  // Vectara model returns classification scores
  // Format varies: could be [[{label: "ACCURATE", score: 0.9}, ...]] or similar
  if (!output) return 0.5;

  // Try to extract factuality score
  if (Array.isArray(output)) {
    const labels = Array.isArray(output[0]) ? output[0] : output;
    
    for (const item of labels) {
      if (!item.label || typeof item.score !== "number") continue;
      
      const label = item.label.toLowerCase();
      // Look for factual/accurate/consistent labels
      if (label.includes("accurate") || label.includes("factual") || label.includes("consistent") || label.includes("entail")) {
        return item.score;
      }
    }
    
    // If we have labels but didn't find factual, look for contradiction
    for (const item of labels) {
      const label = item.label?.toLowerCase() || "";
      if (label.includes("contradict") || label.includes("hallucin") || label.includes("inconsistent")) {
        return 1 - item.score; // Invert contradiction score
      }
    }
  }

  // Fallback: if output is a number directly
  if (typeof output === "number") return output;

  return 0.5; // Unknown
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { 
      text, // The generated text to check
      context, // Optional: source/reference context
      claims, // Optional: array of {premise, hypothesis} pairs
      modelId,
      autoEscalate = true 
    } = await req.json();

    if (!text && !claims) {
      return new Response(
        JSON.stringify({ error: "Either 'text' or 'claims' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hfToken = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!hfToken) {
      return new Response(
        JSON.stringify({ 
          error: "HUGGING_FACE_ACCESS_TOKEN not configured",
          message: "Please configure your HuggingFace token in Settings → Integrations"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[eval-hallucination-hf] Analyzing with ${HF_HALLUCINATION_MODEL}...`);

    let rawOutput: any;
    let factualityScore: number;
    let claimsAnalyzed = 1;

    if (claims && Array.isArray(claims) && claims.length > 0) {
      // Analyze multiple claims
      const claimScores: number[] = [];
      const allOutputs: any[] = [];

      for (const claim of claims) {
        try {
          const output = await callHuggingFaceNLI(claim, hfToken);
          allOutputs.push(output);
          claimScores.push(parseFactualityOutput(output));
        } catch {
          claimScores.push(0.5); // Neutral for failed claims
        }
      }

      rawOutput = allOutputs;
      factualityScore = claimScores.reduce((a, b) => a + b, 0) / claimScores.length;
      claimsAnalyzed = claims.length;

    } else {
      // Single text analysis
      const input = context 
        ? { premise: context, hypothesis: text }
        : text;

      rawOutput = await callHuggingFaceNLI(input, hfToken);
      factualityScore = parseFactualityOutput(rawOutput);
    }

    const inferenceLatency = Date.now() - startTime;

    // Determine verdict
    const FACTUAL_THRESHOLD = 0.8;
    const UNCERTAIN_THRESHOLD = 0.5;
    
    let verdict: "FACTUAL" | "UNCERTAIN" | "HALLUCINATION" = "UNCERTAIN";
    if (factualityScore >= FACTUAL_THRESHOLD) {
      verdict = "FACTUAL";
    } else if (factualityScore < UNCERTAIN_THRESHOLD) {
      verdict = "HALLUCINATION";
    }

    // Convert to 0-100 scale
    const overallScore = Math.round(factualityScore * 100);
    const groundednessScore = factualityScore; // Same metric for now

    const result: HallucinationResult = {
      success: true,
      model_id: HF_HALLUCINATION_MODEL,
      model_version: "latest",
      factuality_score: factualityScore,
      groundedness_score: groundednessScore,
      overall_score: overallScore,
      verdict,
      inference_latency_ms: inferenceLatency,
      details: {
        raw_output: rawOutput,
        claims_analyzed: claimsAnalyzed,
        threshold_applied: FACTUAL_THRESHOLD,
      },
    };

    // Auto-escalate to HITL if hallucination detected
    if (autoEscalate && verdict === "HALLUCINATION") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("review_queue").insert({
        title: `Hallucination Detected: ${Math.round(factualityScore * 100)}% factuality`,
        description: `HuggingFace ${HF_HALLUCINATION_MODEL} flagged content with low factuality score. ${claimsAnalyzed} claims analyzed.`,
        review_type: "hallucination_flag",
        severity: factualityScore < 0.3 ? "critical" : "high",
        status: "pending",
        model_id: modelId || null,
        context: {
          factuality_score: factualityScore,
          claims_analyzed: claimsAnalyzed,
          text_preview: (text || "").substring(0, 200),
          model_used: HF_HALLUCINATION_MODEL,
        },
        sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      });

      console.log(`[eval-hallucination-hf] Auto-escalated to HITL queue`);
    }

    console.log(`[eval-hallucination-hf] Complete. Factuality: ${Math.round(factualityScore * 100)}%, Verdict: ${verdict}, Latency: ${inferenceLatency}ms`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[eval-hallucination-hf] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model_id: HF_HALLUCINATION_MODEL,
        message: "HuggingFace model unavailable - check your token and try again"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
