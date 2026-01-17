import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FailedRow {
  row_index: number;
  row_id: string;
  column_value: string | number | null;
  failure_reason: string;
}

interface RuleMetric {
  rule_id: string;
  rule_name: string;
  dimension: string;
  severity: string;
  success_rate: number;
  failed_count: number;
  total_count: number;
  threshold: number;
  violated: boolean;
  failed_rows_sample?: FailedRow[];
}

interface Incident {
  id: string;
  dataset_id: string;
  rule_id: string;
  rule_name: string;
  dimension: string;
  severity: "P0" | "P1" | "P2";
  action: string;
  example_failed_rows: FailedRow[];
  failure_signature: string;
  execution_reference: string;
  profiling_reference: string | null;
}

interface IncidentsOutput {
  status: "success" | "error";
  incident_count?: number;
  incidents?: Incident[];
  code?: string;
  message?: string;
  detail?: string;
}

// Map rule severity to incident priority
function mapSeverityToPriority(severity: string): "P0" | "P1" | "P2" {
  switch (severity) {
    case "critical":
      return "P0";
    case "warning":
      return "P1";
    default:
      return "P2";
  }
}

// Generate remediation action based on dimension and severity
function generateAction(dimension: string, severity: string, ruleName: string, failedCount: number, totalCount: number): string {
  const failPercentage = ((failedCount / totalCount) * 100).toFixed(1);
  
  // ALLOWED DIMENSIONS ONLY: completeness, uniqueness, validity, timeliness
  const actions: Record<string, Record<string, string>> = {
    completeness: {
      critical: `🚨 IMMEDIATE ACTION: ${failPercentage}% missing values in ${ruleName.split("_")[0]}. Halt data pipeline. Investigate source system. Contact data owner for root cause analysis.`,
      warning: `⚠️ REVIEW REQUIRED: ${failPercentage}% missing values in ${ruleName.split("_")[0]}. Check data extraction process. May require backfill operation.`,
      info: `ℹ️ MONITOR: Low completeness (${failPercentage}% missing) in ${ruleName.split("_")[0]}. Add to watchlist for trend analysis.`,
    },
    uniqueness: {
      critical: `🚨 IMMEDIATE ACTION: ${failedCount} duplicate records detected. Block downstream consumers. Execute deduplication before proceeding.`,
      warning: `⚠️ REVIEW REQUIRED: Potential duplicates in ${ruleName.split("_")[0]} (${failedCount} records). Review merge/join logic in ETL.`,
      info: `ℹ️ MONITOR: Uniqueness below threshold (${failPercentage}% duplicates). Track trend over time.`,
    },
    validity: {
      critical: `🚨 IMMEDIATE ACTION: ${failPercentage}% invalid format in ${ruleName.split("_")[0]}. Quarantine affected records. Review data entry validation.`,
      warning: `⚠️ REVIEW REQUIRED: Format violations detected (${failedCount} records). Update input validation rules at source.`,
      info: `ℹ️ MONITOR: Minor validity issues (${failPercentage}%). Consider stricter input constraints.`,
    },
    timeliness: {
      critical: `🚨 IMMEDIATE ACTION: Data freshness SLA breached (${failedCount} stale records). Escalate to data engineering team.`,
      warning: `⚠️ REVIEW REQUIRED: Data staleness detected (${failedCount} records older than threshold). Check pipeline schedules.`,
      info: `ℹ️ MONITOR: Minor delays in data refresh. Track latency trend.`,
    },
  };

  return (
    actions[dimension.toLowerCase()]?.[severity] ||
    `⚠️ ACTION REQUIRED: Review ${dimension} violation for ${ruleName}. ${failedCount}/${totalCount} records affected (${failPercentage}%). Severity: ${severity.toUpperCase()}.`
  );
}

// Generate failure signature for deduplication
function generateFailureSignature(ruleId: string, dimension: string, successRate: number): string {
  const roundedRate = Math.round(successRate * 20) * 5;
  return `${dimension}_${ruleId.slice(0, 8)}_${roundedRate}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dataset_id, execution_id, profile_id, dashboard_id, execution_metrics } = await req.json();

    if (!dataset_id || !execution_metrics) {
      const response: IncidentsOutput = {
        status: "error",
        code: "INVALID_INCIDENT_INPUT",
        message: "dataset_id and execution_metrics are required",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(execution_metrics)) {
      const response: IncidentsOutput = {
        status: "error",
        code: "INVALID_METRICS_FORMAT",
        message: "execution_metrics must be an array",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const metrics: RuleMetric[] = execution_metrics;
    
    // Only create incidents for ACTUALLY violated rules
    const violatedMetrics = metrics.filter((m) => m.violated === true);
    
    if (violatedMetrics.length === 0) {
      console.log(`[DQ Incidents] No violated rules. 0 incidents created.`);
      const response: IncidentsOutput = {
        status: "success",
        incident_count: 0,
        incidents: [],
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incidents: Incident[] = [];

    for (const metric of violatedMetrics) {
      const failureSignature = generateFailureSignature(
        metric.rule_id,
        metric.dimension,
        metric.success_rate
      );

      // Check for existing incident with same signature (deduplication)
      const { data: existingIncident } = await supabase
        .from("dq_incidents")
        .select("id")
        .eq("dataset_id", dataset_id)
        .eq("rule_id", metric.rule_id)
        .eq("failure_signature", failureSignature)
        .eq("status", "open")
        .single();

      if (existingIncident) {
        console.log(`[DQ Incidents] Skipping duplicate incident for ${metric.rule_name}`);
        continue;
      }

      const incident: Incident = {
        id: crypto.randomUUID(),
        dataset_id,
        rule_id: metric.rule_id,
        rule_name: metric.rule_name,
        dimension: metric.dimension,
        severity: mapSeverityToPriority(metric.severity),
        action: generateAction(metric.dimension, metric.severity, metric.rule_name, metric.failed_count, metric.total_count),
        example_failed_rows: metric.failed_rows_sample || [],
        failure_signature: failureSignature,
        execution_reference: execution_id || '',
        profiling_reference: profile_id || null,
      };

      incidents.push(incident);
    }

    // Store incidents in database
    if (incidents.length > 0) {
      const incidentsToInsert = incidents.map((incident) => ({
        id: incident.id,
        dataset_id: incident.dataset_id,
        rule_id: incident.rule_id,
        execution_id: incident.execution_reference,
        dimension: incident.dimension,
        severity: incident.severity,
        action: incident.action,
        example_failed_rows: incident.example_failed_rows,
        profiling_reference: incident.profiling_reference,
        failure_signature: incident.failure_signature,
        status: "open",
      }));

      const { error: insertError } = await supabase
        .from("dq_incidents")
        .insert(incidentsToInsert);

      if (insertError) {
        console.error("Failed to store incidents:", insertError);
      }
    }

    const response: IncidentsOutput = {
      status: "success",
      incident_count: incidents.length,
      incidents,
    };

    console.log(`[DQ Incidents] Created ${incidents.length} new incidents from ${violatedMetrics.length} violations (${violatedMetrics.length - incidents.length} deduplicated)`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DQ Incidents] Error:", error);
    const response: IncidentsOutput = {
      status: "error",
      code: "INCIDENT_CREATION_FAILED",
      message: "Failed to create incidents",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
