import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, metric_name, query, consumer_type = "api" } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Action: search (semantic/text search)
    if (action === "search" && query) {
      // Text-based fallback search (vector search would need embedding generation first)
      const { data, error } = await supabase
        .from("semantic_definitions")
        .select("id, name, display_name, description, sql_logic, grain, synonyms, ai_context, status")
        .eq("status", "active")
        .or(`name.ilike.%${query}%,display_name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Also check synonyms (can't do array ilike in PostgREST easily)
      const { data: allActive } = await supabase
        .from("semantic_definitions")
        .select("id, name, display_name, description, sql_logic, grain, synonyms, ai_context, status")
        .eq("status", "active");

      const synonymMatches = (allActive || []).filter((d: any) =>
        d.synonyms?.some((s: string) => s.toLowerCase().includes(query.toLowerCase()))
      );

      // Merge and deduplicate
      const merged = [...(data || []), ...synonymMatches];
      const uniqueIds = new Set<string>();
      const results = merged.filter((d: any) => {
        if (uniqueIds.has(d.id)) return false;
        uniqueIds.add(d.id);
        return true;
      }).map((d: any) => ({ ...d, similarity: 0.8 }));

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: query metric by name (SQL Gatekeeper)
    if (metric_name) {
      const startTime = Date.now();

      // Look up by name or synonym
      const { data: defs } = await supabase
        .from("semantic_definitions")
        .select("*")
        .eq("status", "active");

      const definition = (defs || []).find((d: any) =>
        d.name === metric_name ||
        d.synonyms?.includes(metric_name)
      );

      if (!definition) {
        return new Response(JSON.stringify({ error: `Metric '${metric_name}' not found` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const latencyMs = Date.now() - startTime;

      // Log the query
      await supabase.from("semantic_query_log").insert({
        definition_id: definition.id,
        metric_name: definition.name,
        consumer_type,
        query_latency_ms: latencyMs,
        status: "success",
      });

      // Update query stats on definition
      await supabase
        .from("semantic_definitions")
        .update({
          query_count: (definition.query_count || 0) + 1,
          last_queried_at: new Date().toISOString(),
        })
        .eq("id", definition.id);

      return new Response(JSON.stringify({
        metric: {
          name: definition.name,
          display_name: definition.display_name,
          description: definition.description,
          grain: definition.grain,
          sql_logic: definition.sql_logic,
          ai_context: definition.ai_context,
          version: definition.version,
          definition_hash: definition.definition_hash,
        },
        latency_ms: latencyMs,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Provide 'metric_name' or 'action: search' with 'query'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("semantic-query error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
