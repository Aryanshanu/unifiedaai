import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HuggingFace model: ml6team/toxic-comment-classification
const HF_TOXICITY_MODEL = "ml6team/toxic-comment-classification";
const HF_TOXICITY_API = `https://api-inference.huggingface.co/models/${HF_TOXICITY_MODEL}`;

interface ToxicityResult {
  success: boolean;
  model_id: string;
  model_version: string;
  scores: {
    toxicity: number;
    identity_attack: number;
    insult: number;
    threat: number;
    obscene: number;
    severe_toxicity: number;
  };
  overall_score: number;
  verdict: "SAFE" | "WARNING" | "TOXIC";
  inference_latency_ms: number;
  details: {
    raw_output: any;
    threshold_applied: number;
    categories_flagged: string[];
  };
}

async function callHuggingFaceModel(text: string, hfToken: string): Promise<any> {
  const response = await fetch(HF_TOXICITY_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

function parseHFOutput(output: any): ToxicityResult["scores"] {
  // ml6team/toxic-comment-classification returns array of label scores
  // Format: [[{label: "toxic", score: 0.9}, {label: "severe_toxic", score: 0.1}, ...]]
  const defaultScores = {
    toxicity: 0,
    identity_attack: 0,
    insult: 0,
    threat: 0,
    obscene: 0,
    severe_toxicity: 0,
  };

  if (!output || !Array.isArray(output)) return defaultScores;

  const labels = Array.isArray(output[0]) ? output[0] : output;
  
  for (const item of labels) {
    if (!item.label || typeof item.score !== "number") continue;
    
    const label = item.label.toLowerCase();
    if (label.includes("toxic") && !label.includes("severe")) {
      defaultScores.toxicity = Math.max(defaultScores.toxicity, item.score);
    }
    if (label.includes("severe")) {
      defaultScores.severe_toxicity = item.score;
    }
    if (label.includes("identity") || label.includes("attack")) {
      defaultScores.identity_attack = item.score;
    }
    if (label.includes("insult")) {
      defaultScores.insult = item.score;
    }
    if (label.includes("threat")) {
      defaultScores.threat = item.score;
    }
    if (label.includes("obscene")) {
      defaultScores.obscene = item.score;
    }
  }

  return defaultScores;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { text, modelId, autoEscalate = true } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
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

    console.log(`[eval-toxicity-hf] Analyzing text with ${HF_TOXICITY_MODEL}...`);

    // Call HuggingFace API
    const rawOutput = await callHuggingFaceModel(text, hfToken);
    const inferenceLatency = Date.now() - startTime;

    // Parse scores
    const scores = parseHFOutput(rawOutput);

    // Calculate overall toxicity (max of all categories)
    const maxScore = Math.max(
      scores.toxicity,
      scores.severe_toxicity,
      scores.identity_attack,
      scores.insult,
      scores.threat,
      scores.obscene
    );

    // Determine verdict
    const THRESHOLD = 0.5;
    const WARNING_THRESHOLD = 0.3;
    let verdict: "SAFE" | "WARNING" | "TOXIC" = "SAFE";
    const categoriesFlagged: string[] = [];

    if (maxScore >= THRESHOLD) {
      verdict = "TOXIC";
    } else if (maxScore >= WARNING_THRESHOLD) {
      verdict = "WARNING";
    }

    // Track flagged categories
    if (scores.toxicity >= WARNING_THRESHOLD) categoriesFlagged.push("toxicity");
    if (scores.severe_toxicity >= WARNING_THRESHOLD) categoriesFlagged.push("severe_toxicity");
    if (scores.identity_attack >= WARNING_THRESHOLD) categoriesFlagged.push("identity_attack");
    if (scores.insult >= WARNING_THRESHOLD) categoriesFlagged.push("insult");
    if (scores.threat >= WARNING_THRESHOLD) categoriesFlagged.push("threat");
    if (scores.obscene >= WARNING_THRESHOLD) categoriesFlagged.push("obscene");

    // Convert to 0-100 scale for overall_score (inverted: 100 = safe, 0 = toxic)
    const overallScore = Math.round((1 - maxScore) * 100);

    const result: ToxicityResult = {
      success: true,
      model_id: HF_TOXICITY_MODEL,
      model_version: "latest",
      scores,
      overall_score: overallScore,
      verdict,
      inference_latency_ms: inferenceLatency,
      details: {
        raw_output: rawOutput,
        threshold_applied: THRESHOLD,
        categories_flagged: categoriesFlagged,
      },
    };

    // Auto-escalate to HITL if toxic
    if (autoEscalate && verdict === "TOXIC") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("review_queue").insert({
        title: `Toxicity Detected: ${categoriesFlagged.join(", ")}`,
        description: `HuggingFace ${HF_TOXICITY_MODEL} flagged content with ${Math.round(maxScore * 100)}% toxicity. Categories: ${categoriesFlagged.join(", ")}.`,
        review_type: "toxicity_flag",
        severity: maxScore >= 0.8 ? "critical" : "high",
        status: "pending",
        model_id: modelId || null,
        context: {
          toxicity_scores: scores,
          flagged_categories: categoriesFlagged,
          text_preview: text.substring(0, 200),
          model_used: HF_TOXICITY_MODEL,
        },
        sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      });

      console.log(`[eval-toxicity-hf] Auto-escalated to HITL queue`);
    }

    console.log(`[eval-toxicity-hf] Complete. Score: ${overallScore}, Verdict: ${verdict}, Latency: ${inferenceLatency}ms`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[eval-toxicity-hf] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model_id: HF_TOXICITY_MODEL,
        message: "HuggingFace model unavailable - check your token and try again"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
