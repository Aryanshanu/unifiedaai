// Data Quality Engine - Governance-Grade DQ Evaluation
// Fractal Unified Governance OS - Phase 1
// Metrics: Completeness, Validity, Uniqueness, Freshness, Distribution Skew, Sensitive Balance

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DataQualityRequest {
  dataset_id: string;
  run_type: 'scheduled' | 'on_demand' | 'pre_training' | 'contract_check';
  sample_data?: Record<string, unknown>[];
  schema_definition?: Record<string, string>;
  freshness_threshold_hours?: number;
  check_contract?: boolean;
}

interface QualityMetrics {
  completeness: number;
  validity: number;
  uniqueness: number;
  freshness: number;
  overall: number;
}

interface DistributionSkew {
  [feature: string]: {
    skewness: number;
    kurtosis: number;
    severity: 'low' | 'medium' | 'high';
  };
}

interface SensitiveBalance {
  [attribute: string]: {
    [group: string]: number;
    balance_ratio: number;
  };
}

// Quality evaluation formulas (Great Expectations compatible)
function computeCompleteness(data: Record<string, unknown>[]): { score: number; details: Record<string, number> } {
  if (!data || data.length === 0) return { score: 0, details: {} };
  
  const columns = Object.keys(data[0]);
  const details: Record<string, number> = {};
  let totalNonNull = 0;
  const totalCells = data.length * columns.length;
  
  for (const col of columns) {
    const nonNullCount = data.filter(row => row[col] !== null && row[col] !== undefined && row[col] !== '').length;
    details[col] = nonNullCount / data.length;
    totalNonNull += nonNullCount;
  }
  
  return {
    score: totalCells > 0 ? totalNonNull / totalCells : 0,
    details
  };
}

function computeValidity(data: Record<string, unknown>[], schema: Record<string, string>): { score: number; details: Record<string, number> } {
  if (!data || data.length === 0) return { score: 0, details: {} };
  
  const details: Record<string, number> = {};
  let totalValid = 0;
  let totalChecked = 0;
  
  for (const [col, expectedType] of Object.entries(schema)) {
    let validCount = 0;
    for (const row of data) {
      const value = row[col];
      if (value === null || value === undefined) continue;
      
      let isValid = false;
      switch (expectedType) {
        case 'string':
          isValid = typeof value === 'string';
          break;
        case 'number':
          isValid = typeof value === 'number' || !isNaN(Number(value));
          break;
        case 'boolean':
          isValid = typeof value === 'boolean' || value === 'true' || value === 'false';
          break;
        case 'date':
          isValid = !isNaN(Date.parse(String(value)));
          break;
        case 'uuid':
          isValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
          break;
        case 'email':
          isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
          break;
        default:
          isValid = true;
      }
      
      if (isValid) validCount++;
      totalChecked++;
    }
    
    details[col] = totalChecked > 0 ? validCount / data.length : 1;
    totalValid += validCount;
  }
  
  return {
    score: totalChecked > 0 ? totalValid / totalChecked : 1,
    details
  };
}

function computeUniqueness(data: Record<string, unknown>[]): { score: number; details: Record<string, number> } {
  if (!data || data.length === 0) return { score: 0, details: {} };
  
  const columns = Object.keys(data[0]);
  const details: Record<string, number> = {};
  let totalUniqueness = 0;
  
  for (const col of columns) {
    const values = data.map(row => JSON.stringify(row[col]));
    const uniqueCount = new Set(values).size;
    details[col] = uniqueCount / data.length;
    totalUniqueness += details[col];
  }
  
  return {
    score: columns.length > 0 ? totalUniqueness / columns.length : 0,
    details
  };
}

function computeFreshness(lastUpdated: string, thresholdHours: number): { score: number; hoursOld: number } {
  const lastUpdate = new Date(lastUpdated);
  const now = new Date();
  const hoursOld = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  
  // Score decreases linearly as data ages beyond threshold
  let score = 1;
  if (hoursOld > thresholdHours) {
    score = Math.max(0, 1 - ((hoursOld - thresholdHours) / thresholdHours));
  }
  
  return { score, hoursOld };
}

function computeDistributionSkew(data: Record<string, unknown>[]): DistributionSkew {
  if (!data || data.length === 0) return {};
  
  const skew: DistributionSkew = {};
  const numericColumns = Object.keys(data[0]).filter(col => {
    const firstValue = data[0][col];
    return typeof firstValue === 'number' || !isNaN(Number(firstValue));
  });
  
  for (const col of numericColumns) {
    const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
    if (values.length < 3) continue;
    
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) continue;
    
    // Compute skewness (Fisher's)
    const skewness = values.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0) / n;
    
    // Compute kurtosis (excess)
    const kurtosis = values.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 4), 0) / n - 3;
    
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (Math.abs(skewness) > 2) severity = 'high';
    else if (Math.abs(skewness) > 1) severity = 'medium';
    
    skew[col] = { skewness, kurtosis, severity };
  }
  
  return skew;
}

function computeSensitiveBalance(data: Record<string, unknown>[], sensitiveAttributes: string[]): SensitiveBalance {
  if (!data || data.length === 0) return {};
  
  const balance: SensitiveBalance = {};
  
  for (const attr of sensitiveAttributes) {
    if (!data[0].hasOwnProperty(attr)) continue;
    
    const groups: Record<string, number> = {};
    for (const row of data) {
      const value = String(row[attr] ?? 'unknown');
      groups[value] = (groups[value] || 0) + 1;
    }
    
    const counts = Object.values(groups);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    
    balance[attr] = {
      ...groups,
      balance_ratio: maxCount > 0 ? minCount / maxCount : 0
    };
  }
  
  return balance;
}

function computeOverallScore(metrics: QualityMetrics): number {
  // Weighted average: completeness (25%), validity (30%), uniqueness (20%), freshness (25%)
  return (
    metrics.completeness * 0.25 +
    metrics.validity * 0.30 +
    metrics.uniqueness * 0.20 +
    metrics.freshness * 0.25
  );
}

function determineVerdict(score: number): 'PASS' | 'WARN' | 'FAIL' {
  if (score >= 0.9) return 'PASS';
  if (score >= 0.7) return 'WARN';
  return 'FAIL';
}

function generateEvidenceHash(metrics: QualityMetrics, timestamp: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify({ metrics, timestamp }));
  
  // Simple hash for evidence (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: DataQualityRequest = await req.json();
    const { 
      dataset_id, 
      run_type, 
      sample_data, 
      schema_definition,
      freshness_threshold_hours = 24,
      check_contract = false
    } = body;

    if (!dataset_id) {
      throw new Error('dataset_id is required');
    }

    // Fetch dataset info
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', dataset_id)
      .single();

    if (datasetError || !dataset) {
      throw new Error(`Dataset not found: ${dataset_id}`);
    }

    // Use sample data or stream from storage - NO MOCK DATA ALLOWED
    let evaluationData: Record<string, unknown>[];
    if (sample_data && sample_data.length > 0) {
      evaluationData = sample_data;
    } else if (dataset.source_url) {
      // Stream from storage path
      evaluationData = await streamDataFromStorage(supabase, dataset.source_url);
    } else {
      // EU AI Act Article 10 requires actual data - no mock data
      return new Response(JSON.stringify({
        success: false,
        error: "No data source available",
        code: "DATA_REQUIRED",
        message: "EU AI Act Article 10 requires actual data for quality evaluation. Provide sample_data or ensure dataset has source_url.",
        fail_closed: true,
        eu_ai_act_reference: "Article 10 - Data and Data Governance"
      }), { 
        status: 422, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Infer schema if not provided
    const schema = schema_definition || inferSchema(evaluationData);

    // Compute all quality metrics
    const completenessResult = computeCompleteness(evaluationData);
    const validityResult = computeValidity(evaluationData, schema);
    const uniquenessResult = computeUniqueness(evaluationData);
    const freshnessResult = computeFreshness(dataset.updated_at, freshness_threshold_hours);
    
    const metrics: QualityMetrics = {
      completeness: completenessResult.score,
      validity: validityResult.score,
      uniqueness: uniquenessResult.score,
      freshness: freshnessResult.score,
      overall: 0
    };
    metrics.overall = computeOverallScore(metrics);

    const distributionSkew = computeDistributionSkew(evaluationData);
    const sensitiveBalance = computeSensitiveBalance(
      evaluationData, 
      ['gender', 'age_group', 'ethnicity', 'race', 'sex'] // Common sensitive attributes
    );

    const verdict = determineVerdict(metrics.overall);
    const timestamp = new Date().toISOString();
    const evidenceHash = generateEvidenceHash(metrics, timestamp);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    // Store quality run
    const { data: qualityRun, error: insertError } = await supabase
      .from('dataset_quality_runs')
      .insert({
        dataset_id,
        run_type,
        completeness_score: metrics.completeness,
        validity_score: metrics.validity,
        uniqueness_score: metrics.uniqueness,
        freshness_score: metrics.freshness,
        overall_score: metrics.overall,
        distribution_skew: distributionSkew,
        sensitive_attribute_balance: sensitiveBalance,
        verdict,
        metric_details: {
          completeness: completenessResult.details,
          validity: validityResult.details,
          uniqueness: uniquenessResult.details,
          freshness: { hours_old: freshnessResult.hoursOld, threshold_hours: freshness_threshold_hours },
          sample_size: evaluationData.length,
          columns_evaluated: Object.keys(schema).length
        },
        evidence_hash: evidenceHash,
        created_by: userId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store quality run:', insertError);
      throw new Error('Failed to store quality run');
    }

    // Check contract if requested
    let contractViolation = null;
    if (check_contract) {
      const { data: contract } = await supabase
        .from('data_contracts')
        .select('*')
        .eq('dataset_id', dataset_id)
        .eq('status', 'active')
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (contract) {
        const violations = checkContractViolations(contract, metrics, schema);
        if (violations.length > 0) {
          const severity = violations.some(v => v.severity === 'critical') ? 'critical' :
                          violations.some(v => v.severity === 'high') ? 'high' :
                          violations.some(v => v.severity === 'medium') ? 'medium' : 'low';

          const { data: violation } = await supabase
            .from('data_contract_violations')
            .insert({
              contract_id: contract.id,
              dataset_id,
              quality_run_id: qualityRun.id,
              violation_type: violations[0].type,
              violation_details: { violations },
              severity,
              auto_actions_taken: {
                quality_run_created: true,
                timestamp
              }
            })
            .select()
            .single();

          contractViolation = violation;
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      run_id: qualityRun.id,
      dataset_id,
      verdict,
      overall_score: metrics.overall,
      metrics: {
        completeness: { score: metrics.completeness, weight: 0.25, details: completenessResult.details },
        validity: { score: metrics.validity, weight: 0.30, details: validityResult.details },
        uniqueness: { score: metrics.uniqueness, weight: 0.20, details: uniquenessResult.details },
        freshness: { score: metrics.freshness, weight: 0.25, hours_old: freshnessResult.hoursOld }
      },
      distribution_skew: distributionSkew,
      sensitive_balance: sensitiveBalance,
      contract_violation: contractViolation,
      evidence: {
        hash: evidenceHash,
        timestamp,
        sample_size: evaluationData.length,
        latency_ms: latencyMs
      },
      formula: 'overall = (completeness × 0.25) + (validity × 0.30) + (uniqueness × 0.20) + (freshness × 0.25)',
      eu_ai_act_reference: 'Article 10 - Data and Data Governance'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Data Quality Engine error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      verdict: 'FAIL',
      fail_closed: true,
      eu_ai_act_reference: 'Article 10 - Data and Data Governance'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper: Stream data from Supabase Storage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamDataFromStorage(supabase: any, sourceUrl: string): Promise<Record<string, unknown>[]> {
  try {
    // Parse storage path - format: bucket/path/to/file.csv or full URL
    let bucket = 'fractal';
    let path = sourceUrl;
    
    if (sourceUrl.includes('/')) {
      const parts = sourceUrl.split('/');
      if (!sourceUrl.startsWith('http')) {
        bucket = parts[0];
        path = parts.slice(1).join('/');
      }
    }

    // Create signed URL for secure access
    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60);

    if (signedUrlError || !signedUrl?.signedUrl) {
      console.error('Failed to create signed URL:', signedUrlError);
      throw new Error(`Storage access failed: ${signedUrlError?.message || 'Unknown error'}`);
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(signedUrl.signedUrl, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Storage fetch failed: ${response.status}`);
    }

    const text = await response.text();
    const extension = path.split('.').pop()?.toLowerCase();

    // Parse based on file type
    if (extension === 'json') {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } else if (extension === 'csv') {
      // CSV parsing
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length === 0) return [];
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, unknown> = {};
        headers.forEach((header, i) => {
          const val = values[i];
          // Try to parse numbers
          const num = Number(val);
          row[header] = isNaN(num) ? val : num;
        });
        return row;
      });
    } else {
      // Try JSON first, then CSV
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length === 0) return [];
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: Record<string, unknown> = {};
          headers.forEach((header, i) => { row[header] = values[i]; });
          return row;
        });
      }
    }
  } catch (error) {
    console.error('streamDataFromStorage error:', error);
    throw new Error(`Failed to stream data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper: Infer schema from data
function inferSchema(data: Record<string, unknown>[]): Record<string, string> {
  if (!data || data.length === 0) return {};
  
  const schema: Record<string, string> = {};
  const sample = data[0];
  
  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === 'number') schema[key] = 'number';
    else if (typeof value === 'boolean') schema[key] = 'boolean';
    else if (typeof value === 'string') {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(value)) schema[key] = 'uuid';
      else if (/^\d{4}-\d{2}-\d{2}/.test(value)) schema[key] = 'date';
      else if (/@/.test(value)) schema[key] = 'email';
      else schema[key] = 'string';
    }
    else schema[key] = 'string';
  }
  
  return schema;
}

// Helper: Check contract violations
function checkContractViolations(
  contract: Record<string, unknown>, 
  metrics: QualityMetrics, 
  actualSchema: Record<string, string>
): Array<{ type: string; message: string; severity: string }> {
  const violations: Array<{ type: string; message: string; severity: string }> = [];
  
  const thresholds = contract.quality_thresholds as Record<string, number> || {};
  
  if (thresholds.completeness && metrics.completeness < thresholds.completeness) {
    violations.push({
      type: 'quality',
      message: `Completeness ${(metrics.completeness * 100).toFixed(1)}% below threshold ${(thresholds.completeness * 100).toFixed(1)}%`,
      severity: metrics.completeness < thresholds.completeness * 0.8 ? 'high' : 'medium'
    });
  }
  
  if (thresholds.validity && metrics.validity < thresholds.validity) {
    violations.push({
      type: 'quality',
      message: `Validity ${(metrics.validity * 100).toFixed(1)}% below threshold ${(thresholds.validity * 100).toFixed(1)}%`,
      severity: metrics.validity < thresholds.validity * 0.8 ? 'critical' : 'high'
    });
  }
  
  if (thresholds.uniqueness && metrics.uniqueness < thresholds.uniqueness) {
    violations.push({
      type: 'quality',
      message: `Uniqueness ${(metrics.uniqueness * 100).toFixed(1)}% below threshold ${(thresholds.uniqueness * 100).toFixed(1)}%`,
      severity: 'medium'
    });
  }
  
  // Schema violations
  const expectedSchema = contract.schema_expectations as Record<string, unknown> || {};
  if (expectedSchema.columns) {
    const expectedCols = expectedSchema.columns as string[];
    const actualCols = Object.keys(actualSchema);
    const missingCols = expectedCols.filter(c => !actualCols.includes(c));
    
    if (missingCols.length > 0) {
      violations.push({
        type: 'schema',
        message: `Missing required columns: ${missingCols.join(', ')}`,
        severity: 'critical'
      });
    }
  }
  
  return violations;
}
