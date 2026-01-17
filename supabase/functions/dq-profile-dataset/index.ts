import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ColumnProfile {
  column_name: string;
  dtype: string;
  total_count: number;
  null_count: number;
  null_percentage: number;
  distinct_count: number;
  uniqueness: number;
  completeness: number;
  validity: number;
  min_value?: string | number | null;
  max_value?: string | number | null;
  mean_value?: number | null;
  median_value?: number | null;
  std_dev?: number | null;
  mode_value?: string | number | null;
  min_length?: number | null;
  max_length?: number | null;
  sample_values: (string | number | null)[];
  frequency_distribution?: { value: string | number; count: number; percentage: number }[];
  status: 'complete' | 'issues' | 'critical';
}

// ALLOWED DIMENSIONS ONLY - Computable from bronze_data alone
// Timeliness: Only computed when datetime columns exist
// FORBIDDEN: Consistency (requires cross-system), Accuracy (requires ground truth)
interface DimensionScore {
  dimension: 'COMPLETENESS' | 'UNIQUENESS' | 'VALIDITY' | 'TIMELINESS';
  score: number;
  rules_count: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  computed: boolean; // TRUE = real data, FALSE = not computed
  formula: string; // Shows how the score was calculated
}

interface ProfilingIssue {
  column: string;
  issue_type: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  affected_rows: number;
}

interface ProfilingOutput {
  status: "success" | "error";
  profiling_run_id?: string;
  dataset_id?: string;
  dataset_version?: string | null;
  row_count?: number;
  column_count?: number;
  column_profiles?: ColumnProfile[];
  dimension_scores?: DimensionScore[];
  issues?: ProfilingIssue[];
  profile_ts?: string;
  execution_time_ms?: number;
  data_source?: 'bronze_data';
  code?: string;
  message?: string;
  detail?: string;
}

// Helper to compute median
function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Helper to compute standard deviation
function stdDev(arr: number[], mean: number): number | null {
  if (arr.length < 2) return null;
  const squaredDiffs = arr.map(val => Math.pow(val - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

// Helper to compute mode
function mode(arr: (string | number)[]): string | number | null {
  if (arr.length === 0) return null;
  const counts = new Map<string | number, number>();
  let maxCount = 0;
  let modeValue: string | number = arr[0];
  
  for (const val of arr) {
    const count = (counts.get(val) || 0) + 1;
    counts.set(val, count);
    if (count > maxCount) {
      maxCount = count;
      modeValue = val;
    }
  }
  return modeValue;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { dataset_id, dataset_version } = await req.json();

    if (!dataset_id) {
      const response: ProfilingOutput = {
        status: "error",
        code: "INVALID_PROFILING_INPUT",
        message: "dataset_id is required",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get dataset info
    const { data: dataset, error: datasetError } = await supabase
      .from("datasets")
      .select("*")
      .eq("id", dataset_id)
      .single();

    if (datasetError || !dataset) {
      const response: ProfilingOutput = {
        status: "error",
        code: "DATASET_NOT_FOUND",
        message: "Dataset not found",
        detail: datasetError?.message,
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🚨 HALT CONDITION #1: Check if bronze_data has ANY rows
    const { count: bronzeCount, error: countError } = await supabase
      .from("bronze_data")
      .select("id", { count: 'exact', head: true });

    if (countError) {
      const response: ProfilingOutput = {
        status: "error",
        code: "DATA_ACCESS_FAILED",
        message: "Failed to access bronze_data table",
        detail: countError.message,
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🚨 HALT CONDITION #2: Empty dataset = STOP
    if (!bronzeCount || bronzeCount === 0) {
      console.log(`[DQ Profile] HALT: No data in bronze_data table. Cannot profile empty dataset.`);
      const response: ProfilingOutput = {
        status: "error",
        code: "EMPTY_DATASET",
        message: "No data to profile. Upload data to bronze_data first.",
        detail: "The pipeline cannot continue without real data. This is a hard stop - no simulated or mock profiling will be performed.",
        dataset_id,
        row_count: 0,
        column_count: 0,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get bronze data for profiling (sample for large datasets)
    const { data: bronzeData } = await supabase
      .from("bronze_data")
      .select("raw_data")
      .limit(1000);

    // At this point we KNOW bronzeData exists and has rows
    const columnProfiles: ColumnProfile[] = [];
    const issues: ProfilingIssue[] = [];
    const rowCount = bronzeData!.length;
    
    // Track which dimensions we can actually compute
    let hasDatetimeColumns = false;

    // Extract all column names from first row
    const sampleRow = bronzeData![0]?.raw_data as Record<string, unknown>;
    if (!sampleRow || typeof sampleRow !== "object") {
      const response: ProfilingOutput = {
        status: "error",
        code: "INVALID_DATA_FORMAT",
        message: "bronze_data rows must contain valid raw_data objects",
        detail: "Expected raw_data to be a JSON object with column values.",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const columns = Object.keys(sampleRow);

    for (const col of columns) {
      const values = bronzeData!.map((row) => {
        const data = row.raw_data as Record<string, unknown>;
        return data?.[col];
      });

      const totalCount = values.length;
      const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "");
      const nullCount = totalCount - nonNullValues.length;
      const nullPercentage = (nullCount / totalCount) * 100;
      const uniqueValues = new Set(nonNullValues);
      const distinctCount = uniqueValues.size;
      
      // Infer dtype - improved numeric detection for columns like age, amount, price
      let dtype = "STRING";
      const sampleValue = nonNullValues[0];
      const colLower = col.toLowerCase();
      
      // Check if column name suggests numeric type
      const numericColumnPatterns = ['age', 'amount', 'price', 'cost', 'total', 'count', 'quantity', 'rate', 'score', 'value', 'salary', 'income', 'balance', 'weight', 'height', 'size', 'number', 'num', 'id'];
      const looksNumeric = numericColumnPatterns.some(p => colLower.includes(p));
      
      // Check actual values for numeric content
      const numericValues = nonNullValues.filter((v) => {
        if (typeof v === "number") return true;
        if (typeof v === "string") {
          const parsed = parseFloat(v);
          return !isNaN(parsed) && isFinite(parsed);
        }
        return false;
      });
      const isActuallyNumeric = numericValues.length > nonNullValues.length * 0.8;
      
      if (typeof sampleValue === "number" || (looksNumeric && isActuallyNumeric)) {
        // Determine if integer or float
        const allInts = numericValues.every((v) => {
          const n = typeof v === "number" ? v : parseFloat(v as string);
          return Number.isInteger(n);
        });
        dtype = allInts ? "INTEGER" : "FLOAT";
      } else if (typeof sampleValue === "boolean") {
        dtype = "BOOLEAN";
      } else if (sampleValue instanceof Date || (typeof sampleValue === "string" && !isNaN(Date.parse(sampleValue)) && sampleValue.match(/^\d{4}-\d{2}-\d{2}/))) {
        dtype = "DATETIME";
        hasDatetimeColumns = true;
      } else if (typeof sampleValue === "string" && sampleValue.match(/^[a-f0-9-]{36}$/i)) {
        dtype = "UUID";
      }

      // Also check column name patterns for datetime
      if (dtype === "STRING" && (colLower.endsWith("_at") || colLower.endsWith("_date") || colLower.includes("timestamp"))) {
        // Try to parse as date
        const potentialDates = nonNullValues.filter(v => typeof v === "string" && !isNaN(Date.parse(v as string)));
        if (potentialDates.length > nonNullValues.length * 0.8) {
          dtype = "DATETIME";
          hasDatetimeColumns = true;
        }
      }

      // Compute numeric stats if applicable
      let minValue: string | number | null = null;
      let maxValue: string | number | null = null;
      let meanValue: number | null = null;
      let medianValue: number | null = null;
      let stdDevValue: number | null = null;
      let modeValue: string | number | null = null;
      let minLength: number | null = null;
      let maxLength: number | null = null;

      if (dtype === "INTEGER" || dtype === "FLOAT") {
        // Parse all values as numbers (handles string numbers too)
        const numericVals = nonNullValues
          .map((v) => typeof v === "number" ? v : parseFloat(v as string))
          .filter((v) => !isNaN(v) && isFinite(v));
        
        if (numericVals.length > 0) {
          minValue = Math.min(...numericVals);
          maxValue = Math.max(...numericVals);
          meanValue = numericVals.reduce((a, b) => a + b, 0) / numericVals.length;
          medianValue = median(numericVals);
          stdDevValue = stdDev(numericVals, meanValue);
          modeValue = mode(numericVals);
        }
      } else if (dtype === "STRING") {
        const stringValues = nonNullValues.filter((v) => typeof v === "string") as string[];
        if (stringValues.length > 0) {
          const lengths = stringValues.map(s => s.length);
          minLength = Math.min(...lengths);
          maxLength = Math.max(...lengths);
          stringValues.sort();
          minValue = stringValues[0];
          maxValue = stringValues[stringValues.length - 1];
          modeValue = mode(stringValues);
        }
      }

      // Compute frequency distribution (top 10)
      const frequencyMap = new Map<string | number, number>();
      for (const val of nonNullValues) {
        const key = val as string | number;
        frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
      }
      const frequencyDistribution = Array.from(frequencyMap.entries())
        .map(([value, count]) => ({
          value,
          count,
          percentage: (count / nonNullValues.length) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Determine column status
      const completeness = nonNullValues.length / totalCount;
      const uniqueness = distinctCount / Math.max(nonNullValues.length, 1);
      let validity = 1.0; // Default to valid

      // Check for validity issues based on dtype
      if (dtype === "INTEGER" || dtype === "FLOAT") {
        // Use observed min/max for validity check, not hardcoded range
        const outOfRange = nonNullValues.filter(v => typeof v === "number" && (v < -1e9 || v > 1e9)).length;
        validity = 1 - (outOfRange / Math.max(nonNullValues.length, 1));
      }

      let status: 'complete' | 'issues' | 'critical' = 'complete';
      if (nullPercentage > 20 || validity < 0.7) {
        status = 'critical';
      } else if (nullPercentage > 5 || validity < 0.9) {
        status = 'issues';
      }

      // Log issues
      if (nullPercentage > 5) {
        issues.push({
          column: col,
          issue_type: 'MISSING_VALUES',
          severity: nullPercentage > 20 ? 'critical' : 'warning',
          description: `${nullPercentage.toFixed(1)}% of values are null or empty`,
          affected_rows: nullCount,
        });
      }

      if (uniqueness > 0.99 && dtype !== "UUID" && col !== "id") {
        issues.push({
          column: col,
          issue_type: 'POTENTIAL_PRIMARY_KEY',
          severity: 'info',
          description: `High uniqueness (${(uniqueness * 100).toFixed(1)}%) suggests potential primary key`,
          affected_rows: 0,
        });
      }

      columnProfiles.push({
        column_name: col,
        dtype,
        total_count: totalCount,
        null_count: nullCount,
        null_percentage: nullPercentage,
        distinct_count: distinctCount,
        uniqueness,
        completeness,
        validity,
        min_value: minValue,
        max_value: maxValue,
        mean_value: meanValue,
        median_value: medianValue,
        std_dev: stdDevValue,
        mode_value: modeValue,
        min_length: minLength,
        max_length: maxLength,
        sample_values: Array.from(uniqueValues).slice(0, 5) as (string | number | null)[],
        frequency_distribution: frequencyDistribution,
        status,
      });
    }

    // Compute dimension scores - ONLY from real data, ONLY allowed dimensions
    const avgCompleteness = columnProfiles.reduce((sum, c) => sum + c.completeness, 0) / columnProfiles.length;
    const avgUniqueness = columnProfiles.reduce((sum, c) => sum + c.uniqueness, 0) / columnProfiles.length;
    const avgValidity = columnProfiles.reduce((sum, c) => sum + c.validity, 0) / columnProfiles.length;
    
    const getStatus = (score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' => {
      if (score >= 0.95) return 'excellent';
      if (score >= 0.85) return 'good';
      if (score >= 0.70) return 'fair';
      if (score >= 0.50) return 'poor';
      return 'critical';
    };

    // ONLY include dimensions we can ACTUALLY compute
    const dimensionScores: DimensionScore[] = [
      { 
        dimension: 'COMPLETENESS', 
        score: avgCompleteness * 100, 
        rules_count: columnProfiles.length, 
        status: getStatus(avgCompleteness),
        computed: true,
        formula: `AVG(non_null_count / total_count) across ${columnProfiles.length} columns`
      },
      { 
        dimension: 'UNIQUENESS', 
        score: avgUniqueness * 100, 
        rules_count: columnProfiles.length, 
        status: getStatus(avgUniqueness),
        computed: true,
        formula: `AVG(distinct_count / non_null_count) across ${columnProfiles.length} columns`
      },
      { 
        dimension: 'VALIDITY', 
        score: avgValidity * 100, 
        rules_count: columnProfiles.length, 
        status: getStatus(avgValidity),
        computed: true,
        formula: `AVG(valid_count / non_null_count) for numeric columns`
      },
    ];

    // TIMELINESS: Only compute if we have datetime columns
    if (hasDatetimeColumns) {
      const datetimeColumns = columnProfiles.filter(c => c.dtype === 'DATETIME');
      // Compute timeliness as % of records with recent dates (within 30 days)
      let totalFresh = 0;
      let totalChecked = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const col of datetimeColumns) {
        const colName = col.column_name;
        for (const row of bronzeData!) {
          const data = row.raw_data as Record<string, unknown>;
          const value = data?.[colName];
          if (value) {
            totalChecked++;
            const date = new Date(String(value));
            if (date >= thirtyDaysAgo) {
              totalFresh++;
            }
          }
        }
      }

      if (totalChecked > 0) {
        const timelinessScore = totalFresh / totalChecked;
        dimensionScores.push({
          dimension: 'TIMELINESS',
          score: timelinessScore * 100,
          rules_count: datetimeColumns.length,
          status: getStatus(timelinessScore),
          computed: true,
          formula: `${totalFresh}/${totalChecked} datetime values within 30 days`
        });
      }
    }

    // NOTE: CONSISTENCY and ACCURACY are NOT included because:
    // - CONSISTENCY requires cross-system comparison (external data source)
    // - ACCURACY requires ground truth reference data (external data source)
    // These dimensions CANNOT be computed from bronze_data alone.

    const executionTime = Date.now() - startTime;
    const profileTs = new Date().toISOString();

    // Store profiling result
    const { data: profileRecord, error: insertError } = await supabase
      .from("dq_profiles")
      .insert({
        dataset_id,
        dataset_version: dataset_version || null,
        row_count: rowCount,
        column_profiles: columnProfiles,
        profile_ts: profileTs,
        execution_time_ms: executionTime,
        record_hash: null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to store profiling result:", insertError);
    }

    const response: ProfilingOutput = {
      status: "success",
      profiling_run_id: profileRecord?.id || crypto.randomUUID(),
      dataset_id,
      dataset_version: dataset_version || null,
      row_count: rowCount,
      column_count: columnProfiles.length,
      column_profiles: columnProfiles,
      dimension_scores: dimensionScores,
      issues,
      profile_ts: profileTs,
      execution_time_ms: executionTime,
      data_source: 'bronze_data',
    };

    console.log(`[DQ Profile] Profiled ${columnProfiles.length} columns, ${rowCount} rows in ${executionTime}ms. Computed ${dimensionScores.length} dimensions.`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DQ Profile] Error:", error);
    const response: ProfilingOutput = {
      status: "error",
      code: "PROFILING_FAILED",
      message: "Failed to profile dataset",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
