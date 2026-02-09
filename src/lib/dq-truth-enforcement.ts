/**
 * Data Quality Truth Enforcement Agent
 * 
 * ABSOLUTE RULES:
 * - Any percentage MUST be in range [0, 100]
 * - Any rate/ratio MUST be in range [0, 1]
 * - Any value > 100 MUST be rejected unless explicitly a count
 * - Any negative metric MUST be rejected
 * - success_rate + failure_rate MUST equal 1 ± 0.01
 */

// ============================================
// UNIT DETECTION & VALIDATION
// ============================================

export type UnitType = 'ratio' | 'percentage' | 'count' | 'invalid';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface NumericValidation {
  value: number;
  unit: UnitType;
  normalized: number; // Always in ratio (0-1)
  valid: boolean;
  error?: string;
}

/**
 * Detect if a value is a ratio (0-1), percentage (0-100), or count
 * RULE: Values between 0 and 1 (inclusive) are ratios
 * RULE: Values between 1 and 100 (inclusive) could be percentages
 * RULE: Values > 100 are counts (if integers) or INVALID
 */
export function detectUnit(value: number): UnitType {
  if (value < 0) return 'invalid';
  if (value >= 0 && value <= 1) return 'ratio';
  if (value > 1 && value <= 100) return 'percentage';
  if (value > 100 && Number.isInteger(value)) return 'count';
  return 'invalid';
}

/**
 * Normalize any metric to ratio (0-1) space
 * ALL calculations MUST happen in ratio space
 */
export function normalizeToRatio(value: number, detectedUnit?: UnitType): number {
  const unit = detectedUnit || detectUnit(value);
  
  switch (unit) {
    case 'ratio':
      return value;
    case 'percentage':
      return value / 100;
    case 'count':
      // Counts cannot be normalized - return as-is but flag for context
      return value;
    case 'invalid':
    default:
      return NaN;
  }
}

/**
 * Convert ratio (0-1) to percentage (0-100) for DISPLAY ONLY
 */
export function ratioToPercent(ratio: number): number {
  if (ratio < 0 || ratio > 1) {
    console.error(`[TRUTH VIOLATION] Ratio ${ratio} outside valid range [0,1]`);
    return NaN;
  }
  return ratio * 100;
}

/**
 * Format a ratio as a percentage string for display
 */
export function formatAsPercentage(ratio: number, decimals = 1): string {
  const percent = ratioToPercent(ratio);
  if (isNaN(percent)) return 'INVALID';
  return `${percent.toFixed(decimals)}%`;
}

// ============================================
// NUMERIC SAFETY VALIDATION
// ============================================

/**
 * Validate that a percentage is in [0, 100]
 */
export function validatePercentage(value: number): ValidationResult {
  if (value < 0) {
    return { valid: false, error: `NEGATIVE_PERCENTAGE: ${value} < 0` };
  }
  if (value > 100) {
    return { valid: false, error: `PERCENTAGE_OVERFLOW: ${value} > 100` };
  }
  return { valid: true };
}

/**
 * Validate that a ratio is in [0, 1]
 */
export function validateRatio(value: number): ValidationResult {
  if (value < 0) {
    return { valid: false, error: `NEGATIVE_RATIO: ${value} < 0` };
  }
  if (value > 1) {
    return { valid: false, error: `RATIO_OVERFLOW: ${value} > 1` };
  }
  return { valid: true };
}

/**
 * Validate that a count is non-negative integer
 */
export function validateCount(value: number): ValidationResult {
  if (value < 0) {
    return { valid: false, error: `NEGATIVE_COUNT: ${value} < 0` };
  }
  if (!Number.isInteger(value)) {
    return { valid: false, error: `NON_INTEGER_COUNT: ${value}` };
  }
  return { valid: true };
}

/**
 * Validate numeric value based on its expected type
 */
export function validateNumericRange(
  value: number, 
  type: 'percentage' | 'ratio' | 'count'
): ValidationResult {
  switch (type) {
    case 'percentage':
      return validatePercentage(value);
    case 'ratio':
      return validateRatio(value);
    case 'count':
      return validateCount(value);
    default:
      return { valid: false, error: `UNKNOWN_TYPE: ${type}` };
  }
}

// ============================================
// EXECUTION TRUTH VALIDATION
// ============================================

/**
 * CRITICAL: Validate that passed + failed = total (within tolerance)
 * success_rate + failure_rate MUST equal 1 ± 0.01
 */
export function validateExecutionTruth(
  passed: number, 
  failed: number, 
  total: number
): ValidationResult {
  const warnings: string[] = [];
  
  // Validate counts are non-negative
  if (passed < 0) return { valid: false, error: `NEGATIVE_PASSED_COUNT: ${passed}` };
  if (failed < 0) return { valid: false, error: `NEGATIVE_FAILED_COUNT: ${failed}` };
  if (total < 0) return { valid: false, error: `NEGATIVE_TOTAL_COUNT: ${total}` };
  
  // Validate total is not zero if we have results
  if (total === 0 && (passed > 0 || failed > 0)) {
    return { valid: false, error: `ZERO_TOTAL_WITH_RESULTS: passed=${passed}, failed=${failed}` };
  }
  
  // Allow empty execution
  if (total === 0 && passed === 0 && failed === 0) {
    return { valid: true, warnings: ['EMPTY_EXECUTION'] };
  }
  
  // CRITICAL CHECK: passed + failed MUST equal total
  const sum = passed + failed;
  if (sum !== total) {
    const diff = Math.abs(sum - total);
    const tolerance = total * 0.01; // 1% tolerance
    if (diff > tolerance) {
      return { 
        valid: false, 
        error: `EXECUTION_TRUTH_VIOLATION: passed(${passed}) + failed(${failed}) = ${sum} != total(${total})` 
      };
    }
    warnings.push(`MINOR_DISCREPANCY: sum=${sum}, total=${total}, diff=${diff}`);
  }
  
  // Validate rates sum to 1
  const successRate = passed / total;
  const failureRate = failed / total;
  const rateSum = successRate + failureRate;
  
  if (Math.abs(rateSum - 1) > 0.01) {
    return { 
      valid: false, 
      error: `RATE_SUM_VIOLATION: success_rate(${successRate}) + failure_rate(${failureRate}) = ${rateSum} != 1` 
    };
  }
  
  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

// ============================================
// RULE CONSISTENCY VALIDATION
// ============================================

export interface RuleConsistencyResult extends ValidationResult {
  missingInLibrary: string[];
  missingInExecution: string[];
  executedRulesCount: number;
  libraryRulesCount: number;
}

/**
 * Validate that executed rules exist in rule library
 * RULE: execution.rules MUST exist in rules.library
 */
export function validateRuleConsistency(
  executedRuleIds: string[], 
  libraryRuleIds: string[]
): RuleConsistencyResult {
  const executedSet = new Set(executedRuleIds);
  const librarySet = new Set(libraryRuleIds);
  
  const missingInLibrary = executedRuleIds.filter(id => !librarySet.has(id));
  const missingInExecution = libraryRuleIds.filter(id => !executedSet.has(id));
  
  const warnings: string[] = [];
  
  // ERROR: Rules executed but not in library (phantom rules)
  if (missingInLibrary.length > 0) {
    return {
      valid: false,
      error: `PHANTOM_RULES: ${missingInLibrary.length} rules executed but not in library`,
      missingInLibrary,
      missingInExecution,
      executedRulesCount: executedRuleIds.length,
      libraryRulesCount: libraryRuleIds.length,
    };
  }
  
  // WARNING: Rules in library but not executed
  if (missingInExecution.length > 0) {
    warnings.push(`SKIPPED_RULES: ${missingInExecution.length} rules in library but not executed`);
  }
  
  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    missingInLibrary,
    missingInExecution,
    executedRulesCount: executedRuleIds.length,
    libraryRulesCount: libraryRuleIds.length,
  };
}

// ============================================
// INCIDENT CONSISTENCY VALIDATION
// ============================================

export interface IncidentConsistencyResult extends ValidationResult {
  orphanIncidents: string[];
  incidentsWithoutFailedRules: number;
}

/**
 * Validate that incidents only come from failed rules
 * RULE: If no failed rules → incidents MUST be empty
 */
export function validateIncidentConsistency(
  incidentRuleIds: string[],
  failedRuleIds: string[]
): IncidentConsistencyResult {
  const failedSet = new Set(failedRuleIds);
  const orphanIncidents = incidentRuleIds.filter(id => !failedSet.has(id));
  
  // If no failed rules, there should be no incidents
  if (failedRuleIds.length === 0 && incidentRuleIds.length > 0) {
    return {
      valid: false,
      error: `ORPHAN_INCIDENTS: ${incidentRuleIds.length} incidents exist but no rules failed`,
      orphanIncidents: incidentRuleIds,
      incidentsWithoutFailedRules: incidentRuleIds.length,
    };
  }
  
  // Check for incidents referencing non-failed rules
  if (orphanIncidents.length > 0) {
    return {
      valid: false,
      error: `ORPHAN_INCIDENTS: ${orphanIncidents.length} incidents reference rules that did not fail`,
      orphanIncidents,
      incidentsWithoutFailedRules: orphanIncidents.length,
    };
  }
  
  return {
    valid: true,
    orphanIncidents: [],
    incidentsWithoutFailedRules: 0,
  };
}

// ============================================
// METRIC NORMALIZATION FOR DISPLAY
// ============================================

export interface NormalizedMetric {
  raw: number;
  unit: UnitType;
  ratio: number;  // Normalized to 0-1
  percent: number; // For display only (0-100)
  displayValue: string;
  valid: boolean;
  error?: string;
}

/**
 * Normalize a rate/percentage metric and validate it
 */
export function normalizeRateMetric(value: number): NormalizedMetric {
  const unit = detectUnit(value);
  
  if (unit === 'invalid') {
    return {
      raw: value,
      unit,
      ratio: NaN,
      percent: NaN,
      displayValue: 'INVALID',
      valid: false,
      error: `INVALID_RATE: ${value}`,
    };
  }
  
  if (unit === 'count') {
    return {
      raw: value,
      unit,
      ratio: NaN,
      percent: NaN,
      displayValue: 'NOT_A_RATE',
      valid: false,
      error: `COUNT_AS_RATE: ${value} appears to be a count, not a rate`,
    };
  }
  
  const ratio = normalizeToRatio(value, unit);
  const validationResult = validateRatio(ratio);
  
  if (!validationResult.valid) {
    return {
      raw: value,
      unit,
      ratio,
      percent: ratio * 100,
      displayValue: 'INVALID',
      valid: false,
      error: validationResult.error,
    };
  }
  
  return {
    raw: value,
    unit,
    ratio,
    percent: ratio * 100,
    displayValue: formatAsPercentage(ratio),
    valid: true,
  };
}

// ============================================
// AGGREGATE VALIDATION
// ============================================

export interface TruthEnforcementReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  numericValidation: {
    percentagesChecked: number;
    ratiosChecked: number;
    countsChecked: number;
    failures: number;
  };
  executionTruth: ValidationResult | null;
  ruleConsistency: RuleConsistencyResult | null;
  incidentConsistency: IncidentConsistencyResult | null;
  truthScore: number; // 0-1, 1.0 = perfect
}

/**
 * Compute truth score based on validation results
 * 1.0 = perfect, degrades for each issue
 */
export function computeTruthScore(report: Partial<TruthEnforcementReport>): number {
  let score = 1.0;
  
  // Degrade for errors
  const errorCount = report.errors?.length || 0;
  score -= errorCount * 0.15; // Each error costs 15%
  
  // Degrade for warnings
  const warningCount = report.warnings?.length || 0;
  score -= warningCount * 0.05; // Each warning costs 5%
  
  // Degrade for numeric validation failures
  const numericFailures = report.numericValidation?.failures || 0;
  score -= numericFailures * 0.10; // Each numeric failure costs 10%
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Master validation function that runs all checks
 */
export function enforceDataQualityTruth(data: {
  metrics?: Array<{
    rule_id: string;
    success_rate: number;
    failed_count: number;
    total_count: number;
    threshold: number;
    violated: boolean;
  }>;
  executionSummary?: {
    passed: number;
    failed: number;
    total_rules: number;
  };
  libraryRuleIds?: string[];
  incidentRuleIds?: string[];
}): TruthEnforcementReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  let percentagesChecked = 0;
  let ratiosChecked = 0;
  let countsChecked = 0;
  const numericFailures = 0;
  
  // Validate all metrics
  if (data.metrics) {
    for (const metric of data.metrics) {
      // Validate success_rate as ratio
      const successRateNorm = normalizeRateMetric(metric.success_rate);
      ratiosChecked++;
      if (!successRateNorm.valid) {
        errors.push(`Rule ${metric.rule_id}: ${successRateNorm.error}`);
        numericFailures++;
      }
      
      // Validate threshold as ratio
      const thresholdNorm = normalizeRateMetric(metric.threshold);
      ratiosChecked++;
      if (!thresholdNorm.valid) {
        errors.push(`Rule ${metric.rule_id} threshold: ${thresholdNorm.error}`);
        numericFailures++;
      }
      
      // Validate counts
      const failedCountResult = validateCount(metric.failed_count);
      countsChecked++;
      if (!failedCountResult.valid) {
        errors.push(`Rule ${metric.rule_id} failed_count: ${failedCountResult.error}`);
        numericFailures++;
      }
      
      const totalCountResult = validateCount(metric.total_count);
      countsChecked++;
      if (!totalCountResult.valid) {
        errors.push(`Rule ${metric.rule_id} total_count: ${totalCountResult.error}`);
        numericFailures++;
      }
    }
  }
  
  // Validate execution truth
  let executionTruth: ValidationResult | null = null;
  if (data.executionSummary) {
    executionTruth = validateExecutionTruth(
      data.executionSummary.passed,
      data.executionSummary.failed,
      data.executionSummary.total_rules
    );
    if (!executionTruth.valid && executionTruth.error) {
      errors.push(executionTruth.error);
    }
    if (executionTruth.warnings) {
      warnings.push(...executionTruth.warnings);
    }
  }
  
  // Validate rule consistency
  let ruleConsistency: RuleConsistencyResult | null = null;
  if (data.metrics && data.libraryRuleIds) {
    const executedRuleIds = data.metrics.map(m => m.rule_id);
    ruleConsistency = validateRuleConsistency(executedRuleIds, data.libraryRuleIds);
    if (!ruleConsistency.valid && ruleConsistency.error) {
      errors.push(ruleConsistency.error);
    }
    if (ruleConsistency.warnings) {
      warnings.push(...ruleConsistency.warnings);
    }
  }
  
  // Validate incident consistency
  let incidentConsistency: IncidentConsistencyResult | null = null;
  if (data.metrics && data.incidentRuleIds) {
    const failedRuleIds = data.metrics.filter(m => m.violated).map(m => m.rule_id);
    incidentConsistency = validateIncidentConsistency(data.incidentRuleIds, failedRuleIds);
    if (!incidentConsistency.valid && incidentConsistency.error) {
      errors.push(incidentConsistency.error);
    }
  }
  
  const report: TruthEnforcementReport = {
    valid: errors.length === 0,
    errors,
    warnings,
    numericValidation: {
      percentagesChecked,
      ratiosChecked,
      countsChecked,
      failures: numericFailures,
    },
    executionTruth,
    ruleConsistency,
    incidentConsistency,
    truthScore: 0,
  };
  
  report.truthScore = computeTruthScore(report);
  
  return report;
}
