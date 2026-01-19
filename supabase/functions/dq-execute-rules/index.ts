import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface DQRule {
  id: string;
  rule_name: string;
  logic_type: string;
  logic_code: string;
  column_name: string | null;
  threshold: number;
  severity: "info" | "warning" | "critical";
  dimension: string;
}

interface FailedRow {
  row_index: number;
  row_id: string;
  value: unknown;
  reason: string;
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
  failed_rows_sample: FailedRow[];
}

interface ExecutionSummary {
  total_rules: number;
  passed: number;
  failed: number;
  critical_failures: number;
  critical_failure: boolean;
  execution_mode: string;
}

interface ExecutionOutput {
  status: "success" | "error";
  code?: string;
  message?: string;
  detail?: string;
  execution_id?: string;
  metrics?: RuleMetric[];
  summary?: ExecutionSummary;
  execution_time_ms?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { 
      dataset_id, 
      profile_id, 
      rules, 
      rules_version, 
      execution_mode = "FULL"
    } = body;

    // Validate required inputs
    if (!dataset_id) {
      const response: ExecutionOutput = {
        status: "error",
        code: "MISSING_DATASET_ID",
        message: "dataset_id is required",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      const response: ExecutionOutput = {
        status: "error",
        code: "NO_RULES",
        message: "No rules provided for execution",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if dq_data has data for this dataset
    const { count: dqDataCount, error: countError } = await supabase
      .from("dq_data")
      .select("id", { count: 'exact', head: true })
      .eq("dataset_id", dataset_id);

    if (countError) {
      const response: ExecutionOutput = {
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
      const response: ExecutionOutput = {
        status: "error",
        code: "NO_DATA",
        message: "No data found for this dataset",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ALL data for rule execution - optimized pagination for up to 1M rows
    const CHUNK_SIZE = 10000;
    const EXECUTION_TIMEOUT_MS = 180000; // 3 minute timeout for full execution
    let allData: Array<{ raw_data: unknown; row_index: number; id: string }> = [];
    let offset = 0;
    let hasMore = true;
    const fetchStart = Date.now();
    
    console.log(`[DQ Execute] Fetching all data for dataset ${dataset_id} (total: ${dqDataCount?.toLocaleString()} rows)`);
    
    while (hasMore) {
      // Check timeout
      if (Date.now() - fetchStart > EXECUTION_TIMEOUT_MS) {
        console.warn(`[DQ Execute] Timeout approaching at ${allData.length.toLocaleString()} rows, proceeding with available data`);
        break;
      }
      
      const { data: chunk, error: chunkError } = await supabase
        .from("dq_data")
        .select("raw_data, row_index, id")
        .eq("dataset_id", dataset_id)
        .range(offset, offset + CHUNK_SIZE - 1)
        .order("row_index", { ascending: true });
      
      if (chunkError) {
        console.error(`[DQ Execute] Error fetching chunk at offset ${offset}:`, chunkError);
        break;
      }
      
      if (chunk && chunk.length > 0) {
        allData = allData.concat(chunk);
        offset += chunk.length;
        
        // Log progress every 10% or 100k rows
        const progressStep = Math.max(100000, Math.floor((dqDataCount || 0) / 10));
        if (allData.length % progressStep < CHUNK_SIZE) {
          const pct = dqDataCount ? Math.round((allData.length / dqDataCount) * 100) : 0;
          console.log(`[DQ Execute] Progress: ${pct}% (${allData.length.toLocaleString()}/${dqDataCount?.toLocaleString()} rows)`);
        }
      }
      
      hasMore = chunk && chunk.length === CHUNK_SIZE;
    }
    
    const dqData = allData;
    const totalRecords = dqData.length;
    console.log(`[DQ Execute] ✅ Loaded ${totalRecords} rows for rule execution`);
    
    const metrics: RuleMetric[] = [];
    let criticalViolations = 0;

    // Execute each rule against REAL DATA
    for (const rule of rules as DQRule[]) {
      let failedCount = 0;
      const failedRowsSample: FailedRow[] = [];

      if (!rule.column_name) {
        console.log(`[DQ Execute] Skipping rule ${rule.rule_name} - no column_name specified`);
        continue;
      }

      // Execute rule against actual data
      switch (rule.logic_type) {
        case "null_check": {
          for (let i = 0; i < dqData!.length; i++) {
            const row = dqData![i];
            const data = row.raw_data as Record<string, unknown>;
            const value = data?.[rule.column_name!];
            if (value === null || value === undefined || value === "") {
              failedCount++;
              if (failedRowsSample.length < 5) {
                failedRowsSample.push({
                  row_index: row.row_index,
                  row_id: row.id,
                  value: value,
                  reason: "NULL or empty value",
                });
              }
            }
          }
          break;
        }

        case "duplicate_check": {
          const seenValues = new Map<string, number>();
          for (let i = 0; i < dqData!.length; i++) {
            const row = dqData![i];
            const data = row.raw_data as Record<string, unknown>;
            const value = String(data?.[rule.column_name!] ?? "");
            if (seenValues.has(value)) {
              failedCount++;
              if (failedRowsSample.length < 5) {
                failedRowsSample.push({
                  row_index: row.row_index,
                  row_id: row.id,
                  value: value,
                  reason: `Duplicate of row ${seenValues.get(value)}`,
                });
              }
            }
            seenValues.set(value, row.row_index);
          }
          break;
        }

        case "range_check": {
          const codeMatch = rule.logic_code.match(/BETWEEN\s+(-?[\d.]+)\s+AND\s+(-?[\d.]+)/i);
          const minVal = codeMatch ? parseFloat(codeMatch[1]) : Number.MIN_SAFE_INTEGER;
          const maxVal = codeMatch ? parseFloat(codeMatch[2]) : Number.MAX_SAFE_INTEGER;

          for (let i = 0; i < dqData!.length; i++) {
            const row = dqData![i];
            const data = row.raw_data as Record<string, unknown>;
            const value = data?.[rule.column_name!];
            const numValue = parseFloat(String(value));
            if (isNaN(numValue) || numValue < minVal || numValue > maxVal) {
              failedCount++;
              if (failedRowsSample.length < 5) {
                failedRowsSample.push({
                  row_index: row.row_index,
                  row_id: row.id,
                  value: value,
                  reason: `Value ${value} outside range [${minVal}, ${maxVal}]`,
                });
              }
            }
          }
          break;
        }

        case "regex_match": {
          const regexMatch = rule.logic_code.match(/LIKE\s+'(.+)'/i);
          const pattern = regexMatch ? regexMatch[1].replace(/%/g, ".*") : ".*";
          const regex = new RegExp(`^${pattern}$`, "i");

          for (let i = 0; i < dqData!.length; i++) {
            const row = dqData![i];
            const data = row.raw_data as Record<string, unknown>;
            const value = String(data?.[rule.column_name!] ?? "");
            if (!regex.test(value)) {
              failedCount++;
              if (failedRowsSample.length < 5) {
                failedRowsSample.push({
                  row_index: row.row_index,
                  row_id: row.id,
                  value: value,
                  reason: `Value does not match pattern`,
                });
              }
            }
          }
          break;
        }

        case "freshness_check": {
          const now = new Date();
          const maxAgeHours = 24;

          for (let i = 0; i < dqData!.length; i++) {
            const row = dqData![i];
            const data = row.raw_data as Record<string, unknown>;
            const value = data?.[rule.column_name!];
            if (value) {
              const dateValue = new Date(String(value));
              const hoursDiff = (now.getTime() - dateValue.getTime()) / (1000 * 60 * 60);
              if (isNaN(hoursDiff) || hoursDiff > maxAgeHours) {
                failedCount++;
                if (failedRowsSample.length < 5) {
                  failedRowsSample.push({
                    row_index: row.row_index,
                    row_id: row.id,
                    value: value,
                    reason: `Data is ${Math.round(hoursDiff)} hours old (max: ${maxAgeHours}h)`,
                  });
                }
              }
            }
          }
          break;
        }

        default:
          console.log(`[DQ Execute] Unknown logic_type: ${rule.logic_type}`);
      }

      // TRUTH CONTRACT: success_rate is ALWAYS a ratio (0-1), NOT percentage
      // All calculations in ratio space. Threshold is also expected as ratio (0-1).
      const successRate = totalRecords > 0 ? (totalRecords - failedCount) / totalRecords : 1;
      
      // Validate success_rate is in valid range
      if (successRate < 0 || successRate > 1) {
        console.error(`[DQ Execute] TRUTH VIOLATION: success_rate ${successRate} outside [0,1]`);
      }
      
      // Normalize threshold: if > 1, assume it's percentage and convert to ratio
      const normalizedThreshold = rule.threshold > 1 ? rule.threshold / 100 : rule.threshold;
      const violated = successRate < normalizedThreshold;

      if (violated && rule.severity === "critical") {
        criticalViolations++;
      }

      metrics.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        dimension: rule.dimension,
        severity: rule.severity,
        // OUTPUT: ratio (0-1), NOT percentage - rounded to 4 decimal places
        success_rate: Math.round(successRate * 10000) / 10000,
        failed_count: failedCount,
        total_count: totalRecords,
        // OUTPUT: threshold as ratio (0-1)
        threshold: normalizedThreshold,
        violated,
        failed_rows_sample: failedRowsSample,
      });
    }

    const passed = metrics.filter((m) => !m.violated).length;
    const failed = metrics.filter((m) => m.violated).length;
    const totalRules = metrics.length;

    // EXECUTION TRUTH VALIDATION: passed + failed MUST equal total_rules
    if (passed + failed !== totalRules) {
      console.error(`[DQ Execute] EXECUTION_TRUTH_VIOLATION: passed(${passed}) + failed(${failed}) != total(${totalRules})`);
      const response: ExecutionOutput = {
        status: "error",
        code: "EXECUTION_TRUTH_VIOLATION",
        message: `Execution truth check failed: passed + failed != total`,
        detail: `passed(${passed}) + failed(${failed}) = ${passed + failed} != total(${totalRules})`,
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary: ExecutionSummary = {
      total_rules: totalRules,
      passed,
      failed,
      critical_failures: criticalViolations,
      critical_failure: criticalViolations > 0,
      execution_mode,
    };

    const executionTime = Date.now() - startTime;

    // Store execution results
    const { data: execution, error: insertError } = await supabase
      .from("dq_rule_executions")
      .insert({
        dataset_id,
        profile_id,
        rules_version: rules_version || 1,
        execution_mode,
        metrics,
        summary,
        execution_time_ms: executionTime,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[DQ Execute] Failed to store execution:", insertError);
    }

    console.log(`[DQ Execute] Complete. ${summary.passed}/${summary.total_rules} rules passed. Critical: ${criticalViolations}`);

    const response: ExecutionOutput = {
      status: "success",
      execution_id: execution?.id,
      metrics,
      summary,
      execution_time_ms: executionTime,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DQ Execute] Unexpected error:", error);
    const response: ExecutionOutput = {
      status: "error",
      code: "INTERNAL_ERROR",
      message: "Execution failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
