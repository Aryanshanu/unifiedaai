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
    meta: { timestamp: new Date().toISOString(), version: "1.0.0", ...meta },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/semantic-layer-gateway/, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // --- GET /features/{entityId} ---
    if (path.startsWith("/features/") && req.method === "GET") {
      const entityId = decodeURIComponent(path.replace("/features/", ""));

      const { data, error } = await supabase
        .from("feature_values")
        .select("*, feature_registry!inner(name, display_name, data_type, grain, status)")
        .eq("entity_id", entityId)
        .order("computed_at", { ascending: false });

      if (error) return jsonResponse(envelope(false, { error: error.message }), 500);
      return jsonResponse(envelope(true, { entityId, features: data || [] }));
    }

    // --- GET /feature-list ---
    if (path === "/feature-list" && req.method === "GET") {
      const status = url.searchParams.get("status") || "active";
      const grain = url.searchParams.get("grain");

      let query = supabase.from("feature_registry").select("*").order("name");
      if (status !== "all") query = query.eq("status", status);
      if (grain) query = query.eq("grain", grain);

      const { data, error } = await query;
      if (error) return jsonResponse(envelope(false, { error: error.message }), 500);
      return jsonResponse(envelope(true, { features: data || [], count: data?.length || 0 }));
    }

    // --- POST /realtime-signal ---
    if (path === "/realtime-signal" && req.method === "POST") {
      const body = await req.json();
      const { feature_name, entity_id, value, source_hash } = body;
      if (!feature_name || !entity_id || value === undefined) {
        return jsonResponse(envelope(false, { error: "feature_name, entity_id, and value required" }), 400);
      }

      // Look up feature
      const { data: feature, error: fErr } = await supabase
        .from("feature_registry")
        .select("id, version")
        .eq("name", feature_name)
        .eq("status", "active")
        .single();

      if (fErr || !feature) return jsonResponse(envelope(false, { error: `Feature '${feature_name}' not found or inactive` }), 404);

      // Upsert value
      const { data, error } = await supabase
        .from("feature_values")
        .insert({
          feature_id: feature.id,
          entity_id,
          value: typeof value === "object" ? value : { value },
          version: feature.version,
          source_hash: source_hash || null,
        })
        .select()
        .single();

      if (error) return jsonResponse(envelope(false, { error: error.message }), 500);
      return jsonResponse(envelope(true, data), 201);
    }

    // --- GET /definition/{metricName} ---
    if (path.startsWith("/definition/") && req.method === "GET") {
      const metricName = decodeURIComponent(path.replace("/definition/", ""));

      const { data, error } = await supabase
        .from("semantic_definitions")
        .select("*")
        .ilike("metric_name", `%${metricName}%`)
        .limit(1)
        .single();

      if (error) return jsonResponse(envelope(false, { error: "Definition not found" }), 404);
      return jsonResponse(envelope(true, data, { hash: data.definition_hash }));
    }

    // --- POST /search ---
    if (path === "/search" && req.method === "POST") {
      const body = await req.json();
      const { query: searchQuery, limit: searchLimit = 10 } = body;
      if (!searchQuery) return jsonResponse(envelope(false, { error: "query required" }), 400);

      // Text search across semantic definitions and feature registry
      const [defResult, featResult] = await Promise.all([
        supabase
          .from("semantic_definitions")
          .select("id, metric_name, business_description, domain, status, definition_hash")
          .or(`metric_name.ilike.%${searchQuery}%,business_description.ilike.%${searchQuery}%`)
          .limit(searchLimit),
        supabase
          .from("feature_registry")
          .select("id, name, display_name, description, data_type, grain, status")
          .or(`name.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(searchLimit),
      ]);

      return jsonResponse(envelope(true, {
        definitions: defResult.data || [],
        features: featResult.data || [],
        totalResults: (defResult.data?.length || 0) + (featResult.data?.length || 0),
      }));
    }

    // --- GET /lineage/{featureId} ---
    if (path.startsWith("/lineage/") && req.method === "GET") {
      const featureId = decodeURIComponent(path.replace("/lineage/", ""));

      const { data: feature, error } = await supabase
        .from("feature_registry")
        .select("*")
        .eq("id", featureId)
        .single();

      if (error || !feature) return jsonResponse(envelope(false, { error: "Feature not found" }), 404);

      // Get value history
      const { data: history } = await supabase
        .from("feature_values")
        .select("entity_id, computed_at, version, source_hash")
        .eq("feature_id", featureId)
        .order("computed_at", { ascending: false })
        .limit(20);

      return jsonResponse(envelope(true, {
        feature,
        computationHistory: history || [],
        lineage: {
          source: feature.source_system,
          computation: feature.computation_sql,
          hash: feature.definition_hash,
        },
      }));
    }

    return jsonResponse(envelope(false, {
      error: "Unknown route",
      availableRoutes: [
        "GET /features/{entityId}",
        "GET /feature-list",
        "POST /realtime-signal",
        "GET /definition/{metricName}",
        "POST /search",
        "GET /lineage/{featureId}",
      ],
    }), 404);
  } catch (err) {
    console.error("semantic-layer-gateway error:", err);
    return jsonResponse(envelope(false, { error: err instanceof Error ? err.message : "Internal error" }), 500);
  }
});
