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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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

    console.log(`[audit-data] Processing file: ${upload.file_name} (${upload.file_type})`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('fractal')
      .download(upload.file_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Update status to analyzing
    await supabase
      .from('data_uploads')
      .update({ status: 'analyzing' })
      .eq('id', upload_id);

    const issues: QualityIssue[] = [];
    let parsedData: Record<string, unknown>[] = [];
    let rowCount = 0;
    let columnCount = 0;

    // Parse based on file type
    if (upload.file_type === 'json') {
      const text = await fileData.text();
      try {
        const parsed = JSON.parse(text);
        parsedData = Array.isArray(parsed) ? parsed : [parsed];
        rowCount = parsedData.length;
        columnCount = parsedData.length > 0 ? Object.keys(parsedData[0]).length : 0;
      } catch {
        issues.push({
          issue_type: 'schema_violation',
          severity: 'critical',
          description: 'Invalid JSON format - file could not be parsed',
          suggested_fix: 'Ensure the file contains valid JSON syntax'
        });
      }
    } else if (upload.file_type === 'csv') {
      const text = await fileData.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        columnCount = headers.length;
        rowCount = lines.length - 1;

        parsedData = lines.slice(1).map((line, idx) => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, unknown> = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || null;
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
    }

    // Calculate quality metrics
    const metrics = calculateQualityMetrics(parsedData, issues);

    // Perform semantic analysis if we have data
    if (parsedData.length > 0) {
      const semanticIssues = await performSemanticAnalysis(parsedData.slice(0, 20));
      issues.push(...semanticIssues);
    }

    // Perform range and format checks
    const validationIssues = performValidationChecks(parsedData);
    issues.push(...validationIssues);

    // Calculate final score
    const qualityScore = Math.round(metrics.overall * 100);

    // Insert all issues
    if (issues.length > 0) {
      const issuesToInsert = issues.map(issue => ({
        upload_id,
        ...issue
      }));

      await supabase.from('quality_issues').insert(issuesToInsert);
    }

    const processingTime = Date.now() - startTime;

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
          info_count: issues.filter(i => i.severity === 'info').length
        }
      })
      .eq('id', upload_id);

    console.log(`[audit-data] Completed audit for ${upload_id}: score=${qualityScore}, issues=${issues.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        upload_id,
        quality_score: qualityScore,
        metrics,
        issue_count: issues.length,
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[audit-data] Error:', error);

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
            processing_time_ms: Date.now() - startTime
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

function calculateQualityMetrics(data: Record<string, unknown>[], existingIssues: QualityIssue[]): QualityMetrics {
  if (data.length === 0) {
    return { completeness: 0, validity: 0, uniqueness: 0, freshness: 1, overall: 0 };
  }

  const columns = Object.keys(data[0]);
  let nullCount = 0;
  let totalCells = data.length * columns.length;

  // Completeness: % of non-null values
  data.forEach(row => {
    columns.forEach(col => {
      const value = row[col];
      if (value === null || value === undefined || value === '') {
        nullCount++;
      }
    });
  });
  const completeness = totalCells > 0 ? (totalCells - nullCount) / totalCells : 0;

  // Uniqueness: check for duplicate rows
  const rowStrings = data.map(row => JSON.stringify(row));
  const uniqueRows = new Set(rowStrings);
  const uniqueness = data.length > 0 ? uniqueRows.size / data.length : 1;

  // Validity: based on existing schema issues
  const schemaIssues = existingIssues.filter(i => i.issue_type === 'schema_violation').length;
  const validity = Math.max(0, 1 - (schemaIssues / Math.max(data.length, 1)));

  // Freshness: assume data is fresh (would need timestamp column to calculate properly)
  const freshness = 1;

  // Overall weighted score
  const overall = (completeness * 0.25) + (validity * 0.30) + (uniqueness * 0.20) + (freshness * 0.25);

  return {
    completeness: Math.round(completeness * 100) / 100,
    validity: Math.round(validity * 100) / 100,
    uniqueness: Math.round(uniqueness * 100) / 100,
    freshness: Math.round(freshness * 100) / 100,
    overall: Math.round(overall * 100) / 100
  };
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
