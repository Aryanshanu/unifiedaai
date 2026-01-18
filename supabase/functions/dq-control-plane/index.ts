import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Response type definitions
interface ControlPlaneResponse {
  status: "success" | "error";
  code: string;
  message: string;
  detail?: string;
  profiling_run_id?: string;
  rules_version?: number;
  execution_summary?: Record<string, unknown>;
  incident_count?: number;
  // Track partial success
  completed_steps?: string[];
  failed_steps?: string[];
}

// Input validation
interface PipelineInput {
  dataset_id: string;
  dataset_version?: string | null;
  execution_mode: "FULL" | "INCREMENTAL";
  last_execution_ts?: string | null;
}

function validateInput(input: unknown): { valid: boolean; error?: string; data?: PipelineInput } {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Input must be a JSON object" };
  }

  const obj = input as Record<string, unknown>;

  if (!obj.dataset_id || typeof obj.dataset_id !== "string") {
    return { valid: false, error: "dataset_id is required and must be a string" };
  }

  if (!obj.execution_mode || !["FULL", "INCREMENTAL"].includes(obj.execution_mode as string)) {
    return { valid: false, error: "execution_mode must be 'FULL' or 'INCREMENTAL'" };
  }

  return {
    valid: true,
    data: {
      dataset_id: obj.dataset_id as string,
      dataset_version: (obj.dataset_version as string) || null,
      execution_mode: obj.execution_mode as "FULL" | "INCREMENTAL",
      last_execution_ts: (obj.last_execution_ts as string) || null,
    },
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const completedSteps: string[] = [];
  const failedSteps: string[] = [];

  try {
    // Parse input
    let input: unknown;
    try {
      input = await req.json();
    } catch {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input
    const validation = validateInput(input);
    if (!validation.valid || !validation.data) {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "INVALID_INPUT",
        message: validation.error || "Invalid input",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pipelineInput = validation.data;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify dataset exists
    const { data: dataset, error: datasetError } = await supabase
      .from("datasets")
      .select("id, name")
      .eq("id", pipelineInput.dataset_id)
      .single();

    if (datasetError || !dataset) {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "DATASET_NOT_FOUND",
        message: `Dataset not found: ${pipelineInput.dataset_id}`,
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if dataset has data in bronze_data
    const { count: bronzeCount } = await supabase
      .from("bronze_data")
      .select("id", { count: "exact", head: true })
      .eq("dataset_id", pipelineInput.dataset_id);

    if (!bronzeCount || bronzeCount === 0) {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "NO_DATA",
        message: "Dataset has no data. Upload data first before running the pipeline.",
        detail: `Dataset "${dataset.name}" has 0 rows in bronze_data.`,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[DQ Control Plane] Starting pipeline for dataset: ${dataset.name} (${bronzeCount} rows)`);

    // ============================================
    // STEP 1: DATA PROFILING (always runs)
    // ============================================
    console.log("[DQ Control Plane] Step 1: Data Profiling...");
    let profilingResult: Record<string, unknown> = {};
    
    try {
      const profilingResponse = await fetch(`${supabaseUrl}/functions/v1/dq-profile-dataset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          dataset_id: pipelineInput.dataset_id,
          dataset_version: pipelineInput.dataset_version,
        }),
      });

      profilingResult = await profilingResponse.json();
      
      if (profilingResult.status === "error") {
        console.error("[DQ Control Plane] Profiling failed:", profilingResult.message);
        failedSteps.push("profiling");
      } else {
        completedSteps.push("profiling");
        console.log("[DQ Control Plane] Profiling complete. Run ID:", profilingResult.profiling_run_id);
      }
    } catch (err) {
      console.error("[DQ Control Plane] Profiling exception:", err);
      failedSteps.push("profiling");
    }

    // If profiling failed, we can't continue
    if (failedSteps.includes("profiling")) {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "PROFILING_FAILED",
        message: profilingResult.message as string || "Profiling step failed",
        detail: profilingResult.detail as string,
        completed_steps: completedSteps,
        failed_steps: failedSteps,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================
    // STEP 2: RULE GENERATION (always runs)
    // ============================================
    console.log("[DQ Control Plane] Step 2: Rule Generation...");
    let rulesResult: Record<string, unknown> = {};

    try {
      const rulesResponse = await fetch(`${supabaseUrl}/functions/v1/dq-generate-rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          profiling_output: profilingResult,
        }),
      });

      rulesResult = await rulesResponse.json();

      if (rulesResult.status === "error" || !rulesResult.rules) {
        console.error("[DQ Control Plane] Rule generation failed:", rulesResult.message);
        failedSteps.push("rules");
      } else {
        completedSteps.push("rules");
        console.log("[DQ Control Plane] Rules generated. Version:", rulesResult.rules_version, "Count:", (rulesResult.rules as unknown[]).length);
      }
    } catch (err) {
      console.error("[DQ Control Plane] Rules exception:", err);
      failedSteps.push("rules");
    }

    // If rules failed, we can't continue
    if (failedSteps.includes("rules")) {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "RULES_FAILED",
        message: rulesResult.message as string || "Rule generation failed",
        profiling_run_id: profilingResult.profiling_run_id as string,
        completed_steps: completedSteps,
        failed_steps: failedSteps,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================
    // STEP 3: RULE EXECUTION (always runs - NO CIRCUIT BREAKER)
    // ============================================
    console.log("[DQ Control Plane] Step 3: Rule Execution...");
    let executionResult: Record<string, unknown> = {};

    try {
      const executionResponse = await fetch(`${supabaseUrl}/functions/v1/dq-execute-rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          dataset_id: pipelineInput.dataset_id,
          profile_id: profilingResult.profiling_run_id,
          rules: rulesResult.rules,
          rules_version: rulesResult.rules_version,
          execution_mode: pipelineInput.execution_mode,
          last_execution_ts: pipelineInput.last_execution_ts,
        }),
      });

      executionResult = await executionResponse.json();

      if (executionResult.status === "error") {
        console.error("[DQ Control Plane] Execution failed:", executionResult.message);
        failedSteps.push("execution");
      } else {
        completedSteps.push("execution");
        console.log("[DQ Control Plane] Execution complete. ID:", executionResult.execution_id);
        
        // Log if there were critical failures but DON'T STOP
        const summary = executionResult.summary as Record<string, unknown>;
        if (summary?.critical_failure) {
          console.log("[DQ Control Plane] ⚠️ Critical failures detected - continuing to dashboard and incidents");
        }
      }
    } catch (err) {
      console.error("[DQ Control Plane] Execution exception:", err);
      failedSteps.push("execution");
    }

    // If execution failed, we still try to generate dashboard with what we have
    if (failedSteps.includes("execution")) {
      // Return partial success
      const response: ControlPlaneResponse = {
        status: "error",
        code: "EXECUTION_FAILED",
        message: executionResult.message as string || "Rule execution failed",
        profiling_run_id: profilingResult.profiling_run_id as string,
        rules_version: rulesResult.rules_version as number,
        completed_steps: completedSteps,
        failed_steps: failedSteps,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================
    // STEP 4: DASHBOARD ASSETS (always runs)
    // ============================================
    console.log("[DQ Control Plane] Step 4: Dashboard Assets...");
    let dashboardResult: Record<string, unknown> = {};

    try {
      const dashboardResponse = await fetch(`${supabaseUrl}/functions/v1/dq-generate-dashboard-assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          execution_id: executionResult.execution_id,
          dataset_id: pipelineInput.dataset_id,
          execution_metrics: executionResult.metrics,
          execution_summary: executionResult.summary,
        }),
      });

      dashboardResult = await dashboardResponse.json();

      if (dashboardResult.status === "error") {
        console.error("[DQ Control Plane] Dashboard failed:", dashboardResult.message);
        failedSteps.push("dashboard");
      } else {
        completedSteps.push("dashboard");
        console.log("[DQ Control Plane] Dashboard assets generated");
      }
    } catch (err) {
      console.error("[DQ Control Plane] Dashboard exception:", err);
      failedSteps.push("dashboard");
    }

    // ============================================
    // STEP 5: INCIDENTS (always runs)
    // ============================================
    console.log("[DQ Control Plane] Step 5: Incident Management...");
    let incidentsResult: Record<string, unknown> = {};

    try {
      const incidentsResponse = await fetch(`${supabaseUrl}/functions/v1/dq-raise-incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          dataset_id: pipelineInput.dataset_id,
          execution_id: executionResult.execution_id,
          profile_id: profilingResult.profiling_run_id,
          execution_metrics: executionResult.metrics,
        }),
      });

      incidentsResult = await incidentsResponse.json();

      if (incidentsResult.status === "error") {
        console.error("[DQ Control Plane] Incidents failed:", incidentsResult.message);
        failedSteps.push("incidents");
      } else {
        completedSteps.push("incidents");
        console.log("[DQ Control Plane] Incidents raised. Count:", incidentsResult.incident_count);
      }
    } catch (err) {
      console.error("[DQ Control Plane] Incidents exception:", err);
      failedSteps.push("incidents");
    }

    // ============================================
    // FINAL RESPONSE
    // ============================================
    const totalTime = Date.now() - startTime;
    console.log(`[DQ Control Plane] Pipeline completed in ${totalTime}ms. Completed: ${completedSteps.join(", ")}. Failed: ${failedSteps.join(", ") || "none"}`);

    const response: ControlPlaneResponse = {
      status: "success",
      code: "PIPELINE_COMPLETE",
      message: `Pipeline completed. ${completedSteps.length}/5 steps successful.`,
      profiling_run_id: profilingResult.profiling_run_id as string,
      rules_version: rulesResult.rules_version as number,
      execution_summary: {
        ...(executionResult.summary as Record<string, unknown>),
        execution_id: executionResult.execution_id,
        total_rules: (executionResult.metrics as unknown[])?.length || 0,
        execution_time_ms: totalTime,
      },
      incident_count: (incidentsResult.incident_count as number) || 0,
      completed_steps: completedSteps,
      failed_steps: failedSteps,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DQ Control Plane] Unexpected error:", error);
    const response: ControlPlaneResponse = {
      status: "error",
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      detail: error instanceof Error ? error.message : "Unknown error",
      completed_steps: completedSteps,
      failed_steps: failedSteps,
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
