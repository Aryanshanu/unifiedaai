import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active schedules that are due
    const { data: schedules, error: schedErr } = await supabase
      .from("evaluation_schedules")
      .select("*")
      .eq("is_active", true);

    if (schedErr) throw schedErr;

    const results: { schedule_id: string; status: string; engines_run: string[] }[] = [];

    for (const schedule of schedules || []) {
      try {
        const enginesRun: string[] = [];

        for (const engineType of schedule.engine_types) {
          const funcName = engineType === "fairness" ? "eval-fairness" :
            `eval-${engineType}-hf`;

          const { error: evalErr } = await supabase.functions.invoke(funcName, {
            body: { modelId: schedule.model_id },
          });

          if (evalErr) {
            console.error(`Engine ${engineType} failed for schedule ${schedule.id}:`, evalErr);
          } else {
            enginesRun.push(engineType);
          }
        }

        // Update schedule metadata
        await supabase
          .from("evaluation_schedules")
          .update({
            last_run_at: new Date().toISOString(),
            run_count: (schedule.run_count || 0) + 1,
            failure_count: enginesRun.length < schedule.engine_types.length
              ? (schedule.failure_count || 0) + 1
              : schedule.failure_count,
          })
          .eq("id", schedule.id);

        results.push({
          schedule_id: schedule.id,
          status: enginesRun.length === schedule.engine_types.length ? "success" : "partial",
          engines_run: enginesRun,
        });
      } catch (e) {
        console.error(`Schedule ${schedule.id} failed:`, e);
        results.push({ schedule_id: schedule.id, status: "failed", engines_run: [] });

        await supabase
          .from("evaluation_schedules")
          .update({ failure_count: (schedule.failure_count || 0) + 1 })
          .eq("id", schedule.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: { schedules_processed: results.length, results },
      meta: { timestamp: new Date().toISOString() },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scheduled evaluation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
