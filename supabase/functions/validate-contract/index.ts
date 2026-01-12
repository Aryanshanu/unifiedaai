import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContractViolation {
  type: 'missing_column' | 'type_mismatch' | 'threshold_breach' | 'format_violation' | 'null_violation';
  column?: string;
  expected: string;
  actual: string;
  severity: 'critical' | 'warning';
  row_sample?: number;
}

interface ContractCheckResult {
  passed: boolean;
  violations: ContractViolation[];
  enforcement_action: 'allow' | 'warn' | 'block';
  checked_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { upload_id, contract_id } = await req.json();

    if (!upload_id) {
      return new Response(
        JSON.stringify({ error: 'upload_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[validate-contract] Validating upload ${upload_id} against contract ${contract_id || 'auto-detect'}`);

    // Update status to pending validation
    await supabase
      .from('data_uploads')
      .update({ contract_check_status: 'pending', contract_id })
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

    // If no contract specified, skip validation
    if (!contract_id) {
      await supabase
        .from('data_uploads')
        .update({ 
          contract_check_status: 'skipped',
          contract_violations: null
        })
        .eq('id', upload_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No contract assigned, skipping validation',
          status: 'skipped'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch contract
    const { data: contract, error: contractError } = await supabase
      .from('data_contracts')
      .select('*')
      .eq('id', contract_id)
      .single();

    if (contractError || !contract) {
      throw new Error(`Contract not found: ${contractError?.message}`);
    }

    console.log(`[validate-contract] Using contract: ${contract.name} (enforcement: ${contract.enforcement_mode})`);

    // Download file for validation
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('fractal')
      .download(upload.file_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Parse file based on type
    let parsedData: Record<string, unknown>[] = [];
    let headers: string[] = [];

    if (upload.file_type === 'json') {
      const text = await fileData.text();
      const parsed = JSON.parse(text);
      parsedData = Array.isArray(parsed) ? parsed : [parsed];
      headers = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];
    } else if (upload.file_type === 'csv') {
      const text = await fileData.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        parsedData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, unknown> = {};
          headers.forEach((h, i) => {
            row[h] = values[i] || null;
          });
          return row;
        });
      }
    }

    // Validate against contract schema expectations
    const violations: ContractViolation[] = [];
    const schemaExpectations = contract.schema_expectations as Record<string, { type: string; required?: boolean; format?: string }>;

    // Check required columns
    for (const [column, expectation] of Object.entries(schemaExpectations)) {
      if (expectation.required && !headers.includes(column)) {
        violations.push({
          type: 'missing_column',
          column,
          expected: `Column "${column}" is required`,
          actual: 'Column not found',
          severity: 'critical'
        });
      }
    }

    // Check column types and formats
    for (const column of headers) {
      const expectation = schemaExpectations[column];
      if (!expectation) continue;

      for (let i = 0; i < Math.min(parsedData.length, 100); i++) {
        const value = parsedData[i][column];
        
        // Type check
        if (expectation.type === 'number' && value !== null && typeof value !== 'number') {
          if (typeof value === 'string' && isNaN(Number(value))) {
            violations.push({
              type: 'type_mismatch',
              column,
              expected: 'number',
              actual: typeof value,
              severity: 'warning',
              row_sample: i + 2
            });
            break; // Only report first violation per column
          }
        }

        // Format check (email, date, etc.)
        if (expectation.format === 'email' && typeof value === 'string') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
            violations.push({
              type: 'format_violation',
              column,
              expected: 'Valid email format',
              actual: String(value),
              severity: 'warning',
              row_sample: i + 2
            });
            break;
          }
        }
      }
    }

    // Check quality thresholds if defined
    const qualityThresholds = contract.quality_thresholds as Record<string, number> | null;
    if (qualityThresholds) {
      // Calculate quick completeness check
      const nullCounts: Record<string, number> = {};
      for (const col of headers) {
        nullCounts[col] = parsedData.filter(row => row[col] === null || row[col] === '').length;
      }

      for (const [metric, threshold] of Object.entries(qualityThresholds)) {
        if (metric === 'min_completeness') {
          const avgCompleteness = 1 - (Object.values(nullCounts).reduce((a, b) => a + b, 0) / (headers.length * parsedData.length));
          if (avgCompleteness < threshold) {
            violations.push({
              type: 'threshold_breach',
              expected: `Completeness >= ${(threshold * 100).toFixed(0)}%`,
              actual: `${(avgCompleteness * 100).toFixed(1)}%`,
              severity: 'critical'
            });
          }
        }
      }
    }

    // Determine result
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const passed = criticalViolations.length === 0;
    
    let enforcement_action: 'allow' | 'warn' | 'block' = 'allow';
    if (!passed) {
      enforcement_action = contract.enforcement_mode === 'block' ? 'block' : 'warn';
    }

    const result: ContractCheckResult = {
      passed,
      violations,
      enforcement_action,
      checked_at: new Date().toISOString()
    };

    // Update upload with contract check results
    await supabase
      .from('data_uploads')
      .update({
        contract_id,
        contract_check_status: passed ? 'passed' : 'failed',
        contract_violations: violations
      })
      .eq('id', upload_id);

    console.log(`[validate-contract] Validation complete: ${passed ? 'PASSED' : 'FAILED'} (${violations.length} violations)`);

    // If enforcement is block and validation failed, don't proceed with audit
    if (enforcement_action === 'block') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Contract validation failed - upload blocked',
          ...result
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger audit-data if validation passed or enforcement is warn
    if (passed || enforcement_action === 'warn') {
      await supabase.functions.invoke('audit-data', {
        body: { upload_id }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[validate-contract] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
