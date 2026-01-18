import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TRUTH CONTRACT: Complete response including TRUST_REPORT
interface TrustReport {
  discarded_metrics: string[];
  deduplicated_rules: number;
  inconsistencies_found: string[];
  truth_score: number;
}

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
  // TRUTH CONTRACT: Reconciliation report
  TRUST_REPORT?: TrustReport;
  // GOVERNANCE: From truth enforcer
  governance_status?: "GOVERNANCE_CERTIFIED" | "DQ_CONTRACT_VIOLATION";
  violations?: string[];
  normalized_profiling?: Record<string, unknown>;
  normalized_execution?: Record<string, unknown>;
  normalized_incidents?: Record<string, unknown>;
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
  
  // TRUST_REPORT tracking
  const discardedMetrics: string[] = [];
  let deduplicatedRulesCount = 0;
  const inconsistencies: string[] = [];

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

    // Check if dataset has data in dq_data (the single pipeline table)
    const { count: dqDataCount } = await supabase
      .from("dq_data")
      .select("id", { count: "exact", head: true })
      .eq("dataset_id", pipelineInput.dataset_id);

    if (!dqDataCount || dqDataCount === 0) {
      const response: ControlPlaneResponse = {
        status: "error",
        code: "NO_DATA",
        message: "Dataset has no ingested data. Upload data first before running the pipeline.",
        detail: `Dataset "${dataset.name}" has 0 rows in dq_data. Use the uploader to ingest rows.`,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[DQ Control Plane] Starting pipeline for dataset: ${dataset.name} (${dqDataCount} rows)`);

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
        
        // TRUTH CONTRACT: Track discarded metrics from profiling
        const dimensionScores = profilingResult.dimension_scores as Array<{ dimension: string; computed: boolean }> || [];
        dimensionScores.forEach((d) => {
          if (!d.computed) {
            discardedMetrics.push(d.dimension);
          }
        });
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
        
        // TRUTH CONTRACT: Track deduplicated rules
        deduplicatedRulesCount = (rulesResult.deduplicated_count as number) || 0;
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
        
        // Check if it's a truth violation
        if (executionResult.code === "EXECUTION_TRUTH_VIOLATION") {
          inconsistencies.push(`EXECUTION_TRUTH_VIOLATION: ${executionResult.detail}`);
        }
      } else {
        completedSteps.push("execution");
        console.log("[DQ Control Plane] Execution complete. ID:", executionResult.execution_id);
        
        // TRUTH CONTRACT: Validate execution results
        const summary = executionResult.summary as Record<string, unknown>;
        const metrics = executionResult.metrics as Array<Record<string, unknown>>;
        
        if (summary && metrics) {
          // Validate execution truth: passed + failed = total
          const passed = summary.passed as number;
          const failed = summary.failed as number;
          const total = summary.total_rules as number;
          
          if (passed + failed !== total) {
            inconsistencies.push(`EXECUTION_TRUTH_VIOLATION: passed(${passed}) + failed(${failed}) != total(${total})`);
          }
          
          // Validate all success_rates are ratios (0-1)
          for (const m of metrics) {
            const successRate = m.success_rate as number;
            if (successRate < 0 || successRate > 1) {
              inconsistencies.push(`INVALID_SUCCESS_RATE: Rule ${m.rule_id} has success_rate ${successRate} outside [0,1]`);
            }
            
            const threshold = m.threshold as number;
            if (threshold < 0 || threshold > 1) {
              inconsistencies.push(`INVALID_THRESHOLD: Rule ${m.rule_id} has threshold ${threshold} outside [0,1]`);
            }
            
            const failedCount = m.failed_count as number;
            if (failedCount < 0) {
              inconsistencies.push(`NEGATIVE_COUNT: Rule ${m.rule_id} has negative failed_count ${failedCount}`);
            }
          }
          
          // RULE CONSISTENCY CHECK: Validate executed rules exist in library
          // TRUTH CONTRACT: Rules use 'id' property, metrics use 'rule_id' 
          const executedRuleIds = new Set(metrics.map(m => m.rule_id as string).filter(Boolean));
          const libraryRules = rulesResult.rules as Array<{ id: string }>;
          // Map library rules by id (the property name used in dq-generate-rules)
          const libraryRuleIds = new Set(libraryRules.map(r => r.id).filter(Boolean));
          
          const phantomRules = [...executedRuleIds].filter(id => id && !libraryRuleIds.has(id));
          if (phantomRules.length > 0) {
            inconsistencies.push(`PHANTOM_RULES: ${phantomRules.length} rules executed but not in library`);
          }
          
          const skippedRules = [...libraryRuleIds].filter(id => !executedRuleIds.has(id));
          if (skippedRules.length > 0) {
            console.log(`[DQ Control Plane] Warning: ${skippedRules.length} rules in library but not executed`);
          }
        }
        
        // Log if there were critical failures but DON'T STOP
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
      // Return partial success with inconsistencies
      const truthScore = inconsistencies.length === 0 ? 1.0 : Math.max(0, 1 - (inconsistencies.length * 0.1));
      const response: ControlPlaneResponse = {
        status: "error",
        code: "EXECUTION_FAILED",
        message: executionResult.message as string || "Rule execution failed",
        profiling_run_id: profilingResult.profiling_run_id as string,
        rules_version: rulesResult.rules_version as number,
        completed_steps: completedSteps,
        failed_steps: failedSteps,
        TRUST_REPORT: {
          discarded_metrics: discardedMetrics,
          deduplicated_rules: deduplicatedRulesCount,
          inconsistencies_found: inconsistencies,
          truth_score: truthScore,
        },
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
        
        // INCIDENT CONSISTENCY CHECK: Validate incidents only from failed rules
        const incidentCount = (incidentsResult.incident_count as number) || 0;
        const metrics = executionResult.metrics as Array<{ violated: boolean; rule_id: string }>;
        const failedRuleIds = metrics?.filter(m => m.violated).map(m => m.rule_id) || [];
        
        if (failedRuleIds.length === 0 && incidentCount > 0) {
          inconsistencies.push(`ORPHAN_INCIDENTS: ${incidentCount} incidents created but no rules failed`);
        }
      }
    } catch (err) {
      console.error("[DQ Control Plane] Incidents exception:", err);
      failedSteps.push("incidents");
    }

    // ============================================
    // STEP 6: GOVERNANCE VALIDATION (Truth Enforcer)
    // ============================================
    console.log("[DQ Control Plane] Step 6: Governance Validation...");
    let governanceResult: Record<string, unknown> = {};

    try {
      const governanceResponse = await fetch(`${supabaseUrl}/functions/v1/dq-truth-enforcer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          profiling: profilingResult,
          rules: rulesResult,
          execution: executionResult,
          dashboard: dashboardResult,
          incidents: incidentsResult,
        }),
      });

      governanceResult = await governanceResponse.json();
      console.log(`[DQ Control Plane] Governance: ${governanceResult.code}`);
    } catch (err) {
      console.error("[DQ Control Plane] Governance exception:", err);
      governanceResult = {
        code: "GOVERNANCE_ERROR",
        trust_report: {
          discarded_metrics: discardedMetrics,
          deduplicated_rules: deduplicatedRulesCount,
          inconsistencies_found: [...inconsistencies, `GOVERNANCE_ERROR: ${err}`],
          truth_score: 0,
        },
      };
    }

    // ============================================
    // FINAL RESPONSE WITH TRUST_REPORT
    // ============================================
    const totalTime = Date.now() - startTime;
    console.log(`[DQ Control Plane] Pipeline completed in ${totalTime}ms. Completed: ${completedSteps.join(", ")}. Failed: ${failedSteps.join(", ") || "none"}`);

    // Use trust report from governance enforcer if available
    const trustReport: TrustReport = (governanceResult.trust_report as TrustReport) || {
      discarded_metrics: discardedMetrics,
      deduplicated_rules: deduplicatedRulesCount,
      inconsistencies_found: inconsistencies,
      truth_score: inconsistencies.length === 0 ? 100 : Math.max(0, 100 - (inconsistencies.length * 10)),
    };

    // GOVERNANCE: If truth enforcer returned DQ_CONTRACT_VIOLATION, propagate as error
    const isGovernanceViolation = governanceResult.code === 'DQ_CONTRACT_VIOLATION';
    
    if (isGovernanceViolation) {
      console.log(`[DQ Control Plane] GOVERNANCE VIOLATION detected - returning 422`);
      const response: ControlPlaneResponse = {
        status: "error",
        code: "DQ_CONTRACT_VIOLATION",
        message: "Pipeline output is not governance-safe and must not be displayed.",
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
        TRUST_REPORT: trustReport,
        governance_status: "DQ_CONTRACT_VIOLATION",
        violations: governanceResult.violations as string[],
        normalized_profiling: governanceResult.normalized_profiling as Record<string, unknown>,
        normalized_execution: governanceResult.normalized_execution as Record<string, unknown>,
        normalized_incidents: governanceResult.normalized_incidents as Record<string, unknown>,
      };
      return new Response(JSON.stringify(response), {
        status: 422, // Unprocessable Entity - governance violation
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      TRUST_REPORT: trustReport,
      // GOVERNANCE: Include truth enforcer results
      governance_status: governanceResult.code as "GOVERNANCE_CERTIFIED" | "DQ_CONTRACT_VIOLATION",
      violations: governanceResult.violations as string[],
      normalized_profiling: governanceResult.normalized_profiling as Record<string, unknown>,
      normalized_execution: governanceResult.normalized_execution as Record<string, unknown>,
      normalized_incidents: governanceResult.normalized_incidents as Record<string, unknown>,
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
