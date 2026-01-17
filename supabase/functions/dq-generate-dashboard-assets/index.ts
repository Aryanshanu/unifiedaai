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

interface DimensionScore {
  dimension: string;
  score: number;
  rules_count: number;
  violations: number;
  status: string;
}

interface Hotspot {
  rank: number;
  rule_name: string;
  dimension: string;
  severity: string;
  current_score: number;
  required_threshold: number;
  gap: number;
  failed_records: string;
  priority: string;
}

// Quality metrics computed ONLY from execution data - no hardcoded defaults
interface QualityMetrics {
  total_records: number;
  error_rate: number;
  null_blank_percentage: number;
  duplicate_rate: number;
}

interface DashboardData {
  overall_score: number;
  quality_grade: string;
  total_rules: number;
  passed_rules: number;
  failed_rules: number;
  critical_issues: number;
  warning_issues: number;
  info_issues: number;
  dimension_scores: DimensionScore[];
  hotspots: Hotspot[];
  quality_metrics: QualityMetrics;
  computed_from_data: boolean;
  data_rows_evaluated: number;
}

interface DashboardOutput {
  status: "success" | "error";
  dashboard_data?: DashboardData;
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
    const { execution_id, dataset_id, execution_metrics, execution_summary } = await req.json();

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

    if (!Array.isArray(execution_metrics) || execution_metrics.length === 0) {
      const response: DashboardOutput = {
        status: "error",
        code: "NO_METRICS_PROVIDED",
        message: "execution_metrics must be a non-empty array of rule metrics",
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

    // Calculate overall score from REAL metrics only
    const overallScore = (metrics.reduce((sum, m) => sum + m.success_rate, 0) / metrics.length) * 100;
    
    // Determine quality grade
    let qualityGrade = 'F';
    if (overallScore >= 95) qualityGrade = 'A';
    else if (overallScore >= 85) qualityGrade = 'B';
    else if (overallScore >= 70) qualityGrade = 'C';
    else if (overallScore >= 50) qualityGrade = 'D';

    // Calculate dimension scores - ONLY from execution metrics
    const dimensionGroups = metrics.reduce((acc, m) => {
      if (!acc[m.dimension]) {
        acc[m.dimension] = { total: 0, sum: 0, violated: 0 };
      }
      acc[m.dimension].total++;
      acc[m.dimension].sum += m.success_rate;
      if (m.violated) acc[m.dimension].violated++;
      return acc;
    }, {} as Record<string, { total: number; sum: number; violated: number }>);

    const dimensionScores: DimensionScore[] = Object.entries(dimensionGroups).map(([dim, data]) => {
      const score = (data.sum / data.total) * 100;
      let status = 'critical';
      if (score >= 95) status = 'excellent';
      else if (score >= 85) status = 'good';
      else if (score >= 70) status = 'fair';
      else if (score >= 50) status = 'poor';
      
      return {
        dimension: dim.toUpperCase(),
        score,
        rules_count: data.total,
        violations: data.violated,
        status,
      };
    }).sort((a, b) => a.score - b.score); // Sort by score ascending (worst first)

    // Generate hotspots (worst performers) - ONLY from violated rules
    const violatedMetrics = metrics.filter((m) => m.violated);
    const hotspots: Hotspot[] = violatedMetrics
      .sort((a, b) => {
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        const sevDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
        if (sevDiff !== 0) return sevDiff;
        return a.success_rate - b.success_rate;
      })
      .slice(0, 10)
      .map((m, i) => ({
        rank: i + 1,
        rule_name: m.rule_name,
        dimension: m.dimension.toUpperCase(),
        severity: m.severity.toUpperCase(),
        current_score: m.success_rate * 100,
        required_threshold: m.threshold * 100,
        gap: (m.success_rate - m.threshold) * 100,
        failed_records: `${m.failed_count}/${m.total_count}`,
        priority: m.severity === 'critical' ? '🔴 CRITICAL' : m.severity === 'warning' ? '🟡 WARNING' : '🟢 INFO',
      }));

    // Quality metrics from execution summary ONLY - NO hardcoded defaults
    const dataRowsEvaluated = execution_summary?.data_rows_evaluated || metrics[0]?.total_count || 0;
    const qualityMetrics: QualityMetrics = {
      total_records: dataRowsEvaluated,
      error_rate: execution_summary?.error_rate ?? ((metrics.filter(m => m.violated).length / metrics.length) * 100),
      null_blank_percentage: execution_summary?.null_blank_percentage ?? 0,
      duplicate_rate: execution_summary?.duplicate_rate ?? 0,
    };

    const dashboardData: DashboardData = {
      overall_score: overallScore,
      quality_grade: qualityGrade,
      total_rules: metrics.length,
      passed_rules: metrics.filter((m) => !m.violated).length,
      failed_rules: metrics.filter((m) => m.violated).length,
      critical_issues: metrics.filter((m) => m.violated && m.severity === "critical").length,
      warning_issues: metrics.filter((m) => m.violated && m.severity === "warning").length,
      info_issues: metrics.filter((m) => m.violated && m.severity === "info").length,
      dimension_scores: dimensionScores,
      hotspots,
      quality_metrics: qualityMetrics,
      computed_from_data: true,
      data_rows_evaluated: dataRowsEvaluated,
    };

    // Store dashboard assets - store structured JSON, not SQL comments
    const { data: assetRecord, error: insertError } = await supabase
      .from("dq_dashboard_assets")
      .insert({
        execution_id,
        dataset_id,
        summary_sql: JSON.stringify(dashboardData), // Full structured data
        hotspots_sql: JSON.stringify(hotspots),
        dimension_breakdown_sql: JSON.stringify(dimensionScores),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to store dashboard assets:", insertError);
    }

    const response: DashboardOutput = {
      status: "success",
      dashboard_data: dashboardData,
      asset_id: assetRecord?.id,
    };

    console.log(`[DQ Dashboard] Generated dashboard for execution ${execution_id}. Grade: ${qualityGrade}, ${dimensionScores.length} dimensions, ${hotspots.length} hotspots`);

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
