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

    // Optionally filter to a specific schedule
    let body: { schedule_id?: string } = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }

    // Get schedules to run
    let query = supabase
      .from("evaluation_schedules")
      .select("*")
      .eq("is_active", true);

    if (body.schedule_id) {
      query = query.eq("id", body.schedule_id);
    }

    const { data: schedules, error: schedErr } = await query;
    if (schedErr) throw schedErr;

    const results: { schedule_id: string; status: string; engines_run: string[] }[] = [];

    for (const schedule of schedules || []) {
      // Log run start
      const { data: runRecord } = await supabase
        .from("evaluation_schedule_runs")
        .insert({
          schedule_id: schedule.id,
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

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

        const runStatus = enginesRun.length === schedule.engine_types.length ? "success" : 
                          enginesRun.length > 0 ? "partial" : "failed";

        // Update run record
        if (runRecord) {
          await supabase
            .from("evaluation_schedule_runs")
            .update({
              completed_at: new Date().toISOString(),
              status: runStatus,
              engines_run: enginesRun,
              results: { engines_requested: schedule.engine_types.length, engines_completed: enginesRun.length },
            })
            .eq("id", runRecord.id);
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
          status: runStatus,
          engines_run: enginesRun,
        });
      } catch (e) {
        console.error(`Schedule ${schedule.id} failed:`, e);
        
        // Update run record as failed
        if (runRecord) {
          await supabase
            .from("evaluation_schedule_runs")
            .update({
              completed_at: new Date().toISOString(),
              status: "failed",
              error_message: e instanceof Error ? e.message : "Unknown error",
            })
            .eq("id", runRecord.id);
        }

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
