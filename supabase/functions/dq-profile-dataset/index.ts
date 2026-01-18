import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
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
  median_value?: number | null;
  std_dev?: number | null;
  mode_value?: string | number | null;
  sample_values: (string | number | null)[];
}

interface DimensionScore {
  dimension: string;
  score: number;
  weight: number;
  details: Record<string, number>;
}

interface ProfilingOutput {
  status: "success" | "error";
  code?: string;
  message?: string;
  detail?: string;
  profiling_run_id?: string;
  dataset_id?: string;
  row_count?: number;
  column_count?: number;
  column_profiles?: ColumnProfile[];
  dimension_scores?: DimensionScore[];
  profile_ts?: string;
  execution_time_ms?: number;
}

// Helper functions
function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr: number[], mean: number): number | null {
  if (arr.length < 2) return null;
  const squareDiffs = arr.map((value) => Math.pow(value - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

function mode(arr: (string | number)[]): string | number | null {
  if (arr.length === 0) return null;
  const frequency: Record<string, number> = {};
  let maxFreq = 0;
  let modeVal: string | number | null = null;

  for (const val of arr) {
    const key = String(val);
    frequency[key] = (frequency[key] || 0) + 1;
    if (frequency[key] > maxFreq) {
      maxFreq = frequency[key];
      modeVal = val;
    }
  }
  return modeVal;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { dataset_id, dataset_version } = body;

    // Validate input
    if (!dataset_id) {
      const response: ProfilingOutput = {
        status: "error",
        code: "MISSING_DATASET_ID",
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

    // Verify dataset exists
    const { data: dataset, error: datasetError } = await supabase
      .from("datasets")
      .select("id, name")
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

    // Check for data in dq_data (the single pipeline table)
    const { count: dqDataCount, error: countError } = await supabase
      .from("dq_data")
      .select("id", { count: 'exact', head: true })
      .eq("dataset_id", dataset_id);

    if (countError) {
      const response: ProfilingOutput = {
        status: "error",
        code: "DATA_ACCESS_FAILED",
        message: "Failed to access data",
        detail: countError.message,
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dqDataCount || dqDataCount === 0) {
      const response: ProfilingOutput = {
        status: "error",
        code: "NO_DATA",
        message: "No data to profile. Upload data first.",
        dataset_id,
        row_count: 0,
        column_count: 0,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get data for profiling (sample for large datasets)
    const { data: dqData } = await supabase
      .from("dq_data")
      .select("raw_data")
      .eq("dataset_id", dataset_id)
      .limit(1000);

    const columnProfiles: ColumnProfile[] = [];
    const rowCount = dqData!.length;
    let hasDatetimeColumns = false;

    // Get all column names from first row
    const firstRow = dqData![0]?.raw_data as Record<string, unknown>;
    if (!firstRow) {
      const response: ProfilingOutput = {
        status: "error",
        code: "INVALID_DATA",
        message: "Data rows have no content",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const columnNames = Object.keys(firstRow);

    // Profile each column
    for (const colName of columnNames) {
      const values: (string | number | null)[] = [];
      let nullCount = 0;
      const numericValues: number[] = [];
      let inferredType = "string";

      for (const row of dqData!) {
        const data = row.raw_data as Record<string, unknown>;
        const value = data?.[colName];

        if (value === null || value === undefined || value === "") {
          nullCount++;
          values.push(null);
        } else {
          const strValue = String(value);
          values.push(strValue);

          // Try to infer type
          const numVal = parseFloat(strValue);
          if (!isNaN(numVal)) {
            numericValues.push(numVal);
            inferredType = "number";
          }

          // Check for datetime
          if (strValue.match(/^\d{4}-\d{2}-\d{2}/) || strValue.match(/^\d{2}\/\d{2}\/\d{4}/)) {
            inferredType = "datetime";
            hasDatetimeColumns = true;
          }
        }
      }

      const nonNullValues = values.filter((v) => v !== null) as (string | number)[];
      const distinctValues = new Set(nonNullValues);
      const completeness = ((rowCount - nullCount) / rowCount) * 100;
      const uniqueness = nonNullValues.length > 0 ? (distinctValues.size / nonNullValues.length) * 100 : 0;

      const profile: ColumnProfile = {
        column_name: colName,
        dtype: inferredType,
        completeness: Math.round(completeness * 100) / 100,
        uniqueness: Math.round(uniqueness * 100) / 100,
        null_count: nullCount,
        distinct_count: distinctValues.size,
        sample_values: nonNullValues.slice(0, 5),
      };

      // Add numeric statistics
      if (numericValues.length > 0) {
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const mean = sum / numericValues.length;
        profile.min_value = Math.min(...numericValues);
        profile.max_value = Math.max(...numericValues);
        profile.mean_value = Math.round(mean * 100) / 100;
        profile.median_value = median(numericValues);
        profile.std_dev = stdDev(numericValues, mean);
        profile.mode_value = mode(numericValues);
      }

      columnProfiles.push(profile);
    }

    // Compute dimension scores
    const dimensionScores: DimensionScore[] = [];

    // Completeness
    const avgCompleteness = columnProfiles.reduce((sum, p) => sum + p.completeness, 0) / columnProfiles.length;
    dimensionScores.push({
      dimension: "COMPLETENESS",
      score: Math.round(avgCompleteness * 100) / 100,
      weight: 0.25,
      details: Object.fromEntries(columnProfiles.map((p) => [p.column_name, p.completeness])),
    });

    // Uniqueness
    const avgUniqueness = columnProfiles.reduce((sum, p) => sum + p.uniqueness, 0) / columnProfiles.length;
    dimensionScores.push({
      dimension: "UNIQUENESS",
      score: Math.round(avgUniqueness * 100) / 100,
      weight: 0.20,
      details: Object.fromEntries(columnProfiles.map((p) => [p.column_name, p.uniqueness])),
    });

    // Validity (based on type inference success)
    const validityScore = columnProfiles.filter((p) => p.dtype !== "string" || p.completeness > 80).length / columnProfiles.length * 100;
    dimensionScores.push({
      dimension: "VALIDITY",
      score: Math.round(validityScore * 100) / 100,
      weight: 0.30,
      details: {},
    });

    // Timeliness (if datetime columns exist)
    if (hasDatetimeColumns) {
      dimensionScores.push({
        dimension: "TIMELINESS",
        score: 85, // Placeholder - would need actual freshness check
        weight: 0.25,
        details: {},
      });
    }

    const executionTime = Date.now() - startTime;
    const profileTs = new Date().toISOString();

    // Store profile
    const { data: profile, error: insertError } = await supabase
      .from("dq_profiles")
      .insert({
        dataset_id,
        dataset_version: dataset_version || "1.0",
        row_count: rowCount,
        column_profiles: columnProfiles,
        profile_ts: profileTs,
        execution_time_ms: executionTime,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[DQ Profile] Failed to store profile:", insertError);
    }

    console.log(`[DQ Profile] Complete. ${columnProfiles.length} columns, ${rowCount} rows, ${executionTime}ms`);

    const response: ProfilingOutput = {
      status: "success",
      profiling_run_id: profile?.id,
      dataset_id,
      row_count: rowCount,
      column_count: columnProfiles.length,
      column_profiles: columnProfiles,
      dimension_scores: dimensionScores,
      profile_ts: profileTs,
      execution_time_ms: executionTime,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DQ Profile] Unexpected error:", error);
    const response: ProfilingOutput = {
      status: "error",
      code: "INTERNAL_ERROR",
      message: "Profiling failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
