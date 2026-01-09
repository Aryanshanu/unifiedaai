import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ExplainDecisionRequest {
  decisionId: string;
  explanationType?: "shap" | "counterfactual" | "natural_language" | "feature_importance";
  featureData?: Record<string, unknown>;
  generateNaturalLanguage?: boolean;
}

interface FeatureInfluence {
  feature: string;
  value: unknown;
  contribution: number;
  direction: "positive" | "negative" | "neutral";
}

/**
 * Simulates SHAP-like feature importance calculation
 * In production, this would call a real ML explainability service
 */
function computeFeatureImportance(featureData: Record<string, unknown>): FeatureInfluence[] {
  const influences: FeatureInfluence[] = [];
  const features = Object.entries(featureData);
  
  // Simulate importance scores (in production, use actual SHAP values)
  const totalFeatures = features.length;
  let remainingWeight = 1.0;
  
  features.forEach(([feature, value], index) => {
    const isLast = index === totalFeatures - 1;
    const contribution = isLast ? remainingWeight : Math.random() * remainingWeight * 0.5;
    remainingWeight -= contribution;
    
    influences.push({
      feature,
      value,
      contribution: Number(contribution.toFixed(4)),
      direction: contribution > 0.1 ? "positive" : contribution < -0.1 ? "negative" : "neutral",
    });
  });
  
  // Sort by absolute contribution
  return influences.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

/**
 * Generates counterfactual explanation
 * Shows what would need to change to get a different outcome
 */
function generateCounterfactual(
  featureData: Record<string, unknown>,
  decisionValue: string
): Record<string, unknown> {
  const counterfactual: Record<string, unknown> = {};
  
  Object.entries(featureData).forEach(([key, value]) => {
    if (typeof value === "number") {
      // Suggest a different numeric value
      counterfactual[key] = {
        original: value,
        suggested: value * (1 + (Math.random() * 0.4 - 0.2)),
        changeRequired: Math.abs(Math.random() * 0.3).toFixed(2),
      };
    } else if (typeof value === "boolean") {
      counterfactual[key] = {
        original: value,
        suggested: !value,
        changeRequired: "flip",
      };
    } else if (typeof value === "string") {
      counterfactual[key] = {
        original: value,
        suggested: `[Alternative ${key}]`,
        changeRequired: "different_category",
      };
    }
  });
  
  return {
    originalDecision: decisionValue,
    alternativeDecision: `NOT_${decisionValue}`,
    requiredChanges: counterfactual,
    minimumChanges: Math.ceil(Object.keys(featureData).length * 0.3),
  };
}

/**
 * Generates natural language explanation using Lovable AI
 */
async function generateNaturalLanguageExplanation(
  decisionValue: string,
  featureInfluences: FeatureInfluence[],
  modelName: string
): Promise<string> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  if (!lovableApiKey) {
    // Fallback to template-based explanation
    const topFeatures = featureInfluences.slice(0, 3);
    const featureList = topFeatures
      .map(f => `${f.feature} (${(f.contribution * 100).toFixed(1)}% influence)`)
      .join(", ");
    
    return `The model "${modelName}" made the decision "${decisionValue}" primarily based on: ${featureList}. ` +
      `The most influential factor was "${topFeatures[0]?.feature}" which contributed ${(topFeatures[0]?.contribution * 100).toFixed(1)}% to the outcome.`;
  }
  
  try {
    const prompt = `Generate a clear, human-readable explanation for the following AI decision:

Decision: ${decisionValue}
Model: ${modelName}

Key factors (in order of importance):
${featureInfluences.slice(0, 5).map((f, i) => `${i + 1}. ${f.feature}: ${JSON.stringify(f.value)} (${(f.contribution * 100).toFixed(1)}% influence, ${f.direction})`).join("\n")}

Write a 2-3 sentence explanation that a non-technical person could understand. Focus on:
1. What decision was made
2. The most important factors
3. Why these factors led to this decision

Do not use technical jargon. Be clear and concise.`;

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an AI explainability assistant that helps humans understand AI decisions." },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || "Unable to generate explanation.";
    
  } catch (err) {
    console.error("Natural language generation error:", err);
    // Fallback
    const topFeature = featureInfluences[0];
    return `The decision "${decisionValue}" was primarily influenced by ${topFeature?.feature} (${(topFeature?.contribution * 100).toFixed(1)}% contribution).`;
  }
}

serve(async (req) => {
  console.log("=== EXPLAIN-DECISION CALLED ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ExplainDecisionRequest = await req.json();
    const {
      decisionId,
      explanationType = "feature_importance",
      featureData,
      generateNaturalLanguage = true,
    } = body;

    if (!decisionId) {
      return new Response(
        JSON.stringify({ error: "decisionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch decision from ledger
    const { data: decision, error: decisionError } = await supabase
      .from("decision_ledger")
      .select(`
        *,
        models:model_id (id, name, model_type)
      `)
      .eq("id", decisionId)
      .single();

    if (decisionError || !decision) {
      return new Response(
        JSON.stringify({ error: "Decision not found", decisionId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use provided feature data or extract from context
    const features: Record<string, unknown> = featureData || 
      (decision.context as Record<string, unknown>)?.features as Record<string, unknown> || 
      { placeholder: "no_features_provided" };
    
    // Generate explanation based on type
    let featureInfluences: FeatureInfluence[] = [];
    let counterfactual: Record<string, unknown> | null = null;
    let naturalLanguage: string | null = null;
    
    if (Object.keys(features).length > 0) {
      featureInfluences = computeFeatureImportance(features);
      
      if (explanationType === "counterfactual") {
        counterfactual = generateCounterfactual(features, decision.decision_value);
      }
      
      if (generateNaturalLanguage) {
        const modelName = (decision.models as any)?.name || "AI Model";
        naturalLanguage = await generateNaturalLanguageExplanation(
          decision.decision_value,
          featureInfluences,
          modelName
        );
      }
    }

    // Store explanation in database
    const { data: explanation, error: insertError } = await supabase
      .from("decision_explanations")
      .insert({
        decision_id: decisionId,
        explanation_type: explanationType,
        feature_influences: featureInfluences,
        counterfactual: counterfactual,
        natural_language: naturalLanguage,
        generation_method: "fractal_explainer_v1",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to store explanation:", insertError);
      // Continue anyway - return explanation even if storage fails
    }

    const latencyMs = Date.now() - startTime;
    console.log(`Explanation generated for decision ${decisionId} in ${latencyMs}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        decisionId,
        decisionRef: decision.decision_ref,
        decisionValue: decision.decision_value,
        explanationId: explanation?.id,
        explanationType,
        featureInfluences,
        counterfactual,
        naturalLanguage,
        modelInfo: {
          id: (decision.models as any)?.id,
          name: (decision.models as any)?.name,
          version: decision.model_version,
        },
        latencyMs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("explain-decision error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
