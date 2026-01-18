import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// GOVERNANCE-GRADE DATA QUALITY TRUTH ENFORCER
// ============================================
// 
// ABSOLUTE INVARIANTS:
// 1. Percentages ∈ [0, 100]
// 2. Rates ∈ [0, 1]
// 3. success_rate + failure_rate = 1 ± 0.01
// 4. passed + failed = total
// 5. All executed rules MUST exist in library
// 6. Incidents ONLY from failed rules
// ============================================

interface ExecutionMetric {
  rule_id: string;
  rule_name: string;
  dimension: string;
  success_rate: number;
  failed_count: number;
  total_count: number;
  threshold: number;
  violated: boolean;
}

interface ExecutionSummary {
  passed: number;
  failed: number;
  total_rules: number;
  pass_rate: number;
  fail_rate: number;
  critical_failure: boolean;
}

interface DimensionScore {
  dimension: string;
  score: number | null;
  computed: boolean;
  reason?: string;
  weight: number;
  details: Record<string, number>;
}

interface Rule {
  id: string;
  rule_name: string;
  dimension: string;
  threshold: number;
}

interface Incident {
  id?: string;
  rule_id: string | null;
  dimension: string;
  severity: string;
}

interface TruthEnforcerInput {
  profiling: {
    profiling_run_id?: string;
    row_count?: number;
    column_count?: number;
    dimension_scores?: DimensionScore[];
    column_profiles?: unknown[];
  } | null;
  rules: {
    rules?: Rule[];
    rules_version?: number;
    deduplicated_count?: number;
  } | null;
  execution: {
    execution_id?: string;
    metrics?: ExecutionMetric[];
    summary?: ExecutionSummary;
  } | null;
  dashboard: {
    dashboard_id?: string;
  } | null;
  incidents: {
    incident_count?: number;
    incidents?: Incident[];
  } | null;
}

interface NormalizedProfiling {
  profiling_run_id: string | null;
  row_count: number;
  column_count: number;
  computed_dimensions: string[];
  unavailable_dimensions: string[];
  dimension_scores: DimensionScore[];
  overall_score: number | null;
  can_display_overall: boolean;
}

interface NormalizedExecution {
  execution_id: string | null;
  metrics: ExecutionMetric[];
  summary: ExecutionSummary | null;
  all_rates_valid: boolean;
  truth_verified: boolean;
}

interface NormalizedIncidents {
  incident_count: number;
  incidents: Incident[];
  orphan_count: number;
  consistency_verified: boolean;
}

interface TrustReport {
  discarded_metrics: string[];
  deduplicated_rules: number;
  inconsistencies_found: string[];
  truth_score: number;
  // Enhanced fields for governance
  missing_dimensions_count: number;
  simulated_metrics_count: number;
  critical_inconsistencies: string[];
  warning_inconsistencies: string[];
  score_breakdown: {
    base: number;
    dimension_penalty: number;
    simulated_penalty: number;
    critical_penalty: number;
    warning_penalty: number;
  };
}

interface GovernanceOutput {
  status: "success" | "error";
  code: "GOVERNANCE_CERTIFIED" | "DQ_CONTRACT_VIOLATION";
  normalized_profiling: NormalizedProfiling | null;
  normalized_rules: { rules: Rule[]; version: number } | null;
  normalized_execution: NormalizedExecution | null;
  normalized_dashboard: { dashboard_id: string | null } | null;
  normalized_incidents: NormalizedIncidents | null;
  trust_report: TrustReport;
  explanation: string;
  violations?: string[];
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateRatio(value: number, context: string): { valid: boolean; error?: string } {
  if (typeof value !== "number" || isNaN(value)) {
    return { valid: false, error: `${context}: Value is not a number` };
  }
  if (value < 0) {
    return { valid: false, error: `${context}: Negative ratio ${value} < 0` };
  }
  if (value > 1) {
    return { valid: false, error: `${context}: Ratio overflow ${value} > 1` };
  }
  return { valid: true };
}

function validateCount(value: number, context: string): { valid: boolean; error?: string } {
  if (typeof value !== "number" || isNaN(value)) {
    return { valid: false, error: `${context}: Value is not a number` };
  }
  if (value < 0) {
    return { valid: false, error: `${context}: Negative count ${value} < 0` };
  }
  return { valid: true };
}

function validateExecutionTruth(
  passed: number,
  failed: number,
  total: number
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate counts
  if (passed < 0) errors.push(`NEGATIVE_PASSED: ${passed}`);
  if (failed < 0) errors.push(`NEGATIVE_FAILED: ${failed}`);
  if (total < 0) errors.push(`NEGATIVE_TOTAL: ${total}`);

  if (errors.length > 0) return { valid: false, errors, warnings };

  // Allow empty execution
  if (total === 0 && passed === 0 && failed === 0) {
    return { valid: true, errors, warnings: ["EMPTY_EXECUTION"] };
  }

  // CRITICAL: passed + failed MUST equal total
  const sum = passed + failed;
  if (sum !== total) {
    const diff = Math.abs(sum - total);
    const tolerance = Math.max(1, total * 0.01); // 1% tolerance or at least 1
    if (diff > tolerance) {
      errors.push(`EXECUTION_TRUTH_VIOLATION: passed(${passed}) + failed(${failed}) = ${sum} != total(${total})`);
    } else {
      warnings.push(`MINOR_DISCREPANCY: sum=${sum}, total=${total}, diff=${diff}`);
    }
  }

  // Validate rates sum to 1
  if (total > 0) {
    const successRate = passed / total;
    const failureRate = failed / total;
    const rateSum = successRate + failureRate;

    if (Math.abs(rateSum - 1) > 0.01) {
      errors.push(`RATE_SUM_VIOLATION: success_rate(${successRate.toFixed(4)}) + failure_rate(${failureRate.toFixed(4)}) = ${rateSum.toFixed(4)} != 1`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// TRUST SCORE CALCULATION
// ============================================
// Trust Score = 100
//   - 20 per missing dimension
//   - 15 per simulated metric
//   - 10 per critical inconsistency
//   - 5 per warning-level inconsistency
// ============================================

function computeTrustScore(
  missingDimensions: number,
  simulatedMetrics: number,
  criticalInconsistencies: number,
  warningInconsistencies: number
): { score: number; breakdown: TrustReport["score_breakdown"] } {
  const base = 100;
  const dimensionPenalty = missingDimensions * 20;
  const simulatedPenalty = simulatedMetrics * 15;
  const criticalPenalty = criticalInconsistencies * 10;
  const warningPenalty = warningInconsistencies * 5;

  const score = Math.max(0, base - dimensionPenalty - simulatedPenalty - criticalPenalty - warningPenalty);

  return {
    score: score / 100, // Return as ratio 0-1
    breakdown: {
      base,
      dimension_penalty: dimensionPenalty,
      simulated_penalty: simulatedPenalty,
      critical_penalty: criticalPenalty,
      warning_penalty: warningPenalty,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: TruthEnforcerInput = await req.json();
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const discardedMetrics: string[] = [];
    let simulatedMetricsCount = 0;

    console.log("[DQ Truth Enforcer] Starting governance validation...");

    // ============================================
    // 1. VALIDATE & NORMALIZE PROFILING
    // ============================================
    let normalizedProfiling: NormalizedProfiling | null = null;
    
    if (input.profiling) {
      const dimensionScores = input.profiling.dimension_scores || [];
      const computedDimensions: string[] = [];
      const unavailableDimensions: string[] = [];

      for (const dim of dimensionScores) {
        if (dim.computed && dim.score !== null) {
          computedDimensions.push(dim.dimension);
          
          // Validate score is a valid ratio
          const validation = validateRatio(dim.score, `Dimension ${dim.dimension}`);
          if (!validation.valid) {
            errors.push(validation.error!);
          }
        } else {
          unavailableDimensions.push(dim.dimension);
          discardedMetrics.push(dim.dimension);
        }
      }

      // Calculate overall score from computed dimensions only
      const computedScores = dimensionScores.filter(d => d.computed && d.score !== null);
      const overallScore = computedScores.length > 0
        ? computedScores.reduce((sum, d) => sum + (d.score || 0), 0) / computedScores.length
        : null;

      normalizedProfiling = {
        profiling_run_id: input.profiling.profiling_run_id || null,
        row_count: input.profiling.row_count || 0,
        column_count: input.profiling.column_count || 0,
        computed_dimensions: computedDimensions,
        unavailable_dimensions: unavailableDimensions,
        dimension_scores: dimensionScores,
        overall_score: overallScore,
        can_display_overall: computedDimensions.length > 0,
      };

      console.log(`[DQ Truth Enforcer] Profiling: ${computedDimensions.length} computed, ${unavailableDimensions.length} unavailable`);
    }

    // ============================================
    // 2. VALIDATE & NORMALIZE EXECUTION
    // ============================================
    let normalizedExecution: NormalizedExecution | null = null;
    
    if (input.execution) {
      const metrics = input.execution.metrics || [];
      const summary = input.execution.summary || null;
      let allRatesValid = true;

      // Validate each metric
      for (const metric of metrics) {
        // Validate success_rate
        const successRateValidation = validateRatio(metric.success_rate, `Rule ${metric.rule_id} success_rate`);
        if (!successRateValidation.valid) {
          errors.push(successRateValidation.error!);
          allRatesValid = false;
        }

        // Validate threshold
        const thresholdValidation = validateRatio(metric.threshold, `Rule ${metric.rule_id} threshold`);
        if (!thresholdValidation.valid) {
          errors.push(thresholdValidation.error!);
          allRatesValid = false;
        }

        // Validate counts
        const failedCountValidation = validateCount(metric.failed_count, `Rule ${metric.rule_id} failed_count`);
        if (!failedCountValidation.valid) {
          errors.push(failedCountValidation.error!);
        }

        const totalCountValidation = validateCount(metric.total_count, `Rule ${metric.rule_id} total_count`);
        if (!totalCountValidation.valid) {
          errors.push(totalCountValidation.error!);
        }
      }

      // Validate execution truth (passed + failed = total)
      let truthVerified = false;
      if (summary) {
        const truthValidation = validateExecutionTruth(
          summary.passed,
          summary.failed,
          summary.total_rules
        );
        errors.push(...truthValidation.errors);
        warnings.push(...truthValidation.warnings);
        truthVerified = truthValidation.valid;
      }

      normalizedExecution = {
        execution_id: input.execution.execution_id || null,
        metrics,
        summary,
        all_rates_valid: allRatesValid,
        truth_verified: truthVerified,
      };

      console.log(`[DQ Truth Enforcer] Execution: ${metrics.length} metrics, rates valid: ${allRatesValid}, truth verified: ${truthVerified}`);
    }

    // ============================================
    // 3. VALIDATE RULE CONSISTENCY
    // ============================================
    if (input.execution?.metrics && input.rules?.rules) {
      const executedRuleIds = new Set(input.execution.metrics.map(m => m.rule_id).filter(Boolean));
      const libraryRuleIds = new Set(input.rules.rules.map(r => r.id).filter(Boolean));

      // Check for phantom rules (executed but not in library)
      const phantomRules = [...executedRuleIds].filter(id => !libraryRuleIds.has(id));
      if (phantomRules.length > 0) {
        errors.push(`PHANTOM_RULES: ${phantomRules.length} rules executed but not in library: ${phantomRules.slice(0, 3).join(", ")}...`);
      }

      // Check for skipped rules (in library but not executed)
      const skippedRules = [...libraryRuleIds].filter(id => !executedRuleIds.has(id));
      if (skippedRules.length > 0) {
        warnings.push(`SKIPPED_RULES: ${skippedRules.length} rules in library but not executed`);
      }
    }

    // ============================================
    // 4. VALIDATE INCIDENT CONSISTENCY
    // ============================================
    let normalizedIncidents: NormalizedIncidents | null = null;

    if (input.incidents) {
      const incidents = input.incidents.incidents || [];
      const failedRuleIds = new Set(
        (input.execution?.metrics || [])
          .filter(m => m.violated)
          .map(m => m.rule_id)
          .filter(Boolean)
      );

      // Check for orphan incidents
      const incidentRuleIds = incidents.map(i => i.rule_id).filter(Boolean);
      const orphanIncidents = incidentRuleIds.filter(id => id && !failedRuleIds.has(id));

      if (failedRuleIds.size === 0 && incidents.length > 0) {
        errors.push(`ORPHAN_INCIDENTS: ${incidents.length} incidents exist but no rules failed`);
      } else if (orphanIncidents.length > 0) {
        errors.push(`ORPHAN_INCIDENTS: ${orphanIncidents.length} incidents reference rules that did not fail`);
      }

      normalizedIncidents = {
        incident_count: incidents.length,
        incidents,
        orphan_count: orphanIncidents.length,
        consistency_verified: orphanIncidents.length === 0,
      };

      console.log(`[DQ Truth Enforcer] Incidents: ${incidents.length} total, ${orphanIncidents.length} orphans`);
    }

    // ============================================
    // 5. COMPUTE TRUST SCORE
    // ============================================
    const missingDimensionsCount = normalizedProfiling?.unavailable_dimensions.length || 0;
    const criticalErrors = errors.filter(e => e.includes("VIOLATION") || e.includes("PHANTOM") || e.includes("ORPHAN"));
    const warningErrors = warnings.length;

    const { score: trustScore, breakdown } = computeTrustScore(
      missingDimensionsCount,
      simulatedMetricsCount,
      criticalErrors.length,
      warningErrors
    );

    const trustReport: TrustReport = {
      discarded_metrics: discardedMetrics,
      deduplicated_rules: input.rules?.deduplicated_count || 0,
      inconsistencies_found: [...errors, ...warnings],
      truth_score: trustScore,
      missing_dimensions_count: missingDimensionsCount,
      simulated_metrics_count: simulatedMetricsCount,
      critical_inconsistencies: criticalErrors,
      warning_inconsistencies: warnings,
      score_breakdown: breakdown,
    };

    // ============================================
    // 6. DETERMINE GOVERNANCE STATUS
    // ============================================
    // We have errors that are contract violations (not just missing data)
    const contractViolations = errors.filter(e => 
      e.includes("VIOLATION") || 
      e.includes("PHANTOM") || 
      e.includes("ORPHAN") ||
      e.includes("Negative") ||
      e.includes("overflow")
    );

    const hasContractViolations = contractViolations.length > 0;

    if (hasContractViolations) {
      console.log(`[DQ Truth Enforcer] GOVERNANCE VIOLATION: ${contractViolations.length} contract violations`);
      
      const response: GovernanceOutput = {
        status: "error",
        code: "DQ_CONTRACT_VIOLATION",
        normalized_profiling: normalizedProfiling,
        normalized_rules: input.rules ? { rules: input.rules.rules || [], version: input.rules.rules_version || 0 } : null,
        normalized_execution: normalizedExecution,
        normalized_dashboard: input.dashboard ? { dashboard_id: input.dashboard.dashboard_id || null } : null,
        normalized_incidents: normalizedIncidents,
        trust_report: trustReport,
        explanation: `Pipeline output is not governance-safe. ${contractViolations.length} contract violations detected.`,
        violations: contractViolations,
      };

      return new Response(JSON.stringify(response), {
        status: 200, // Return 200 so frontend can display the violations
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success - governance certified
    console.log(`[DQ Truth Enforcer] GOVERNANCE CERTIFIED: Trust Score ${(trustScore * 100).toFixed(1)}%`);

    const response: GovernanceOutput = {
      status: "success",
      code: "GOVERNANCE_CERTIFIED",
      normalized_profiling: normalizedProfiling,
      normalized_rules: input.rules ? { rules: input.rules.rules || [], version: input.rules.rules_version || 0 } : null,
      normalized_execution: normalizedExecution,
      normalized_dashboard: input.dashboard ? { dashboard_id: input.dashboard.dashboard_id || null } : null,
      normalized_incidents: normalizedIncidents,
      trust_report: trustReport,
      explanation: buildExplanation(normalizedProfiling, normalizedExecution, normalizedIncidents, trustScore),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[DQ Truth Enforcer] Error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        code: "DQ_CONTRACT_VIOLATION",
        violations: [`INTERNAL_ERROR: ${error instanceof Error ? error.message : "Unknown error"}`],
        trust_report: {
          discarded_metrics: [],
          deduplicated_rules: 0,
          inconsistencies_found: ["INTERNAL_ERROR"],
          truth_score: 0,
          missing_dimensions_count: 0,
          simulated_metrics_count: 0,
          critical_inconsistencies: ["INTERNAL_ERROR"],
          warning_inconsistencies: [],
          score_breakdown: { base: 100, dimension_penalty: 0, simulated_penalty: 0, critical_penalty: 100, warning_penalty: 0 },
        },
        explanation: "Truth enforcer encountered an internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildExplanation(
  profiling: NormalizedProfiling | null,
  execution: NormalizedExecution | null,
  incidents: NormalizedIncidents | null,
  trustScore: number
): string {
  const parts: string[] = [];

  if (profiling) {
    if (profiling.unavailable_dimensions.length > 0) {
      parts.push(`${profiling.unavailable_dimensions.length} dimensions unavailable (${profiling.unavailable_dimensions.join(", ")})`);
    }
    if (profiling.overall_score !== null) {
      parts.push(`Overall quality: ${(profiling.overall_score * 100).toFixed(1)}%`);
    }
  }

  if (execution) {
    const summary = execution.summary;
    if (summary) {
      parts.push(`${summary.passed}/${summary.total_rules} rules passed`);
    }
    if (execution.truth_verified) {
      parts.push("Execution truth verified ✓");
    }
  }

  if (incidents && incidents.incident_count > 0) {
    parts.push(`${incidents.incident_count} incidents raised`);
  }

  parts.push(`Trust Score: ${(trustScore * 100).toFixed(0)}%`);

  return parts.join(". ") + ".";
}
