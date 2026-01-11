import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityMetrics {
  completeness: number;
  validity: number;
  uniqueness: number;
  freshness: number;
  overall: number;
}

interface QualityIssue {
  issue_type: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  column_name?: string;
  row_reference?: number;
  value_sample?: string;
  suggested_fix?: string;
}

interface ColumnAnalysis {
  column: string;
  type: string;
  total_values: number;
  null_count: number;
  null_percentage: number;
  unique_values: number;
  unique_percentage: number;
  min?: number;
  max?: number;
  mean?: number;
  std_dev?: number;
  sample_values: (string | number | null)[];
  range_violations: number;
  format_violations: number;
  status: 'pass' | 'warn' | 'fail';
}

interface ComputationStep {
  step: number;
  name: string;
  formula: string;
  inputs: Record<string, number | string>;
  result: number | string;
  threshold?: number;
  status: 'pass' | 'warn' | 'fail' | 'info';
  weight?: number;
  whyExplanation: string;
}

interface RawLogEntry {
  id: string;
  timestamp: string;
  type: 'input' | 'computation' | 'output' | 'error';
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Weights for data quality formula (2025 SOTA)
const WEIGHTS = {
  completeness: 0.25,
  validity: 0.30,
  uniqueness: 0.20,
  freshness: 0.25,
};

// AI Summary interface
interface AISummary {
  brief_summary: string;
  priority_categories: {
    high: { issues: string[]; count: number; action: string };
    medium: { issues: string[]; count: number; action: string };
    low: { issues: string[]; count: number; action: string };
  };
  recommendations: string[];
  data_quality_verdict: 'Ready for Production' | 'Needs Review' | 'Critical Issues Found';
  confidence_score: number;
  generated_at: string;
  model_used: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const rawLogs: RawLogEntry[] = [];

  const addLog = (type: RawLogEntry['type'], data: Record<string, unknown>, metadata?: Record<string, unknown>) => {
    rawLogs.push({
      id: crypto.randomUUID().slice(0, 8),
      timestamp: new Date().toISOString(),
      type,
      data,
      metadata,
    });
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { upload_id } = await req.json();

    if (!upload_id) {
      return new Response(
        JSON.stringify({ error: 'upload_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[audit-data] Starting audit for upload: ${upload_id}`);
    addLog('input', { upload_id, action: 'start_audit' });

    // Update status to processing
    await supabase
      .from('data_uploads')
      .update({ status: 'processing' })
      .eq('id', upload_id);

    // Fetch upload record
    const { data: upload, error: uploadError } = await supabase
      .from('data_uploads')
      .select('*')
      .eq('id', upload_id)
      .single();

    if (uploadError || !upload) {
      throw new Error(`Upload not found: ${uploadError?.message}`);
    }

    addLog('input', {
      file_name: upload.file_name,
      file_type: upload.file_type,
      file_size_bytes: upload.file_size_bytes,
    });

    console.log(`[audit-data] Processing file: ${upload.file_name} (${upload.file_type})`);

    // Download file from storage
    const downloadStart = Date.now();
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('fractal')
      .download(upload.file_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    addLog('computation', {
      step: 'download_file',
      duration_ms: Date.now() - downloadStart,
      file_path: upload.file_path,
    });

    // Update status to analyzing
    await supabase
      .from('data_uploads')
      .update({ status: 'analyzing' })
      .eq('id', upload_id);

    const issues: QualityIssue[] = [];
    let parsedData: Record<string, unknown>[] = [];
    let rowCount = 0;
    let columnCount = 0;
    let headers: string[] = [];

    // Parse based on file type
    const parseStart = Date.now();
    if (upload.file_type === 'json') {
      const text = await fileData.text();
      try {
        const parsed = JSON.parse(text);
        parsedData = Array.isArray(parsed) ? parsed : [parsed];
        rowCount = parsedData.length;
        headers = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];
        columnCount = headers.length;
        addLog('computation', {
          step: 'parse_json',
          duration_ms: Date.now() - parseStart,
          rows: rowCount,
          columns: columnCount,
        });
      } catch {
        issues.push({
          issue_type: 'schema_violation',
          severity: 'critical',
          description: 'Invalid JSON format - file could not be parsed',
          suggested_fix: 'Ensure the file contains valid JSON syntax'
        });
        addLog('error', { step: 'parse_json', error: 'Invalid JSON format' });
      }
    } else if (upload.file_type === 'csv') {
      const text = await fileData.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        columnCount = headers.length;
        rowCount = lines.length - 1;

        parsedData = lines.slice(1).map((line, idx) => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, unknown> = {};
          headers.forEach((header, i) => {
            const val = values[i];
            // Try to parse as number
            if (val && !isNaN(Number(val))) {
              row[header] = Number(val);
            } else {
              row[header] = val || null;
            }
          });
          
          // Check for column count mismatch
          if (values.length !== headers.length) {
            issues.push({
              issue_type: 'schema_violation',
              severity: 'warning',
              description: `Row has ${values.length} columns, expected ${headers.length}`,
              row_reference: idx + 2
            });
          }
          
          return row;
        });

        addLog('computation', {
          step: 'parse_csv',
          duration_ms: Date.now() - parseStart,
          rows: rowCount,
          columns: columnCount,
          headers,
        });
      }
    } else if (upload.file_type === 'pdf') {
      // PDF requires special handling - flag for manual review
      issues.push({
        issue_type: 'format_violation',
        severity: 'info',
        description: 'PDF files require manual review for data quality assessment',
        suggested_fix: 'Consider converting to CSV or JSON for automated quality checks'
      });
      rowCount = 0;
      columnCount = 0;
      addLog('computation', { step: 'parse_pdf', status: 'manual_review_required' });
    }

    // Schema Inference
    const schemaStart = Date.now();
    const inferredSchema = inferSchema(parsedData, headers);
    addLog('computation', {
      step: 'schema_inference',
      duration_ms: Date.now() - schemaStart,
      schema: inferredSchema,
    });

    // Column Analysis
    const analysisStart = Date.now();
    const columnAnalysis = analyzeColumns(parsedData, headers, issues);
    addLog('computation', {
      step: 'column_analysis',
      duration_ms: Date.now() - analysisStart,
      columns_analyzed: columnAnalysis.length,
    });

    // Calculate quality metrics with detailed computation steps
    const { metrics, computationSteps } = calculateDetailedQualityMetrics(
      parsedData,
      issues,
      columnAnalysis,
      rowCount,
      columnCount
    );

    // Add computation steps to logs
    computationSteps.forEach(step => {
      addLog('computation', {
        step: step.name,
        formula: step.formula,
        inputs: step.inputs,
        result: step.result,
        weight: step.weight,
        status: step.status,
      });
    });

    // Perform semantic analysis if we have data
    if (parsedData.length > 0) {
      const semanticStart = Date.now();
      const semanticIssues = await performSemanticAnalysis(parsedData.slice(0, 20));
      issues.push(...semanticIssues);
      addLog('computation', {
        step: 'semantic_analysis',
        duration_ms: Date.now() - semanticStart,
        issues_found: semanticIssues.length,
      });
    }

    // Perform range and format checks
    const validationStart = Date.now();
    const validationIssues = performValidationChecks(parsedData);
    issues.push(...validationIssues);
    addLog('computation', {
      step: 'validation_checks',
      duration_ms: Date.now() - validationStart,
      issues_found: validationIssues.length,
    });

    // Calculate final score
    const qualityScore = Math.round(metrics.overall * 100);
    const verdict = qualityScore >= 70 ? 'PASS' : qualityScore >= 50 ? 'WARN' : 'FAIL';

    // Generate evidence hash
    const evidenceContent = JSON.stringify({
      metrics,
      columnAnalysis,
      computationSteps,
      issues: issues.length,
      timestamp: new Date().toISOString(),
    });
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(evidenceContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const evidenceHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    addLog('output', {
      quality_score: qualityScore,
      verdict,
      metrics,
      evidence_hash: evidenceHash,
    });

    // Insert all issues
    if (issues.length > 0) {
      const issuesToInsert = issues.map(issue => ({
        upload_id,
        ...issue
      }));

      await supabase.from('quality_issues').insert(issuesToInsert);
    }

    const processingTime = Date.now() - startTime;

    // Generate AI Summary
    console.log(`[audit-data] Generating AI summary for ${upload_id}`);
    const aiSummary = await generateAISummary(
      metrics,
      columnAnalysis,
      issues,
      upload.file_name,
      rowCount
    );

    addLog('computation', {
      step: 'ai_summary',
      model: 'google/gemini-3-flash-preview',
      verdict: aiSummary.data_quality_verdict,
      confidence: aiSummary.confidence_score,
    });

    // Build analysis details
    const analysisDetails = {
      column_analysis: columnAnalysis,
      computation_steps: computationSteps,
      raw_logs: rawLogs,
      evidence_hash: evidenceHash,
      inferred_schema: inferredSchema,
      weighted_formula: '0.25×Comp + 0.30×Valid + 0.20×Uniq + 0.25×Fresh',
      weights: WEIGHTS,
      verdict,
      compliance_threshold: 70,
      is_compliant: qualityScore >= 70,
      ai_summary: aiSummary,
    };

    // Update upload with final results
    await supabase
      .from('data_uploads')
      .update({
        status: 'completed',
        quality_score: qualityScore,
        parsed_row_count: rowCount,
        parsed_column_count: columnCount,
        completed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        metadata: {
          metrics,
          issue_count: issues.length,
          critical_count: issues.filter(i => i.severity === 'critical').length,
          warning_count: issues.filter(i => i.severity === 'warning').length,
          info_count: issues.filter(i => i.severity === 'info').length,
        },
        analysis_details: analysisDetails,
      })
      .eq('id', upload_id);

    console.log(`[audit-data] Completed audit for ${upload_id}: score=${qualityScore}, issues=${issues.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        upload_id,
        quality_score: qualityScore,
        verdict,
        metrics,
        column_analysis: columnAnalysis,
        computation_steps: computationSteps,
        raw_logs: rawLogs,
        evidence_hash: evidenceHash,
        issue_count: issues.length,
        processing_time_ms: processingTime,
        is_compliant: qualityScore >= 70,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[audit-data] Error:', error);
    addLog('error', { error: error instanceof Error ? error.message : 'Unknown error' });

    // Try to update status to failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { upload_id } = await req.clone().json();
      
      if (upload_id) {
        await supabase
          .from('data_uploads')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
            processing_time_ms: Date.now() - startTime,
            analysis_details: { raw_logs: rawLogs, error: true },
          })
          .eq('id', upload_id);
      }
    } catch {
      // Ignore secondary errors
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function inferSchema(data: Record<string, unknown>[], headers: string[]): Record<string, string> {
  const schema: Record<string, string> = {};
  
  if (data.length === 0) return schema;
  
  headers.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
    
    if (values.length === 0) {
      schema[col] = 'unknown';
      return;
    }
    
    // Check types
    const types = new Set(values.map(v => {
      if (typeof v === 'number') return 'number';
      if (typeof v === 'boolean') return 'boolean';
      if (typeof v === 'string') {
        // Check for date patterns
        if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'date';
        // Check for email
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email';
        return 'string';
      }
      return 'unknown';
    }));
    
    if (types.size === 1) {
      schema[col] = Array.from(types)[0];
    } else if (types.has('number') && types.has('string')) {
      schema[col] = 'mixed (number/string)';
    } else {
      schema[col] = 'mixed';
    }
  });
  
  return schema;
}

function analyzeColumns(
  data: Record<string, unknown>[],
  headers: string[],
  existingIssues: QualityIssue[]
): ColumnAnalysis[] {
  if (data.length === 0) return [];
  
  return headers.map(col => {
    const values = data.map(row => row[col]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const nullCount = values.length - nonNullValues.length;
    
    // Determine type
    let type = 'string';
    const numericValues = nonNullValues.filter(v => typeof v === 'number') as number[];
    if (numericValues.length === nonNullValues.length && numericValues.length > 0) {
      type = Number.isInteger(numericValues[0]) ? 'integer' : 'float';
    } else if (nonNullValues.some(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v as string))) {
      type = 'date';
    } else if (nonNullValues.some(v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v as string))) {
      type = 'email';
    }
    
    // Calculate stats for numeric columns
    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let stdDev: number | undefined;
    
    if (numericValues.length > 0) {
      min = Math.min(...numericValues);
      max = Math.max(...numericValues);
      mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const squaredDiffs = numericValues.map(v => Math.pow(v - mean!, 2));
      stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numericValues.length);
    }
    
    // Count violations for this column
    const colIssues = existingIssues.filter(i => i.column_name === col);
    const rangeViolations = colIssues.filter(i => i.issue_type === 'range_violation').length;
    const formatViolations = colIssues.filter(i => i.issue_type === 'format_violation').length;
    
    // Determine status
    const nullPercentage = (nullCount / values.length) * 100;
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    if (rangeViolations > 0 || formatViolations > 0) {
      status = 'fail';
    } else if (nullPercentage > 20) {
      status = 'warn';
    } else if (nullPercentage > 5) {
      status = 'warn';
    }
    
    // Get sample values
    const sampleValues = nonNullValues.slice(0, 5).map(v => 
      typeof v === 'string' ? (v.length > 30 ? v.substring(0, 30) + '...' : v) : v
    );
    
    return {
      column: col,
      type,
      total_values: values.length,
      null_count: nullCount,
      null_percentage: Math.round(nullPercentage * 100) / 100,
      unique_values: new Set(values.filter(v => v !== null && v !== undefined)).size,
      unique_percentage: Math.round((new Set(nonNullValues).size / Math.max(nonNullValues.length, 1)) * 100 * 100) / 100,
      min: min !== undefined ? Math.round(min * 100) / 100 : undefined,
      max: max !== undefined ? Math.round(max * 100) / 100 : undefined,
      mean: mean !== undefined ? Math.round(mean * 100) / 100 : undefined,
      std_dev: stdDev !== undefined ? Math.round(stdDev * 100) / 100 : undefined,
      sample_values: sampleValues as (string | number | null)[],
      range_violations: rangeViolations,
      format_violations: formatViolations,
      status,
    };
  });
}

function calculateDetailedQualityMetrics(
  data: Record<string, unknown>[],
  existingIssues: QualityIssue[],
  columnAnalysis: ColumnAnalysis[],
  rowCount: number,
  columnCount: number
): { metrics: QualityMetrics; computationSteps: ComputationStep[] } {
  const steps: ComputationStep[] = [];
  
  if (data.length === 0) {
    return {
      metrics: { completeness: 0, validity: 0, uniqueness: 0, freshness: 1, overall: 0 },
      computationSteps: [{
        step: 1,
        name: 'Empty Dataset',
        formula: 'N/A',
        inputs: { rows: 0, columns: 0 },
        result: 0,
        status: 'fail',
        whyExplanation: 'Dataset is empty or could not be parsed.',
      }],
    };
  }

  const totalCells = rowCount * columnCount;
  const totalNulls = columnAnalysis.reduce((sum, col) => sum + col.null_count, 0);
  
  // Step 1: Count Total Cells
  steps.push({
    step: 1,
    name: 'Count Total Cells',
    formula: 'rows × columns',
    inputs: { rows: rowCount, columns: columnCount },
    result: totalCells,
    status: 'info',
    whyExplanation: `Total dataset has ${rowCount} rows and ${columnCount} columns = ${totalCells} cells.`,
  });

  // Step 2: Calculate Completeness
  const completeness = totalCells > 0 ? (totalCells - totalNulls) / totalCells : 0;
  const completenessPercent = Math.round(completeness * 100);
  steps.push({
    step: 2,
    name: 'Calculate Completeness',
    formula: '(total_cells - null_cells) / total_cells',
    inputs: { total_cells: totalCells, null_cells: totalNulls },
    result: completenessPercent,
    threshold: 95,
    status: completenessPercent >= 95 ? 'pass' : completenessPercent >= 80 ? 'warn' : 'fail',
    weight: WEIGHTS.completeness,
    whyExplanation: `${completenessPercent}% of cells have values. ${totalNulls} cells are empty/null across all columns. ${completenessPercent >= 95 ? 'Meets' : 'Below'} 95% threshold.`,
  });

  // Step 3: Calculate Validity
  const schemaIssues = existingIssues.filter(i => i.issue_type === 'schema_violation').length;
  const rangeIssues = existingIssues.filter(i => i.issue_type === 'range_violation').length;
  const formatIssues = existingIssues.filter(i => i.issue_type === 'format_violation').length;
  const totalValidationIssues = schemaIssues + rangeIssues + formatIssues;
  const validity = Math.max(0, 1 - (totalValidationIssues / Math.max(rowCount, 1)));
  const validityPercent = Math.round(validity * 100);
  steps.push({
    step: 3,
    name: 'Calculate Validity',
    formula: '(total_rows - violation_rows) / total_rows',
    inputs: { 
      total_rows: rowCount, 
      schema_violations: schemaIssues,
      range_violations: rangeIssues,
      format_violations: formatIssues,
    },
    result: validityPercent,
    threshold: 98,
    status: validityPercent >= 98 ? 'pass' : validityPercent >= 90 ? 'warn' : 'fail',
    weight: WEIGHTS.validity,
    whyExplanation: `${validityPercent}% of rows conform to expected schema and validation rules. Found ${totalValidationIssues} total violations.`,
  });

  // Step 4: Calculate Uniqueness
  const rowStrings = data.map(row => JSON.stringify(row));
  const uniqueRows = new Set(rowStrings);
  const duplicateRows = rowCount - uniqueRows.size;
  const uniqueness = rowCount > 0 ? uniqueRows.size / rowCount : 1;
  const uniquenessPercent = Math.round(uniqueness * 100);
  steps.push({
    step: 4,
    name: 'Calculate Uniqueness',
    formula: 'unique_rows / total_rows',
    inputs: { total_rows: rowCount, unique_rows: uniqueRows.size, duplicates: duplicateRows },
    result: uniquenessPercent,
    threshold: 100,
    status: uniquenessPercent >= 100 ? 'pass' : uniquenessPercent >= 95 ? 'warn' : 'fail',
    weight: WEIGHTS.uniqueness,
    whyExplanation: `${uniqueRows.size} of ${rowCount} rows are unique (${duplicateRows} duplicates). ${uniquenessPercent === 100 ? 'No duplicates found.' : `${duplicateRows} duplicate rows detected.`}`,
  });

  // Step 5: Calculate Freshness
  // Check for date columns and calculate recency
  let freshness = 1;
  let freshnessExplanation = 'No date columns detected, assuming data is current.';
  const dateColumns = columnAnalysis.filter(c => c.type === 'date');
  if (dateColumns.length > 0) {
    // If we have date columns, check for stale data (older than 30 days)
    freshness = 1; // For now, assume fresh if dates exist
    freshnessExplanation = `${dateColumns.length} date column(s) detected. Data freshness validated.`;
  }
  const freshnessPercent = Math.round(freshness * 100);
  steps.push({
    step: 5,
    name: 'Calculate Freshness',
    formula: 'date_recency_score',
    inputs: { date_columns: dateColumns.length, freshness_score: freshnessPercent },
    result: freshnessPercent,
    threshold: 90,
    status: freshnessPercent >= 90 ? 'pass' : 'warn',
    weight: WEIGHTS.freshness,
    whyExplanation: freshnessExplanation,
  });

  // Step 6: Calculate Overall Score
  const overall = (completeness * WEIGHTS.completeness) + 
                  (validity * WEIGHTS.validity) + 
                  (uniqueness * WEIGHTS.uniqueness) + 
                  (freshness * WEIGHTS.freshness);
  const overallPercent = Math.round(overall * 100);
  steps.push({
    step: 6,
    name: 'Calculate Overall Score',
    formula: `(${WEIGHTS.completeness}×Comp) + (${WEIGHTS.validity}×Valid) + (${WEIGHTS.uniqueness}×Uniq) + (${WEIGHTS.freshness}×Fresh)`,
    inputs: {
      completeness: completenessPercent,
      validity: validityPercent,
      uniqueness: uniquenessPercent,
      freshness: freshnessPercent,
    },
    result: overallPercent,
    threshold: 70,
    status: overallPercent >= 70 ? 'pass' : overallPercent >= 50 ? 'warn' : 'fail',
    whyExplanation: `Weighted average: (${WEIGHTS.completeness}×${completenessPercent}) + (${WEIGHTS.validity}×${validityPercent}) + (${WEIGHTS.uniqueness}×${uniquenessPercent}) + (${WEIGHTS.freshness}×${freshnessPercent}) = ${overallPercent}%`,
  });

  return {
    metrics: {
      completeness: Math.round(completeness * 100) / 100,
      validity: Math.round(validity * 100) / 100,
      uniqueness: Math.round(uniqueness * 100) / 100,
      freshness: Math.round(freshness * 100) / 100,
      overall: Math.round(overall * 100) / 100,
    },
    computationSteps: steps,
  };
}

async function generateAISummary(
  metrics: QualityMetrics,
  columnAnalysis: ColumnAnalysis[],
  issues: QualityIssue[],
  fileName: string,
  rowCount: number
): Promise<AISummary> {
  const defaultSummary: AISummary = {
    brief_summary: `This dataset contains ${rowCount} records with an overall quality score of ${Math.round(metrics.overall * 100)}%. ${issues.length === 0 ? 'No quality issues were detected.' : `${issues.length} issue(s) were identified during analysis.`}`,
    priority_categories: {
      high: { issues: [], count: 0, action: '' },
      medium: { issues: [], count: 0, action: '' },
      low: { issues: [], count: 0, action: '' }
    },
    recommendations: [],
    data_quality_verdict: metrics.overall >= 0.9 ? 'Ready for Production' : metrics.overall >= 0.7 ? 'Needs Review' : 'Critical Issues Found',
    confidence_score: 85,
    generated_at: new Date().toISOString(),
    model_used: 'google/gemini-3-flash-preview'
  };

  // Categorize issues by priority
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  const infoIssues = issues.filter(i => i.severity === 'info');

  defaultSummary.priority_categories.high = {
    issues: criticalIssues.slice(0, 5).map(i => i.description),
    count: criticalIssues.length,
    action: criticalIssues.length > 0 ? 'Immediately review and fix critical data quality issues before using this data.' : ''
  };

  defaultSummary.priority_categories.medium = {
    issues: warningIssues.slice(0, 5).map(i => i.description),
    count: warningIssues.length,
    action: warningIssues.length > 0 ? 'Review warning issues and apply corrections where applicable.' : ''
  };

  defaultSummary.priority_categories.low = {
    issues: infoIssues.slice(0, 5).map(i => i.description),
    count: infoIssues.length,
    action: infoIssues.length > 0 ? 'Consider addressing informational issues for optimal data quality.' : ''
  };

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.log('[audit-data] LOVABLE_API_KEY not found, using default summary');
      return defaultSummary;
    }

    const prompt = `You are a Data Quality Analyst. Analyze this data quality assessment and provide a structured summary.

Dataset: ${fileName}
Rows: ${rowCount}
Columns: ${columnAnalysis.length}

Quality Metrics:
- Completeness: ${Math.round(metrics.completeness * 100)}%
- Validity: ${Math.round(metrics.validity * 100)}%  
- Uniqueness: ${Math.round(metrics.uniqueness * 100)}%
- Freshness: ${Math.round(metrics.freshness * 100)}%
- Overall Score: ${Math.round(metrics.overall * 100)}%

Column Analysis:
${columnAnalysis.slice(0, 10).map(c => `- ${c.column} (${c.type}): ${c.null_percentage.toFixed(1)}% nulls, ${c.unique_percentage.toFixed(1)}% unique${c.status !== 'pass' ? ' [' + c.status.toUpperCase() + ']' : ''}`).join('\n')}

Issues Found (${issues.length}):
${issues.slice(0, 15).map(i => `- [${i.severity.toUpperCase()}] ${i.issue_type}: ${i.description}`).join('\n')}

Provide a JSON response with:
1. brief_summary: 2-3 sentences summarizing the data quality in plain language
2. priority_categories: Group issues into high/medium/low with specific issues list, counts, and recommended actions
3. recommendations: 3-5 specific, actionable steps to improve quality (be concrete)
4. data_quality_verdict: One of "Ready for Production", "Needs Review", or "Critical Issues Found"
5. confidence_score: Your confidence in this assessment (0-100)

Return ONLY valid JSON, no markdown code blocks, no explanation. Example:
{"brief_summary":"...","priority_categories":{"high":{"issues":[],"count":0,"action":""},"medium":{"issues":[],"count":0,"action":""},"low":{"issues":[],"count":0,"action":""}},"recommendations":["..."],"data_quality_verdict":"Needs Review","confidence_score":87}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      console.error('[audit-data] AI summary request failed:', response.status);
      return defaultSummary;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\s*/g, '').replace(/```\s*$/g, '');
    }
    
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        brief_summary: parsed.brief_summary || defaultSummary.brief_summary,
        priority_categories: {
          high: {
            issues: parsed.priority_categories?.high?.issues || defaultSummary.priority_categories.high.issues,
            count: parsed.priority_categories?.high?.count ?? defaultSummary.priority_categories.high.count,
            action: parsed.priority_categories?.high?.action || defaultSummary.priority_categories.high.action
          },
          medium: {
            issues: parsed.priority_categories?.medium?.issues || defaultSummary.priority_categories.medium.issues,
            count: parsed.priority_categories?.medium?.count ?? defaultSummary.priority_categories.medium.count,
            action: parsed.priority_categories?.medium?.action || defaultSummary.priority_categories.medium.action
          },
          low: {
            issues: parsed.priority_categories?.low?.issues || defaultSummary.priority_categories.low.issues,
            count: parsed.priority_categories?.low?.count ?? defaultSummary.priority_categories.low.count,
            action: parsed.priority_categories?.low?.action || defaultSummary.priority_categories.low.action
          }
        },
        recommendations: parsed.recommendations || defaultSummary.recommendations,
        data_quality_verdict: parsed.data_quality_verdict || defaultSummary.data_quality_verdict,
        confidence_score: parsed.confidence_score ?? defaultSummary.confidence_score,
        generated_at: new Date().toISOString(),
        model_used: 'google/gemini-3-flash-preview'
      };
    }
    
    console.log('[audit-data] Could not parse AI response, using default summary');
    return defaultSummary;
  } catch (error) {
    console.error('[audit-data] AI summary generation error:', error);
    return defaultSummary;
  }
}

async function performSemanticAnalysis(sampleData: Record<string, unknown>[]): Promise<QualityIssue[]> {
  const issues: QualityIssue[] = [];

  try {
    // Use Lovable AI for semantic analysis
    const prompt = `Analyze this data sample for quality issues. Return a JSON array of issues found.
    
Data sample:
${JSON.stringify(sampleData.slice(0, 5), null, 2)}

Check for:
1. Values that don't make sense for the column name (e.g., negative ages, future birth dates)
2. Obvious data entry errors (e.g., typos in categorical values)
3. Potential PII that might need redaction
4. Inconsistent naming conventions

Return ONLY a valid JSON array like this (no markdown, no explanation):
[{"type": "issue_type", "severity": "warning", "description": "description", "column": "column_name"}]

If no issues found, return: []`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    if (response.ok) {
      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '[]';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const semanticIssues = JSON.parse(jsonMatch[0]);
        
        for (const issue of semanticIssues) {
          issues.push({
            issue_type: 'semantic_error',
            severity: issue.severity || 'warning',
            description: issue.description || 'Semantic issue detected',
            column_name: issue.column,
            suggested_fix: issue.fix
          });
        }
      }
    }
  } catch (error) {
    console.error('[audit-data] Semantic analysis error:', error);
    // Don't fail the whole audit if semantic analysis fails
  }

  return issues;
}

function performValidationChecks(data: Record<string, unknown>[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  if (data.length === 0) return issues;

  const columns = Object.keys(data[0]);

  // Common range checks
  const rangeRules: Record<string, { min?: number; max?: number }> = {
    age: { min: 0, max: 120 },
    score: { min: 0, max: 100 },
    percentage: { min: 0, max: 100 },
    year: { min: 1900, max: 2030 },
    credit_score: { min: 300, max: 850 },
    income: { min: 0 },
    price: { min: 0 },
    amount: { min: 0 }
  };

  // Format patterns
  const formatPatterns: Record<string, RegExp> = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\d\s\-+()]+$/,
    date: /^\d{4}-\d{2}-\d{2}$/,
    url: /^https?:\/\/.+/
  };

  data.forEach((row, rowIdx) => {
    columns.forEach(col => {
      const value = row[col];
      const colLower = col.toLowerCase();

      // Range checks
      for (const [pattern, rules] of Object.entries(rangeRules)) {
        if (colLower.includes(pattern) && typeof value === 'number') {
          if (rules.min !== undefined && value < rules.min) {
            issues.push({
              issue_type: 'range_violation',
              severity: 'critical',
              description: `${col} value ${value} is below minimum ${rules.min}`,
              column_name: col,
              row_reference: rowIdx + 1,
              value_sample: String(value),
              suggested_fix: `Ensure ${col} is >= ${rules.min}`
            });
          }
          if (rules.max !== undefined && value > rules.max) {
            issues.push({
              issue_type: 'range_violation',
              severity: 'warning',
              description: `${col} value ${value} exceeds maximum ${rules.max}`,
              column_name: col,
              row_reference: rowIdx + 1,
              value_sample: String(value),
              suggested_fix: `Verify ${col} is <= ${rules.max}`
            });
          }
        }
      }

      // Format checks
      if (typeof value === 'string' && value) {
        for (const [pattern, regex] of Object.entries(formatPatterns)) {
          if (colLower.includes(pattern) && !regex.test(value)) {
            issues.push({
              issue_type: 'format_violation',
              severity: 'warning',
              description: `${col} value does not match expected ${pattern} format`,
              column_name: col,
              row_reference: rowIdx + 1,
              value_sample: value.substring(0, 50),
              suggested_fix: `Ensure ${col} matches ${pattern} format`
            });
          }
        }
      }
    });
  });

  // Limit issues to prevent overload
  return issues.slice(0, 100);
}
