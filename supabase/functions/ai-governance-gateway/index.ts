import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function envelope(success: boolean, data: unknown, meta?: Record<string, unknown>) {
  return {
    success,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      ...meta,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/ai-governance-gateway/, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // --- BIAS REPORT ---
    if (path === "/bias-report" && req.method === "POST") {
      const body = await req.json();
      const { model_id, dataset_id, sensitive_attributes } = body;
      if (!model_id) return jsonResponse(envelope(false, { error: "model_id required" }), 400);

      // Query latest fairness evaluation for this model
      const { data: evals, error } = await supabase
        .from("evaluation_runs")
        .select("*")
        .eq("model_id", model_id)
        .eq("engine_type", "fairness")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) return jsonResponse(envelope(false, { error: error.message }), 500);
      return jsonResponse(envelope(true, { biasReports: evals || [], modelId: model_id }));
    }

    // --- AUDIT LOG (POST = write, GET = read) ---
    if (path === "/audit-log") {
      if (req.method === "POST") {
        const body = await req.json();
        const { model_id, decision_ref, decision_value, input_hash, output_hash, context, model_version, confidence } = body;
        if (!model_id || !decision_value) return jsonResponse(envelope(false, { error: "model_id and decision_value required" }), 400);

        const { data, error } = await supabase
          .from("decision_ledger")
          .insert({
            model_id,
            decision_ref: decision_ref || `DEC-${Date.now()}`,
            decision_value,
            input_hash: input_hash || "",
            output_hash: output_hash || "",
            context: context || {},
            model_version: model_version || "1.0",
            confidence: confidence || 0,
          })
          .select()
          .single();

        if (error) return jsonResponse(envelope(false, { error: error.message }), 500);
        return jsonResponse(envelope(true, data, { hash: data?.record_hash }));
      }

      // GET audit log
      const modelId = url.searchParams.get("model_id");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      let query = supabase.from("decision_ledger").select("*").order("created_at", { ascending: false }).limit(limit);
      if (modelId) query = query.eq("model_id", modelId);
      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to);

      const { data, error } = await query;
      if (error) return jsonResponse(envelope(false, { error: error.message }), 500);
      return jsonResponse(envelope(true, data));
    }

    // --- MODEL METADATA ---
    if (path.startsWith("/model-metadata/")) {
      const modelName = decodeURIComponent(path.replace("/model-metadata/", ""));
      const { data, error } = await supabase
        .from("models")
        .select("*, systems(*)")
        .ilike("name", `%${modelName}%`)
        .limit(1)
        .single();

      if (error) return jsonResponse(envelope(false, { error: "Model not found" }), 404);

      // Get latest evaluations
      const { data: evals } = await supabase
        .from("evaluation_runs")
        .select("engine_type, overall_score, status, created_at")
        .eq("model_id", data.id)
        .order("created_at", { ascending: false })
        .limit(10);

      return jsonResponse(envelope(true, { model: data, evaluations: evals || [] }));
    }

    // --- EXPLAIN (AI-powered) ---
    if (path === "/explain" && req.method === "POST") {
      const body = await req.json();
      const { decision_id, feature_data } = body;
      if (!decision_id) return jsonResponse(envelope(false, { error: "decision_id required" }), 400);

      // Fetch decision
      const { data: decision, error: decErr } = await supabase
        .from("decision_ledger")
        .select("*, models:model_id(id, name)")
        .eq("id", decision_id)
        .single();

      if (decErr || !decision) return jsonResponse(envelope(false, { error: "Decision not found" }), 404);

      const features = feature_data || (decision.context as Record<string, unknown>)?.features || {};
      const modelName = (decision.models as any)?.name || "AI Model";

      // Use Lovable AI Gateway for real explanation
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      let naturalLanguage = "";
      let featureInfluences: unknown[] = [];

      if (lovableKey && Object.keys(features).length > 0) {
        const prompt = `Analyze this AI decision and provide feature importance:
Decision: ${decision.decision_value}
Model: ${modelName}
Features: ${JSON.stringify(features)}

Return a JSON object with:
1. "feature_influences": array of {feature, value, contribution (0-1 normalized), direction ("positive"|"negative"|"neutral")}
2. "explanation": 2-3 sentence plain-language explanation

Base the contributions on logical reasoning about which features would most influence this type of decision. Contributions must sum to 1.0.`;

        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are an AI explainability engine. Return valid JSON only." },
                { role: "user", content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 800,
            }),
          });

          if (aiResp.ok) {
            const result = await aiResp.json();
            const content = result.choices?.[0]?.message?.content || "";
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              featureInfluences = parsed.feature_influences || [];
              naturalLanguage = parsed.explanation || "";
            }
          }
        } catch (e) {
          console.error("AI explanation error:", e);
        }
      }

      // Fallback if AI didn't work
      if (!naturalLanguage) {
        naturalLanguage = `The model "${modelName}" made the decision "${decision.decision_value}". Feature analysis was not available.`;
      }

      // Store explanation
      const { data: explanation } = await supabase
        .from("decision_explanations")
        .insert({
          decision_id,
          explanation_type: "feature_importance",
          feature_influences: featureInfluences,
          natural_language: naturalLanguage,
          generation_method: "lovable_ai_gateway_v1",
        })
        .select()
        .single();

      return jsonResponse(envelope(true, {
        decisionId: decision_id,
        featureInfluences,
        naturalLanguage,
        explanationId: explanation?.id,
      }));
    }

    // --- OVERRIDE REQUEST ---
    if (path === "/override-request" && req.method === "POST") {
      const body = await req.json();
      const { decision_id, reason, requested_by, priority } = body;
      if (!decision_id || !reason) return jsonResponse(envelope(false, { error: "decision_id and reason required" }), 400);

      const { data, error } = await supabase
        .from("review_queue")
        .insert({
          review_type: "override_request",
          entity_type: "decision",
          entity_id: decision_id,
          severity: priority || "medium",
          context: { reason, requested_by: requested_by || "api_caller" },
          status: "pending",
        })
        .select()
        .single();

      if (error) return jsonResponse(envelope(false, { error: error.message }), 500);
      return jsonResponse(envelope(true, data), 201);
    }

    // --- INCIDENTS ---
    if (path.startsWith("/incidents")) {
      if (req.method === "POST" && path === "/incidents/check") {
        const body = await req.json();
        const { model_id } = body;

        // Check for open incidents
        let query = supabase.from("incidents").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20);
        if (model_id) query = query.eq("model_id", model_id);

        const { data, error } = await query;
        if (error) return jsonResponse(envelope(false, { error: error.message }), 500);
        return jsonResponse(envelope(true, { incidents: data || [], count: data?.length || 0 }));
      }

      // GET incidents with filters
      const severity = url.searchParams.get("severity");
      const status = url.searchParams.get("status");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      let query = supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(limit);
      if (severity) query = query.eq("severity", severity);
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return jsonResponse(envelope(false, { error: error.message }), 500);
      return jsonResponse(envelope(true, data));
    }

    return jsonResponse(envelope(false, {
      error: "Unknown route",
      availableRoutes: [
        "POST /bias-report",
        "POST /audit-log",
        "GET /audit-log",
        "GET /model-metadata/{modelName}",
        "POST /explain",
        "POST /override-request",
        "POST /incidents/check",
        "GET /incidents",
      ],
    }), 404);
  } catch (err) {
    console.error("ai-governance-gateway error:", err);
    return jsonResponse(envelope(false, { error: err instanceof Error ? err.message : "Internal error" }), 500);
  }
});
