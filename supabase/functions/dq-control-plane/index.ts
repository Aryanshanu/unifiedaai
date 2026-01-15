import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Response type definitions
interface ControlPlaneResponse {
  status: "success" | "error" | "halted";
  code: string;
  message: string;
  detail?: string;
  profiling_run_id?: string;
  rules_version?: number;
  execution_summary?: Record<string, unknown>;
  incident_count?: number;
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

  if (obj.last_execution_ts && typeof obj.last_execution_ts !== "string") {
    return { valid: false, error: "last_execution_ts must be an ISO-8601 string or null" };
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

  try {
    // Parse input
    let input: unknown;
    try {
      input = await req.json();
    } catch {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "INVALID_USER_INPUT_JSON",
        message: "User input must be a valid JSON object.",
        detail: "Failed to parse request body as JSON",
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
        code: "INVALID_USER_INPUT_JSON",
        message: "User input must be a valid JSON object.",
        detail: validation.error,
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
        code: "INVALID_USER_INPUT_JSON",
        message: "User input must be a valid JSON object.",
        detail: `Dataset not found: ${pipelineInput.dataset_id}`,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================
    // TASK 1: DATA PROFILING
    // ============================================
    console.log("[DQ Control Plane] Task 1: Starting data profiling...");
    
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

    const profilingResult = await profilingResponse.json();

    // Validate profiling output
    if (profilingResult.status === "error") {
      return new Response(JSON.stringify(profilingResult), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requiredProfilingKeys = ["profiling_run_id", "dataset_id", "row_count", "column_profiles", "profile_ts"];
    const missingProfilingKeys = requiredProfilingKeys.filter((k) => !(k in profilingResult));

    if (missingProfilingKeys.length > 0) {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "INVALID_PROFILING_OUTPUT",
        message: "Profiling output is not conformant. Downstream tasks halted.",
        detail: `Missing keys: ${missingProfilingKeys.join(", ")}`,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[DQ Control Plane] Task 1: Profiling complete. Run ID:", profilingResult.profiling_run_id);

    // ============================================
    // TASK 2: RULE DEVELOPMENT
    // ============================================
    console.log("[DQ Control Plane] Task 2: Starting rule generation...");

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

    const rulesResult = await rulesResponse.json();

    // Validate rules output
    if (rulesResult.status === "error") {
      return new Response(JSON.stringify(rulesResult), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rulesResult.rules_version || !rulesResult.rules || !Array.isArray(rulesResult.rules)) {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "INVALID_RULE_DEFINITION",
        message: "Rule generation output is invalid or incomplete.",
        detail: "Missing rules_version or rules array",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[DQ Control Plane] Task 2: Rules generated. Version:", rulesResult.rules_version, "Count:", rulesResult.rules.length);

    // ============================================
    // TASK 3: RULE EXECUTION
    // ============================================
    console.log("[DQ Control Plane] Task 3: Starting rule execution...");

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

    const executionResult = await executionResponse.json();

    // Check for errors
    if (executionResult.status === "error") {
      return new Response(JSON.stringify(executionResult), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🚨 CIRCUIT BREAKER CHECK 🚨
    if (executionResult.status === "halted" || executionResult.summary?.critical_failure === true) {
      console.log("[DQ Control Plane] 🚨 CIRCUIT BREAKER TRIPPED - Halting pipeline");
      const response: ControlPlaneResponse = {
        status: "halted",
        code: "CIRCUIT_BREAKER_TRIPPED",
        message: "Critical data quality failure detected. Downstream tasks stopped.",
        execution_summary: executionResult.summary,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[DQ Control Plane] Task 3: Execution complete. Execution ID:", executionResult.execution_id);

    // ============================================
    // TASK 4: DASHBOARD ASSET GENERATION
    // ============================================
    console.log("[DQ Control Plane] Task 4: Generating dashboard assets...");

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
      }),
    });

    const dashboardResult = await dashboardResponse.json();

    // Validate dashboard output
    if (dashboardResult.status === "error") {
      return new Response(JSON.stringify(dashboardResult), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requiredDashboardKeys = ["summary_sql", "hotspots_sql", "dimension_breakdown_sql"];
    const missingDashboardKeys = requiredDashboardKeys.filter((k) => !(k in dashboardResult));

    if (missingDashboardKeys.length > 0) {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "INVALID_DASHBOARD_ASSETS",
        message: "Dashboard asset output is non-conformant.",
        detail: `Missing keys: ${missingDashboardKeys.join(", ")}`,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[DQ Control Plane] Task 4: Dashboard assets generated");

    // ============================================
    // TASK 5: ISSUE MANAGEMENT & ALERTS
    // ============================================
    console.log("[DQ Control Plane] Task 5: Raising incidents...");

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

    const incidentsResult = await incidentsResponse.json();

    if (incidentsResult.status === "error") {
      return new Response(JSON.stringify(incidentsResult), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[DQ Control Plane] Task 5: Incidents raised. Count:", incidentsResult.incident_count);

    // ============================================
    // FINAL SUCCESS RESPONSE
    // ============================================
    const totalTime = Date.now() - startTime;
    console.log(`[DQ Control Plane] Pipeline completed in ${totalTime}ms`);

    const response: ControlPlaneResponse = {
      status: "success",
      code: "DQ_PIPELINE_COMPLETED",
      message: "Data Quality lifecycle completed successfully.",
      profiling_run_id: profilingResult.profiling_run_id,
      rules_version: rulesResult.rules_version,
      execution_summary: {
        ...executionResult.summary,
        execution_id: executionResult.execution_id,
        total_rules: executionResult.metrics?.length || 0,
        execution_time_ms: totalTime,
      },
      incident_count: incidentsResult.incident_count || 0,
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
      message: "An unexpected error occurred in the control plane.",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
