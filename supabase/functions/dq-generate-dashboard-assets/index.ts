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

interface DashboardOutput {
  status: "success" | "error";
  summary_sql?: string;
  hotspots_sql?: string;
  dimension_breakdown_sql?: string;
  asset_id?: string;
  code?: string;
  message?: string;
  detail?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { execution_id, dataset_id, execution_metrics } = await req.json();

    if (!execution_id || !dataset_id || !execution_metrics) {
      const response: DashboardOutput = {
        status: "error",
        code: "INVALID_DASHBOARD_INPUT",
        message: "execution_id, dataset_id, and execution_metrics are required",
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

    // Generate Summary SQL
    // This SQL provides an overall view of data quality scores
    const summarySql = `
-- Data Quality Summary Dashboard
-- Generated: ${new Date().toISOString()}
-- Execution ID: ${execution_id}

WITH quality_summary AS (
  SELECT
    '${dataset_id}' as dataset_id,
    ${metrics.length} as total_rules,
    ${metrics.filter((m) => !m.violated).length} as passed_rules,
    ${metrics.filter((m) => m.violated).length} as failed_rules,
    ${(metrics.reduce((sum, m) => sum + m.success_rate, 0) / metrics.length * 100).toFixed(2)} as overall_score,
    ${metrics.filter((m) => m.violated && m.severity === "critical").length} as critical_issues,
    ${metrics.filter((m) => m.violated && m.severity === "warning").length} as warning_issues,
    ${metrics.filter((m) => m.violated && m.severity === "info").length} as info_issues
)
SELECT
  dataset_id,
  total_rules,
  passed_rules,
  failed_rules,
  overall_score,
  CASE
    WHEN overall_score >= 95 THEN 'A'
    WHEN overall_score >= 85 THEN 'B'
    WHEN overall_score >= 70 THEN 'C'
    WHEN overall_score >= 50 THEN 'D'
    ELSE 'F'
  END as quality_grade,
  critical_issues,
  warning_issues,
  info_issues
FROM quality_summary;
    `.trim();

    // Generate Hotspots SQL
    // This SQL identifies the most problematic columns/rules
    const violatedMetrics = metrics.filter((m) => m.violated);
    const hotspotsSql = `
-- Data Quality Hotspots (Problem Areas)
-- Generated: ${new Date().toISOString()}
-- Execution ID: ${execution_id}

WITH hotspots AS (
  SELECT * FROM (VALUES
    ${violatedMetrics.length > 0
      ? violatedMetrics
          .sort((a, b) => {
            // Sort by severity first, then by success_rate
            const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
            const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (sevDiff !== 0) return sevDiff;
            return a.success_rate - b.success_rate;
          })
          .map(
            (m, i) =>
              `    (${i + 1}, '${m.rule_name}', '${m.dimension}', '${m.severity}', ${(m.success_rate * 100).toFixed(2)}, ${m.failed_count}, ${m.total_count}, ${(m.threshold * 100).toFixed(2)})`
          )
          .join(",\n")
      : "    (1, 'no_issues', 'n/a', 'info', 100.00, 0, 0, 0.00)"
    }
  ) AS t(rank, rule_name, dimension, severity, success_rate, failed_count, total_count, threshold)
)
SELECT
  rank,
  rule_name,
  dimension,
  severity,
  success_rate || '%' as current_score,
  threshold || '%' as required_threshold,
  failed_count || '/' || total_count as failed_records,
  CASE severity
    WHEN 'critical' THEN '🔴 CRITICAL'
    WHEN 'warning' THEN '🟡 WARNING'
    ELSE '🔵 INFO'
  END as status
FROM hotspots
ORDER BY rank
LIMIT 10;
    `.trim();

    // Generate Dimension Breakdown SQL
    // This SQL provides scores per quality dimension
    const dimensionGroups = metrics.reduce((acc, m) => {
      if (!acc[m.dimension]) {
        acc[m.dimension] = { total: 0, sum: 0, violated: 0 };
      }
      acc[m.dimension].total++;
      acc[m.dimension].sum += m.success_rate;
      if (m.violated) acc[m.dimension].violated++;
      return acc;
    }, {} as Record<string, { total: number; sum: number; violated: number }>);

    const dimensionBreakdownSql = `
-- Data Quality by Dimension
-- Generated: ${new Date().toISOString()}
-- Execution ID: ${execution_id}

WITH dimension_scores AS (
  SELECT * FROM (VALUES
    ${Object.entries(dimensionGroups)
      .map(
        ([dim, data]) =>
          `    ('${dim}', ${((data.sum / data.total) * 100).toFixed(2)}, ${data.total}, ${data.violated})`
      )
      .join(",\n")}
  ) AS t(dimension, score, rule_count, violations)
)
SELECT
  UPPER(dimension) as dimension,
  score || '%' as score,
  rule_count as rules_checked,
  violations as violations_found,
  CASE
    WHEN score >= 95 THEN '✅ Excellent'
    WHEN score >= 85 THEN '👍 Good'
    WHEN score >= 70 THEN '⚠️ Fair'
    WHEN score >= 50 THEN '🔶 Poor'
    ELSE '❌ Critical'
  END as status,
  REPEAT('█', CAST(score / 10 AS INTEGER)) || REPEAT('░', 10 - CAST(score / 10 AS INTEGER)) as progress_bar
FROM dimension_scores
ORDER BY score ASC;
    `.trim();

    // Store dashboard assets
    const { data: assetRecord, error: insertError } = await supabase
      .from("dq_dashboard_assets")
      .insert({
        execution_id,
        dataset_id,
        summary_sql: summarySql,
        hotspots_sql: hotspotsSql,
        dimension_breakdown_sql: dimensionBreakdownSql,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to store dashboard assets:", insertError);
    }

    const response: DashboardOutput = {
      status: "success",
      summary_sql: summarySql,
      hotspots_sql: hotspotsSql,
      dimension_breakdown_sql: dimensionBreakdownSql,
      asset_id: assetRecord?.id,
    };

    console.log(`[DQ Dashboard] Generated 3 SQL assets for execution ${execution_id}`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DQ Dashboard] Error:", error);
    const response: DashboardOutput = {
      status: "error",
      code: "DASHBOARD_GENERATION_FAILED",
      message: "Failed to generate dashboard assets",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
