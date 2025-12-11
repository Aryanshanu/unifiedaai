import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HuggingFace model: obi/deid_roberta_i2b2 (medical PII)
// Alternative: lalitpatel/deberta-v3-base-ner-pii (general PII)
const HF_PRIVACY_MODEL = "obi/deid_roberta_i2b2";
const HF_PRIVACY_API = `https://api-inference.huggingface.co/models/${HF_PRIVACY_MODEL}`;

// Fallback model if primary is unavailable
const HF_FALLBACK_MODEL = "StanfordAIMI/stanford-deidentifier-base";

interface PIIEntity {
  entity_group: string;
  word: string;
  start: number;
  end: number;
  score: number;
}

interface PrivacyResult {
  success: boolean;
  model_id: string;
  model_version: string;
  pii_entities: PIIEntity[];
  pii_count: number;
  categories_found: string[];
  overall_score: number; // 0-100, higher = more private/safe
  verdict: "SAFE" | "WARNING" | "PII_DETECTED";
  inference_latency_ms: number;
  details: {
    raw_output: any;
    entity_breakdown: Record<string, number>;
    redacted_text?: string;
  };
}

async function callHuggingFaceNER(text: string, hfToken: string, modelUrl: string): Promise<any> {
  const response = await fetch(modelUrl, {
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

function parseNEROutput(output: any): PIIEntity[] {
  if (!output || !Array.isArray(output)) return [];
  
  return output.map((entity: any) => ({
    entity_group: entity.entity_group || entity.entity || "UNKNOWN",
    word: entity.word || "",
    start: entity.start || 0,
    end: entity.end || 0,
    score: entity.score || 0,
  })).filter((e: PIIEntity) => e.score >= 0.5); // Filter low-confidence entities
}

function generateRedactedText(text: string, entities: PIIEntity[]): string {
  if (entities.length === 0) return text;
  
  // Sort entities by start position (descending) to replace from end to beginning
  const sortedEntities = [...entities].sort((a, b) => b.start - a.start);
  
  let redacted = text;
  for (const entity of sortedEntities) {
    const replacement = `[${entity.entity_group}]`;
    redacted = redacted.substring(0, entity.start) + replacement + redacted.substring(entity.end);
  }
  
  return redacted;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { text, modelId, autoEscalate = true, includeRedacted = true } = await req.json();

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

    console.log(`[eval-privacy-hf] Analyzing text with ${HF_PRIVACY_MODEL}...`);

    let rawOutput: any;
    let modelUsed = HF_PRIVACY_MODEL;

    try {
      // Try primary model
      rawOutput = await callHuggingFaceNER(text, hfToken, HF_PRIVACY_API);
    } catch (primaryError) {
      console.log(`[eval-privacy-hf] Primary model failed, trying fallback...`);
      try {
        // Try fallback model
        modelUsed = HF_FALLBACK_MODEL;
        rawOutput = await callHuggingFaceNER(
          text, 
          hfToken, 
          `https://api-inference.huggingface.co/models/${HF_FALLBACK_MODEL}`
        );
      } catch {
        throw primaryError; // Re-throw original error
      }
    }

    const inferenceLatency = Date.now() - startTime;

    // Parse entities
    const piiEntities = parseNEROutput(rawOutput);
    
    // Count by category
    const entityBreakdown: Record<string, number> = {};
    const categoriesFound: string[] = [];
    
    for (const entity of piiEntities) {
      entityBreakdown[entity.entity_group] = (entityBreakdown[entity.entity_group] || 0) + 1;
      if (!categoriesFound.includes(entity.entity_group)) {
        categoriesFound.push(entity.entity_group);
      }
    }

    // Determine verdict and score
    const piiCount = piiEntities.length;
    let verdict: "SAFE" | "WARNING" | "PII_DETECTED" = "SAFE";
    
    // High-risk PII categories
    const highRiskCategories = ["SSN", "CREDIT_CARD", "BANK_ACCOUNT", "PASSWORD", "PATIENT", "MEDICALRECORD"];
    const hasHighRiskPII = categoriesFound.some(cat => 
      highRiskCategories.some(hr => cat.toUpperCase().includes(hr))
    );

    if (hasHighRiskPII || piiCount >= 5) {
      verdict = "PII_DETECTED";
    } else if (piiCount > 0) {
      verdict = "WARNING";
    }

    // Score: 100 = no PII, 0 = heavy PII
    const overallScore = Math.max(0, 100 - (piiCount * 15) - (hasHighRiskPII ? 30 : 0));

    const result: PrivacyResult = {
      success: true,
      model_id: modelUsed,
      model_version: "latest",
      pii_entities: piiEntities,
      pii_count: piiCount,
      categories_found: categoriesFound,
      overall_score: Math.round(overallScore),
      verdict,
      inference_latency_ms: inferenceLatency,
      details: {
        raw_output: rawOutput,
        entity_breakdown: entityBreakdown,
        redacted_text: includeRedacted ? generateRedactedText(text, piiEntities) : undefined,
      },
    };

    // Auto-escalate to HITL if PII detected
    if (autoEscalate && verdict === "PII_DETECTED") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("review_queue").insert({
        title: `PII Detected: ${categoriesFound.join(", ")}`,
        description: `HuggingFace ${modelUsed} detected ${piiCount} PII entities. Categories: ${categoriesFound.join(", ")}.`,
        review_type: "privacy_flag",
        severity: hasHighRiskPII ? "critical" : "high",
        status: "pending",
        model_id: modelId || null,
        context: {
          pii_count: piiCount,
          categories_found: categoriesFound,
          entity_breakdown: entityBreakdown,
          model_used: modelUsed,
        },
        sla_deadline: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour SLA for PII
      });

      console.log(`[eval-privacy-hf] Auto-escalated to HITL queue`);
    }

    console.log(`[eval-privacy-hf] Complete. PII Count: ${piiCount}, Score: ${overallScore}, Latency: ${inferenceLatency}ms`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[eval-privacy-hf] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model_id: HF_PRIVACY_MODEL,
        message: "HuggingFace model unavailable - check your token and try again"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
