import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version',
};

interface ProfileColumn {
  column_name: string;
  data_type: string;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  min_value?: number;
  max_value?: number;
  mean_value?: number;
  std_dev?: number;
  top_values?: Array<{ value: string; count: number }>;
}

interface Anomaly {
  column_name: string;
  anomaly_type: 'outlier' | 'distribution_shift' | 'null_spike' | 'pattern_break' | 'schema_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_value: Record<string, unknown>;
  expected_range: Record<string, unknown>;
  description: string;
}

function detectOutliers(column: ProfileColumn, previousColumn?: ProfileColumn): Anomaly | null {
  if (!column.mean_value || !column.std_dev || column.std_dev === 0) return null;
  if (!previousColumn?.mean_value || !previousColumn?.std_dev) return null;

  // Check if mean has shifted significantly (> 3 standard deviations)
  const zScore = Math.abs(column.mean_value - previousColumn.mean_value) / previousColumn.std_dev;
  
  if (zScore > 3) {
    return {
      column_name: column.column_name,
      anomaly_type: 'outlier',
      severity: zScore > 5 ? 'critical' : zScore > 4 ? 'high' : 'medium',
      detected_value: { mean: column.mean_value, std_dev: column.std_dev },
      expected_range: { 
        mean: previousColumn.mean_value, 
        std_dev: previousColumn.std_dev,
        expected_range: [
          previousColumn.mean_value - 3 * previousColumn.std_dev,
          previousColumn.mean_value + 3 * previousColumn.std_dev
        ]
      },
      description: `Mean value shifted by ${zScore.toFixed(2)} standard deviations (${previousColumn.mean_value.toFixed(2)} → ${column.mean_value.toFixed(2)})`
    };
  }

  return null;
}

function detectNullSpike(column: ProfileColumn, previousColumn?: ProfileColumn): Anomaly | null {
  if (!previousColumn) return null;

  const nullIncrease = column.null_percentage - previousColumn.null_percentage;
  
  // Alert if null percentage increased by more than 10 percentage points
  if (nullIncrease > 10) {
    return {
      column_name: column.column_name,
      anomaly_type: 'null_spike',
      severity: nullIncrease > 30 ? 'critical' : nullIncrease > 20 ? 'high' : 'medium',
      detected_value: { null_percentage: column.null_percentage, null_count: column.null_count },
      expected_range: { 
        null_percentage: previousColumn.null_percentage,
        max_expected: previousColumn.null_percentage + 5
      },
      description: `Null percentage spiked from ${previousColumn.null_percentage.toFixed(1)}% to ${column.null_percentage.toFixed(1)}%`
    };
  }

  return null;
}

function detectDistributionShift(column: ProfileColumn, previousColumn?: ProfileColumn): Anomaly | null {
  if (!previousColumn || !column.top_values || !previousColumn.top_values) return null;
  if (column.top_values.length === 0 || previousColumn.top_values.length === 0) return null;

  // Compare top values - if the dominant value changed significantly
  const currentTop = column.top_values[0];
  const previousTop = previousColumn.top_values[0];

  if (currentTop.value !== previousTop.value) {
    return {
      column_name: column.column_name,
      anomaly_type: 'distribution_shift',
      severity: 'medium',
      detected_value: { top_value: currentTop.value, count: currentTop.count },
      expected_range: { top_value: previousTop.value, count: previousTop.count },
      description: `Top value changed from "${previousTop.value}" to "${currentTop.value}"`
    };
  }

  return null;
}

function detectSchemaChange(column: ProfileColumn, previousColumn?: ProfileColumn): Anomaly | null {
  if (!previousColumn) return null;

  if (column.data_type !== previousColumn.data_type) {
    return {
      column_name: column.column_name,
      anomaly_type: 'schema_change',
      severity: 'high',
      detected_value: { data_type: column.data_type },
      expected_range: { data_type: previousColumn.data_type },
      description: `Data type changed from ${previousColumn.data_type} to ${column.data_type}`
    };
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { dataset_id, profile_id } = await req.json();

    if (!dataset_id) {
      return new Response(
        JSON.stringify({ error: "dataset_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[dq-detect-anomalies] Analyzing dataset ${dataset_id}`);

    // Get current profile
    let currentProfileQuery = supabase
      .from('dq_profiles')
      .select('*')
      .eq('dataset_id', dataset_id)
      .order('profile_ts', { ascending: false })
      .limit(1);

    if (profile_id) {
      currentProfileQuery = supabase
        .from('dq_profiles')
        .select('*')
        .eq('id', profile_id);
    }

    const { data: currentProfileData, error: currentError } = await currentProfileQuery.single();

    if (currentError || !currentProfileData) {
      return new Response(
        JSON.stringify({ error: "No profile found for dataset" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get previous profile for comparison
    const { data: previousProfileData } = await supabase
      .from('dq_profiles')
      .select('*')
      .eq('dataset_id', dataset_id)
      .lt('profile_ts', currentProfileData.profile_ts)
      .order('profile_ts', { ascending: false })
      .limit(1)
      .single();

    const currentColumns: ProfileColumn[] = (currentProfileData.column_stats as ProfileColumn[]) || [];
    const previousColumns: ProfileColumn[] = previousProfileData 
      ? (previousProfileData.column_stats as ProfileColumn[]) || []
      : [];

    const previousColumnMap = new Map(previousColumns.map(c => [c.column_name, c]));

    const anomalies: Anomaly[] = [];

    for (const column of currentColumns) {
      const previousColumn = previousColumnMap.get(column.column_name);

      // Run all detection methods
      const outlier = detectOutliers(column, previousColumn);
      if (outlier) anomalies.push(outlier);

      const nullSpike = detectNullSpike(column, previousColumn);
      if (nullSpike) anomalies.push(nullSpike);

      const distributionShift = detectDistributionShift(column, previousColumn);
      if (distributionShift) anomalies.push(distributionShift);

      const schemaChange = detectSchemaChange(column, previousColumn);
      if (schemaChange) anomalies.push(schemaChange);
    }

    // Check for new columns (potential schema change)
    const currentColumnNames = new Set(currentColumns.map(c => c.column_name));
    const previousColumnNames = new Set(previousColumns.map(c => c.column_name));

    for (const prevName of previousColumnNames) {
      if (!currentColumnNames.has(prevName)) {
        anomalies.push({
          column_name: prevName,
          anomaly_type: 'schema_change',
          severity: 'high',
          detected_value: { exists: false },
          expected_range: { exists: true },
          description: `Column "${prevName}" was removed from the dataset`
        });
      }
    }

    for (const currName of currentColumnNames) {
      if (previousColumnNames.size > 0 && !previousColumnNames.has(currName)) {
        anomalies.push({
          column_name: currName,
          anomaly_type: 'schema_change',
          severity: 'medium',
          detected_value: { exists: true },
          expected_range: { exists: false },
          description: `New column "${currName}" was added to the dataset`
        });
      }
    }

    console.log(`[dq-detect-anomalies] Detected ${anomalies.length} anomalies`);

    // Insert anomalies into database
    if (anomalies.length > 0) {
      const anomalyRecords = anomalies.map(a => ({
        dataset_id,
        column_name: a.column_name,
        anomaly_type: a.anomaly_type,
        severity: a.severity,
        detected_value: a.detected_value,
        expected_range: a.expected_range,
        description: a.description,
        detected_at: new Date().toISOString(),
        status: 'open'
      }));

      const { error: insertError } = await supabase
        .from('dataset_anomalies')
        .insert(anomalyRecords);

      if (insertError) {
        console.error('[dq-detect-anomalies] Error inserting anomalies:', insertError);
      }

      // Create incidents for critical anomalies
      const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
      if (criticalAnomalies.length > 0) {
        const incidentRecords = criticalAnomalies.map(a => ({
          title: `Critical Data Anomaly: ${a.anomaly_type} in ${a.column_name}`,
          description: a.description,
          incident_type: 'data_anomaly',
          severity: 'critical' as const,
          status: 'open' as const
        }));

        await supabase.from('incidents').insert(incidentRecords);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dataset_id,
        profile_id: currentProfileData.id,
        anomalies_detected: anomalies.length,
        anomalies,
        has_baseline: !!previousProfileData,
        message: anomalies.length > 0 
          ? `Detected ${anomalies.length} anomalies (${anomalies.filter(a => a.severity === 'critical').length} critical)`
          : 'No anomalies detected'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[dq-detect-anomalies] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
