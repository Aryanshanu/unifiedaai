import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ColumnProfile {
  column_name: string;
  dtype: string;
  completeness: number;
  uniqueness: number;
  null_count: number;
  distinct_count: number;
  min_value?: string | number | null;
  max_value?: string | number | null;
  mean_value?: number | null;
}

// TRUTH CONTRACT: Use 'id' property (matches database column name)
interface DQRule {
  id: string;
  version: number;
  dimension: "completeness" | "validity" | "accuracy" | "uniqueness" | "timeliness" | "consistency";
  rule_name: string;
  logic_type: string;
  logic_code: string;
  column_name: string | null;
  threshold: number;
  severity: "info" | "warning" | "critical";
  confidence: number;
  business_impact: string;
  calibration_metadata: Record<string, unknown>;
}

interface RulesOutput {
  status: "success" | "error";
  rules_version?: number;
  rules?: DQRule[];
  profiling_run_id?: string;
  deduplicated_count?: number;
  code?: string;
  message?: string;
  detail?: string;
}

// TRUTH CONTRACT: Clamp value to valid ratio range [0, 1]
function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// Auto-calibrate threshold based on observed data
function calibrateThreshold(observedValue: number, dimension: string): number {
  // TRUTH CONTRACT: Normalize observed value if it's a percentage
  const normalizedObs = observedValue > 1 ? observedValue / 100 : observedValue;
  
  // Set thresholds slightly below observed to catch degradation
  const buffer = 0.05; // 5% buffer
  
  let threshold: number;
  switch (dimension) {
    case "completeness":
      // Expect at least 95% of observed completeness
      threshold = Math.max(0.7, normalizedObs - buffer);
      break;
    case "uniqueness":
      // For unique columns, expect high uniqueness
      if (normalizedObs > 0.99) threshold = 0.99;
      else if (normalizedObs > 0.9) threshold = 0.9;
      else threshold = Math.max(0.5, normalizedObs - buffer);
      break;
    case "validity":
      threshold = Math.max(0.8, normalizedObs - buffer);
      break;
    default:
      threshold = Math.max(0.7, normalizedObs - buffer);
  }
  
  // TRUTH CONTRACT: Always return clamped ratio
  return clampRatio(threshold);
}

// Determine severity based on column name and dimension
function determineSeverity(columnName: string, dimension: string, threshold: number): "info" | "warning" | "critical" {
  const criticalColumns = ["id", "user_id", "email", "ssn", "account", "transaction"];
  const isCritical = criticalColumns.some((c) => columnName.toLowerCase().includes(c));
  
  if (isCritical && threshold > 0.9) return "critical";
  if (dimension === "completeness" && threshold > 0.95) return "critical";
  if (dimension === "uniqueness" && threshold > 0.99) return "critical";
  if (threshold > 0.85) return "warning";
  return "info";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profiling_output } = await req.json();

    if (!profiling_output || !profiling_output.column_profiles) {
      const response: RulesOutput = {
        status: "error",
        code: "INVALID_PROFILING_INPUT",
        message: "profiling_output with column_profiles is required",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const columnProfiles: ColumnProfile[] = profiling_output.column_profiles;
    const candidateRules: DQRule[] = [];
    
    // Get current max version for this dataset
    const { data: existingRules } = await supabase
      .from("dq_rules")
      .select("version, column_name, dimension, logic_type")
      .eq("dataset_id", profiling_output.dataset_id)
      .eq("is_active", true);

    const newVersion = (existingRules?.[0]?.version || 0) + 1;

    // ============================================
    // TRUTH CONTRACT: Deduplicate rules by (column, dimension, logic_type)
    // ============================================
    const existingRuleKeys = new Set(
      (existingRules || []).map(r => `${r.column_name}_${r.dimension}_${r.logic_type}`)
    );
    let deduplicatedCount = 0;

    // Generate rules for each column
    for (const col of columnProfiles) {
      // Rule 1: Completeness check for every column
      const completenessKey = `${col.column_name}_completeness_null_check`;
      if (!existingRuleKeys.has(completenessKey)) {
        const completenessThreshold = calibrateThreshold(col.completeness, "completeness");
        const completenessRule: DQRule = {
          id: crypto.randomUUID(),
          version: newVersion,
          dimension: "completeness",
          rule_name: `${col.column_name}_completeness`,
          logic_type: "null_check",
          logic_code: `SELECT COUNT(*) as failed FROM data WHERE ${col.column_name} IS NULL OR ${col.column_name} = ''`,
          column_name: col.column_name,
          threshold: completenessThreshold,
          severity: determineSeverity(col.column_name, "completeness", completenessThreshold),
          confidence: clampRatio(0.95),
          business_impact: `Missing ${col.column_name} values may cause downstream processing failures`,
          calibration_metadata: {
            observed_completeness: col.completeness,
            observed_null_count: col.null_count,
            profiling_run_id: profiling_output.profiling_run_id,
          },
        };
        candidateRules.push(completenessRule);
        existingRuleKeys.add(completenessKey);
      } else {
        deduplicatedCount++;
      }

      // Rule 2: Uniqueness check for ID-like columns
      if (col.uniqueness > 0.95 || col.column_name.toLowerCase().includes("id")) {
        const uniquenessKey = `${col.column_name}_uniqueness_duplicate_check`;
        if (!existingRuleKeys.has(uniquenessKey)) {
          const uniquenessThreshold = calibrateThreshold(col.uniqueness, "uniqueness");
          const uniquenessRule: DQRule = {
            id: crypto.randomUUID(),
            version: newVersion,
            dimension: "uniqueness",
            rule_name: `${col.column_name}_uniqueness`,
            logic_type: "duplicate_check",
            logic_code: `SELECT ${col.column_name}, COUNT(*) FROM data GROUP BY ${col.column_name} HAVING COUNT(*) > 1`,
            column_name: col.column_name,
            threshold: uniquenessThreshold,
            severity: determineSeverity(col.column_name, "uniqueness", uniquenessThreshold),
            confidence: clampRatio(0.9),
            business_impact: `Duplicate ${col.column_name} values may indicate data integrity issues`,
            calibration_metadata: {
              observed_uniqueness: col.uniqueness,
              distinct_count: col.distinct_count,
              profiling_run_id: profiling_output.profiling_run_id,
            },
          };
          candidateRules.push(uniquenessRule);
          existingRuleKeys.add(uniquenessKey);
        } else {
          deduplicatedCount++;
        }
      }

      // Rule 3: Validity check for specific data types
      if (col.dtype === "integer" || col.dtype === "float") {
        const validityKey = `${col.column_name}_validity_range_check`;
        if (!existingRuleKeys.has(validityKey)) {
          const validityRule: DQRule = {
            id: crypto.randomUUID(),
            version: newVersion,
            dimension: "validity",
            rule_name: `${col.column_name}_numeric_validity`,
            logic_type: "range_check",
            logic_code: `SELECT COUNT(*) as failed FROM data WHERE ${col.column_name} < ${col.min_value ?? 0} OR ${col.column_name} > ${col.max_value ?? 999999}`,
            column_name: col.column_name,
            threshold: clampRatio(0.95),
            severity: "warning",
            confidence: clampRatio(0.85),
            business_impact: `Out-of-range ${col.column_name} values may indicate data entry errors`,
            calibration_metadata: {
              observed_min: col.min_value,
              observed_max: col.max_value,
              observed_mean: col.mean_value,
              profiling_run_id: profiling_output.profiling_run_id,
            },
          };
          candidateRules.push(validityRule);
          existingRuleKeys.add(validityKey);
        } else {
          deduplicatedCount++;
        }
      }

      // Rule 4: Email validity check
      if (col.column_name.toLowerCase().includes("email")) {
        const emailKey = `${col.column_name}_validity_regex_match`;
        if (!existingRuleKeys.has(emailKey)) {
          const emailRule: DQRule = {
            id: crypto.randomUUID(),
            version: newVersion,
            dimension: "validity",
            rule_name: `${col.column_name}_email_format`,
            logic_type: "regex_match",
            logic_code: `SELECT COUNT(*) as failed FROM data WHERE ${col.column_name} !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`,
            column_name: col.column_name,
            threshold: clampRatio(0.98),
            severity: "critical",
            confidence: clampRatio(0.95),
            business_impact: "Invalid email addresses will cause notification failures",
            calibration_metadata: {
              profiling_run_id: profiling_output.profiling_run_id,
            },
          };
          candidateRules.push(emailRule);
          existingRuleKeys.add(emailKey);
        } else {
          deduplicatedCount++;
        }
      }

      // Rule 5: Date/timestamp timeliness check
      if (col.dtype === "datetime" || col.column_name.toLowerCase().includes("_at")) {
        const timelinessKey = `${col.column_name}_timeliness_freshness_check`;
        if (!existingRuleKeys.has(timelinessKey)) {
          const timelinessRule: DQRule = {
            id: crypto.randomUUID(),
            version: newVersion,
            dimension: "timeliness",
            rule_name: `${col.column_name}_freshness`,
            logic_type: "freshness_check",
            logic_code: `SELECT COUNT(*) as failed FROM data WHERE ${col.column_name} < NOW() - INTERVAL '30 days'`,
            column_name: col.column_name,
            threshold: clampRatio(0.8),
            severity: "info",
            confidence: clampRatio(0.7),
            business_impact: `Stale ${col.column_name} records may need review`,
            calibration_metadata: {
              profiling_run_id: profiling_output.profiling_run_id,
            },
          };
          candidateRules.push(timelinessRule);
          existingRuleKeys.add(timelinessKey);
        } else {
          deduplicatedCount++;
        }
      }
    }

    // Store rules in database (only new ones)
    if (candidateRules.length > 0) {
      const rulesToInsert = candidateRules.map((rule) => ({
        id: rule.id,
        dataset_id: profiling_output.dataset_id,
        profile_id: profiling_output.profiling_run_id,
        version: rule.version,
        dimension: rule.dimension,
        rule_name: rule.rule_name,
        logic_type: rule.logic_type,
        logic_code: rule.logic_code,
        column_name: rule.column_name,
        threshold: clampRatio(rule.threshold),  // Ensure clamped before insert
        severity: rule.severity,
        confidence: clampRatio(rule.confidence),  // Ensure clamped before insert
        business_impact: rule.business_impact,
        is_active: true,
        calibration_metadata: rule.calibration_metadata,
      }));

      const { error: insertError } = await supabase
        .from("dq_rules")
        .insert(rulesToInsert);

      if (insertError) {
        console.error("Failed to store rules:", insertError);
      }
    }

    const response: RulesOutput = {
      status: "success",
      rules_version: newVersion,
      rules: candidateRules,
      profiling_run_id: profiling_output.profiling_run_id,
      deduplicated_count: deduplicatedCount,
    };

    console.log(`[DQ Rules] Generated ${candidateRules.length} rules (${deduplicatedCount} deduplicated), version ${newVersion}`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DQ Rules] Error:", error);
    const response: RulesOutput = {
      status: "error",
      code: "RULE_GENERATION_FAILED",
      message: "Failed to generate rules",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
