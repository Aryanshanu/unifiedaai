import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all active definitions
    const { data: definitions, error: fetchErr } = await supabase
      .from("semantic_definitions")
      .select("*")
      .eq("status", "active");

    if (fetchErr) throw fetchErr;
    if (!definitions || definitions.length === 0) {
      return new Response(JSON.stringify({ alerts_created: 0, message: "No active definitions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const alerts: any[] = [];

    // 1. Synonym Conflicts: two definitions sharing the same synonym
    const synonymMap = new Map<string, string[]>();
    for (const def of definitions) {
      for (const syn of def.synonyms || []) {
        const key = syn.toLowerCase();
        if (!synonymMap.has(key)) synonymMap.set(key, []);
        synonymMap.get(key)!.push(def.name);
      }
    }
    for (const [synonym, names] of synonymMap) {
      if (names.length > 1) {
        for (const def of definitions.filter(d => d.synonyms?.map((s: string) => s.toLowerCase()).includes(synonym))) {
          alerts.push({
            definition_id: def.id,
            drift_type: "synonym_conflict",
            severity: "high",
            details: { message: `Synonym "${synonym}" is shared by: ${names.join(", ")}`, conflicting_definitions: names },
            status: "open",
          });
        }
      }
    }

    // 2. Stale Definitions: active definitions not queried in 30+ days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    for (const def of definitions) {
      if (!def.last_queried_at || def.last_queried_at < thirtyDaysAgo) {
        if (def.query_count === 0 && def.status === "active") {
          // Only alert if definition has been active for at least 7 days
          const createdAt = new Date(def.created_at);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (createdAt < sevenDaysAgo) {
            alerts.push({
              definition_id: def.id,
              drift_type: "stale_definition",
              severity: "low",
              details: { message: `Definition "${def.name}" is active but has never been queried`, last_queried_at: def.last_queried_at },
              status: "open",
            });
          }
        }
      }
    }

    // 3. Missing SQL logic
    for (const def of definitions) {
      if (!def.sql_logic || def.sql_logic.trim().length < 10) {
        alerts.push({
          definition_id: def.id,
          drift_type: "schema_mismatch",
          severity: "medium",
          details: { message: `Definition "${def.name}" is active but has no SQL logic defined` },
          status: "open",
        });
      }
    }

    // 4. Duplicate logic detection (simple SQL similarity)
    for (let i = 0; i < definitions.length; i++) {
      for (let j = i + 1; j < definitions.length; j++) {
        const a = definitions[i];
        const b = definitions[j];
        if (a.sql_logic && b.sql_logic) {
          const normalizedA = a.sql_logic.replace(/\s+/g, " ").trim().toLowerCase();
          const normalizedB = b.sql_logic.replace(/\s+/g, " ").trim().toLowerCase();
          if (normalizedA === normalizedB && a.name !== b.name) {
            alerts.push({
              definition_id: a.id,
              drift_type: "logic_deviation",
              severity: "high",
              details: { message: `"${a.name}" and "${b.name}" have identical SQL logic but different names`, duplicate_of: b.name },
              status: "open",
            });
          }
        }
      }
    }

    // Clear previous open alerts and insert new ones
    if (alerts.length > 0) {
      // Don't clear — just insert new alerts (dedup is handled by the UI)
      const { error: insertErr } = await supabase
        .from("semantic_drift_alerts")
        .insert(alerts);

      if (insertErr) {
        console.error("Failed to insert drift alerts:", insertErr);
        throw insertErr;
      }
    }

    return new Response(JSON.stringify({
      alerts_created: alerts.length,
      breakdown: {
        synonym_conflicts: alerts.filter(a => a.drift_type === "synonym_conflict").length,
        stale_definitions: alerts.filter(a => a.drift_type === "stale_definition").length,
        schema_mismatches: alerts.filter(a => a.drift_type === "schema_mismatch").length,
        logic_deviations: alerts.filter(a => a.drift_type === "logic_deviation").length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("semantic-drift-check error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
