import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
}

interface Incident {
  id: string;
  dataset_id: string;
  rule_id: string;
  dimension: string;
  severity: "P0" | "P1" | "P2";
  action: string;
  example_failed_rows: unknown[];
  failure_signature: string;
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
function generateAction(dimension: string, severity: string, ruleName: string): string {
  const actions: Record<string, Record<string, string>> = {
    completeness: {
      critical: `IMMEDIATE: Halt data pipeline. Investigate source for missing ${ruleName.split("_")[0]} values. Contact data owner.`,
      warning: `REVIEW: Check data extraction for ${ruleName.split("_")[0]} field. May require backfill.`,
      info: `MONITOR: Low completeness in ${ruleName.split("_")[0]}. Add to watchlist.`,
    },
    uniqueness: {
      critical: `IMMEDIATE: Duplicate keys detected. Block downstream consumers. Deduplicate before proceeding.`,
      warning: `REVIEW: Potential duplicates in ${ruleName.split("_")[0]}. Review merge logic.`,
      info: `MONITOR: Uniqueness below threshold. Track trend.`,
    },
    validity: {
      critical: `IMMEDIATE: Invalid data format. Quarantine affected records. Review data entry process.`,
      warning: `REVIEW: Format violations detected. Update validation rules at source.`,
      info: `MONITOR: Minor validity issues. Consider stricter input validation.`,
    },
    accuracy: {
      critical: `IMMEDIATE: Data accuracy below acceptable threshold. Suspend automated decisions.`,
      warning: `REVIEW: Accuracy drift detected. Compare with reference data.`,
      info: `MONITOR: Slight accuracy decline. Schedule data audit.`,
    },
    timeliness: {
      critical: `IMMEDIATE: Data freshness SLA breached. Escalate to data engineering.`,
      warning: `REVIEW: Data staleness detected. Check pipeline schedules.`,
      info: `MONITOR: Minor delays in data refresh. Monitor trend.`,
    },
    consistency: {
      critical: `IMMEDIATE: Cross-system consistency failure. Reconcile data sources.`,
      warning: `REVIEW: Inconsistencies between related datasets. Investigate joins.`,
      info: `MONITOR: Minor consistency variations. Document known discrepancies.`,
    },
  };

  return (
    actions[dimension]?.[severity] ||
    `ACTION REQUIRED: Review ${dimension} violation for ${ruleName}. Severity: ${severity.toUpperCase()}.`
  );
}

// Generate failure signature for deduplication
function generateFailureSignature(ruleId: string, dimension: string, successRate: number): string {
  // Round success rate to nearest 5% for signature grouping
  const roundedRate = Math.round(successRate * 20) * 5;
  return `${dimension}_${ruleId.slice(0, 8)}_${roundedRate}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dataset_id, execution_id, profile_id, execution_metrics } = await req.json();

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const metrics: RuleMetric[] = execution_metrics;
    const violatedMetrics = metrics.filter((m) => m.violated);
    const incidents: Incident[] = [];

    // Get sample failed rows for examples
    const { data: bronzeData } = await supabase
      .from("bronze_data")
      .select("raw_data")
      .limit(5);

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
        dimension: metric.dimension,
        severity: mapSeverityToPriority(metric.severity),
        action: generateAction(metric.dimension, metric.severity, metric.rule_name),
        example_failed_rows: bronzeData?.slice(0, 3).map((r) => r.raw_data) || [],
        failure_signature: failureSignature,
      };

      incidents.push(incident);
    }

    // Store incidents in database
    if (incidents.length > 0) {
      const incidentsToInsert = incidents.map((incident) => ({
        id: incident.id,
        dataset_id: incident.dataset_id,
        rule_id: incident.rule_id,
        execution_id,
        dimension: incident.dimension,
        severity: incident.severity,
        action: incident.action,
        example_failed_rows: incident.example_failed_rows,
        profiling_reference: profile_id,
        failure_signature: incident.failure_signature,
        status: "open",
      }));

      const { error: insertError } = await supabase
        .from("dq_incidents")
        .insert(incidentsToInsert);

      if (insertError) {
        console.error("Failed to store incidents:", insertError);
        // Don't fail the whole operation, just log
      }
    }

    const response: IncidentsOutput = {
      status: "success",
      incident_count: incidents.length,
      incidents,
    };

    console.log(`[DQ Incidents] Created ${incidents.length} new incidents (${violatedMetrics.length - incidents.length} deduplicated)`);

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
