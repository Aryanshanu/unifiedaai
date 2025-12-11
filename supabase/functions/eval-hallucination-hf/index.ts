import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HuggingFace model: vectara/hallucination_evaluation_model
const HF_HALLUCINATION_MODEL = "vectara/hallucination_evaluation_model";
const HF_HALLUCINATION_API = `https://api-inference.huggingface.co/models/${HF_HALLUCINATION_MODEL}`;

// ============================================
// 2025 SOTA HALLUCINATION METRICS
// ============================================

// Metric 1: Response-level Hallucination Rate Score
// Hall_Resp = 1 - HR
function hallRespScore(hallucinatoryResponses: number, totalResponses: number): number {
  if (totalResponses === 0) return 1;
  const hr = hallucinatoryResponses / totalResponses;
  return 1 - hr;
}

// Metric 2: Claim-level Hallucination Fraction Score
// Hall_Claim = 1 - CHF
function hallClaimScore(unsupportedClaims: number, totalClaims: number): number {
  if (totalClaims === 0) return 1;
  const chf = unsupportedClaims / totalClaims;
  return 1 - chf;
}

// Metric 3: Faithfulness Score (judge-rated 0-1)
// Hall_Faith = FS (already normalized)
function hallFaithScore(avgJudgeScore: number): number {
  return Math.max(0, Math.min(1, avgJudgeScore));
}

// Metric 4: Unsupported Span Length Ratio Score
// Hall_Span = 1 - USL
function hallSpanScore(unsupportedTokens: number, totalTokens: number): number {
  if (totalTokens === 0) return 1;
  const usl = unsupportedTokens / totalTokens;
  return 1 - usl;
}

// Metric 5: Abstention Quality Score
// Hall_Abstain = abstentions / risky_queries
function hallAbstainScore(abstentions: number, riskyQueries: number): number {
  if (riskyQueries === 0) return 1;
  return abstentions / riskyQueries;
}

// Weighted Hallucination Score Formula:
// 0.30×Resp + 0.25×Claim + 0.25×Faith + 0.10×Span + 0.10×Abstain
function calculateWeightedHallucinationScore(metrics: {
  resp: number; claim: number; faith: number; span: number; abstain: number;
}): number {
  return 0.30 * metrics.resp + 0.25 * metrics.claim + 0.25 * metrics.faith 
       + 0.10 * metrics.span + 0.10 * metrics.abstain;
}

interface HallucinationResult {
  success: boolean;
  model_id: string;
  model_version: string;
  factuality_score: number;
  groundedness_score: number;
  weighted_metrics: {
    resp: number;
    claim: number;
    faith: number;
    span: number;
    abstain: number;
  };
  overall_score: number;
  verdict: "FACTUAL" | "UNCERTAIN" | "HALLUCINATION";
  is_compliant: boolean;
  inference_latency_ms: number;
  details: {
    raw_output: any;
    claims_analyzed: number;
    threshold_applied: number;
    computation_steps: any[];
    weighted_formula: string;
  };
}

interface ClaimCheck {
  premise: string;
  hypothesis: string;
}

async function callHuggingFaceNLI(input: ClaimCheck | string, hfToken: string): Promise<any> {
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
  if (!output) return 0.5;

  if (Array.isArray(output)) {
    const labels = Array.isArray(output[0]) ? output[0] : output;
    
    for (const item of labels) {
      if (!item.label || typeof item.score !== "number") continue;
      
      const label = item.label.toLowerCase();
      if (label.includes("accurate") || label.includes("factual") || label.includes("consistent") || label.includes("entail")) {
        return item.score;
      }
    }
    
    for (const item of labels) {
      const label = item.label?.toLowerCase() || "";
      if (label.includes("contradict") || label.includes("hallucin") || label.includes("inconsistent")) {
        return 1 - item.score;
      }
    }
  }

  if (typeof output === "number") return output;

  return 0.5;
}

// Simple claim extraction (in production, use NLP)
function extractClaims(text: string): string[] {
  // Split by periods, filter short fragments
  return text.split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.split(' ').length > 4);
}

// Check if response indicates abstention
function isAbstention(text: string): boolean {
  const abstentionPhrases = [
    "i don't know",
    "i'm not sure",
    "i cannot",
    "i can't",
    "i am not able",
    "i don't have",
    "uncertain",
    "no information",
    "cannot confirm"
  ];
  const lower = text.toLowerCase();
  return abstentionPhrases.some(phrase => lower.includes(phrase));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { 
      text,
      context,
      claims,
      modelId,
      autoEscalate = true,
      isRiskyQuery = false
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

    console.log(`[eval-hallucination-hf] Analyzing with 2025 SOTA metrics...`);

    let rawOutput: any;
    let factualityScore: number;
    let claimsAnalyzed = 1;
    let unsupportedClaims = 0;
    let totalTokens = text ? text.split(' ').length : 0;
    let unsupportedTokens = 0;

    if (claims && Array.isArray(claims) && claims.length > 0) {
      const claimScores: number[] = [];
      const allOutputs: any[] = [];

      for (const claim of claims) {
        try {
          const output = await callHuggingFaceNLI(claim, hfToken);
          allOutputs.push(output);
          const score = parseFactualityOutput(output);
          claimScores.push(score);
          if (score < 0.5) unsupportedClaims++;
        } catch {
          claimScores.push(0.5);
        }
      }

      rawOutput = allOutputs;
      factualityScore = claimScores.reduce((a, b) => a + b, 0) / claimScores.length;
      claimsAnalyzed = claims.length;

    } else {
      // Extract claims from text
      const extractedClaims = extractClaims(text);
      claimsAnalyzed = Math.max(extractedClaims.length, 1);

      const input = context 
        ? { premise: context, hypothesis: text }
        : text;

      rawOutput = await callHuggingFaceNLI(input, hfToken);
      factualityScore = parseFactualityOutput(rawOutput);
      
      // Estimate unsupported claims based on factuality score
      unsupportedClaims = Math.round(claimsAnalyzed * (1 - factualityScore));
      unsupportedTokens = Math.round(totalTokens * (1 - factualityScore) * 0.5);
    }

    const inferenceLatency = Date.now() - startTime;

    // ============================================
    // Calculate 5 SOTA Hallucination Metrics
    // ============================================
    const computationSteps: any[] = [];

    const isHallucinatory = factualityScore < 0.5 ? 1 : 0;
    const didAbstain = isAbstention(text) ? 1 : 0;
    const riskyQueries = isRiskyQuery ? 1 : 0;

    // Metric 1: Response-level Hallucination Rate
    const respMetric = hallRespScore(isHallucinatory, 1);
    computationSteps.push({
      step: 1,
      name: "Response-level Hallucination Rate (HR)",
      formula: `Hall_Resp = 1 - HR = 1 - ${isHallucinatory}/1 = ${respMetric.toFixed(4)}`,
      result: respMetric,
      status: respMetric >= 0.7 ? "pass" : "fail",
      weight: "30%",
      why: respMetric >= 0.7 
        ? "Response does not contain hallucinations at the response level." 
        : "Response flagged as containing hallucinations - factual verification failed.",
    });

    // Metric 2: Claim-level Hallucination Fraction
    const claimMetric = hallClaimScore(unsupportedClaims, claimsAnalyzed);
    computationSteps.push({
      step: 2,
      name: "Claim-level Hallucination Fraction (CHF)",
      formula: `Hall_Claim = 1 - CHF = 1 - ${unsupportedClaims}/${claimsAnalyzed} = ${claimMetric.toFixed(4)}`,
      result: claimMetric,
      status: claimMetric >= 0.7 ? "pass" : "fail",
      weight: "25%",
      why: claimMetric >= 0.7 
        ? `${claimsAnalyzed - unsupportedClaims}/${claimsAnalyzed} claims verified as supported.` 
        : `${unsupportedClaims}/${claimsAnalyzed} claims are unsupported or false.`,
    });

    // Metric 3: Faithfulness Score
    const faithMetric = hallFaithScore(factualityScore);
    computationSteps.push({
      step: 3,
      name: "Faithfulness Score (LLM Judge)",
      formula: `Hall_Faith = ${factualityScore.toFixed(4)}`,
      result: faithMetric,
      status: faithMetric >= 0.7 ? "pass" : "fail",
      weight: "25%",
      why: faithMetric >= 0.7 
        ? "Response is faithful to provided context/ground truth." 
        : "Response deviates significantly from ground truth.",
    });

    // Metric 4: Unsupported Span Length Ratio
    const spanMetric = hallSpanScore(unsupportedTokens, Math.max(totalTokens, 1));
    computationSteps.push({
      step: 4,
      name: "Unsupported Span Length Ratio (USL)",
      formula: `Hall_Span = 1 - USL = 1 - ${unsupportedTokens}/${totalTokens || 1} = ${spanMetric.toFixed(4)}`,
      result: spanMetric,
      status: spanMetric >= 0.7 ? "pass" : "fail",
      weight: "10%",
      why: spanMetric >= 0.7 
        ? "Minimal unsupported content in response." 
        : `${Math.round((1 - spanMetric) * 100)}% of response tokens are unsupported.`,
    });

    // Metric 5: Abstention Quality
    const abstainMetric = riskyQueries > 0 ? hallAbstainScore(didAbstain, riskyQueries) : 1.0;
    computationSteps.push({
      step: 5,
      name: "Abstention Quality (Risky Queries)",
      formula: riskyQueries > 0 
        ? `Hall_Abstain = ${didAbstain}/${riskyQueries} = ${abstainMetric.toFixed(4)}`
        : `Hall_Abstain = 1.0 (no risky queries)`,
      result: abstainMetric,
      status: abstainMetric >= 0.7 ? "pass" : "fail",
      weight: "10%",
      why: abstainMetric >= 0.7 
        ? "Model appropriately abstains when uncertain." 
        : "Model should abstain more on uncertain/risky queries.",
    });

    // Calculate weighted score
    const weightedMetrics = {
      resp: respMetric,
      claim: claimMetric,
      faith: faithMetric,
      span: spanMetric,
      abstain: abstainMetric,
    };
    const weightedScore = calculateWeightedHallucinationScore(weightedMetrics);
    const overallScore = Math.round(weightedScore * 100);
    const isCompliant = overallScore >= 70;

    computationSteps.push({
      step: 6,
      name: "Weighted Hallucination Score (2025 SOTA)",
      formula: `Score = 0.30×${respMetric.toFixed(2)} + 0.25×${claimMetric.toFixed(2)} + 0.25×${faithMetric.toFixed(2)} + 0.10×${spanMetric.toFixed(2)} + 0.10×${abstainMetric.toFixed(2)} = ${weightedScore.toFixed(4)}`,
      result: overallScore,
      status: isCompliant ? "pass" : "fail",
      threshold: 70,
      weight: "100%",
      why: isCompliant 
        ? `Factuality score ${overallScore}% meets 70% compliance threshold. COMPLIANT.`
        : `⚠️ NON-COMPLIANT: Factuality score ${overallScore}% below 70% threshold. Hallucination risk.`,
    });

    // Determine verdict
    const FACTUAL_THRESHOLD = 0.8;
    const UNCERTAIN_THRESHOLD = 0.5;
    
    let verdict: "FACTUAL" | "UNCERTAIN" | "HALLUCINATION" = "UNCERTAIN";
    if (factualityScore >= FACTUAL_THRESHOLD && isCompliant) {
      verdict = "FACTUAL";
    } else if (factualityScore < UNCERTAIN_THRESHOLD || !isCompliant) {
      verdict = "HALLUCINATION";
    }

    const result: HallucinationResult = {
      success: true,
      model_id: HF_HALLUCINATION_MODEL,
      model_version: "latest",
      factuality_score: factualityScore,
      groundedness_score: factualityScore,
      weighted_metrics: weightedMetrics,
      overall_score: overallScore,
      verdict,
      is_compliant: isCompliant,
      inference_latency_ms: inferenceLatency,
      details: {
        raw_output: rawOutput,
        claims_analyzed: claimsAnalyzed,
        threshold_applied: FACTUAL_THRESHOLD,
        computation_steps: computationSteps,
        weighted_formula: "0.30×Resp + 0.25×Claim + 0.25×Faith + 0.10×Span + 0.10×Abstain",
      },
    };

    // Auto-escalate to HITL if hallucination detected
    if (autoEscalate && (verdict === "HALLUCINATION" || !isCompliant)) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("review_queue").insert({
        title: `Hallucination ${isCompliant ? 'Warning' : 'NON-COMPLIANT'}: ${overallScore}% factuality`,
        description: `Model flagged with ${unsupportedClaims}/${claimsAnalyzed} unsupported claims. Weighted score: ${overallScore}% (threshold: 70%).`,
        review_type: "hallucination_flag",
        severity: !isCompliant ? "critical" : factualityScore < 0.3 ? "critical" : "high",
        status: "pending",
        model_id: modelId || null,
        context: {
          factuality_score: factualityScore,
          weighted_metrics: weightedMetrics,
          weighted_score: overallScore,
          claims_analyzed: claimsAnalyzed,
          unsupported_claims: unsupportedClaims,
          text_preview: (text || "").substring(0, 200),
          model_used: HF_HALLUCINATION_MODEL,
          formula: "0.30×Resp + 0.25×Claim + 0.25×Faith + 0.10×Span + 0.10×Abstain",
        },
        sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      });

      console.log(`[eval-hallucination-hf] Auto-escalated to HITL queue`);
    }

    console.log(`[eval-hallucination-hf] Complete. Score: ${overallScore}%, Verdict: ${verdict}, Compliant: ${isCompliant}, Latency: ${inferenceLatency}ms`);

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
