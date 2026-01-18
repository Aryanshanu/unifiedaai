import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RemediationPlan {
  action_type: string;
  description: string;
  sql_preview: string;
  python_script?: string;
  affected_rows: number;
  affected_columns: string[];
  safety_score: number;
  reversible: boolean;
  estimated_impact: {
    before_score: number;
    after_score: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    console.log(`[generate-remediation] Generating remediations for upload ${upload_id}`);

    // Fetch upload and its issues
    const [uploadResult, issuesResult] = await Promise.all([
      supabase.from('data_uploads').select('*').eq('id', upload_id).single(),
      supabase.from('quality_issues').select('*').eq('upload_id', upload_id).eq('status', 'open')
    ]);

    if (uploadResult.error || !uploadResult.data) {
      throw new Error(`Upload not found: ${uploadResult.error?.message}`);
    }

    const upload = uploadResult.data;
    const issues = issuesResult.data || [];
    const currentScore = upload.quality_score || 0;

    console.log(`[generate-remediation] Found ${issues.length} open issues`);

    const remediationPlans: RemediationPlan[] = [];

    // Group issues by type and generate remediations
    const issueGroups: Record<string, typeof issues> = {};
    for (const issue of issues) {
      if (!issueGroups[issue.issue_type]) {
        issueGroups[issue.issue_type] = [];
      }
      issueGroups[issue.issue_type].push(issue);
    }

    for (const [issueType, groupedIssues] of Object.entries(issueGroups)) {
      const affectedColumns = [...new Set(groupedIssues.map(i => i.column_name).filter(Boolean))] as string[];
      const affectedRows = groupedIssues.length;

      switch (issueType) {
        case 'null_value':
        case 'missing_value': {
          // For null values, suggest deletion or imputation
          const nullColumns = affectedColumns.join(', ');
          
          // Delete rows option
          remediationPlans.push({
            action_type: 'DELETE_ROWS',
            description: `Remove ${affectedRows} rows with null values in columns: ${nullColumns}`,
            sql_preview: `-- Delete rows with null values\nDELETE FROM dq_data\nWHERE upload_id = '${upload_id}'\n  AND (${affectedColumns.map(c => `raw_data->>'${c}' IS NULL OR raw_data->>'${c}' = ''`).join(' OR ')});`,
            affected_rows: affectedRows,
            affected_columns: affectedColumns,
            safety_score: 75,
            reversible: true,
            estimated_impact: {
              before_score: currentScore,
              after_score: Math.min(100, currentScore + Math.round(affectedRows * 0.5))
            }
          });

          // Impute with mode option (for categorical)
          remediationPlans.push({
            action_type: 'IMPUTE_MODE',
            description: `Fill null values with most frequent value in columns: ${nullColumns}`,
            sql_preview: `-- Impute nulls with mode value\nUPDATE dq_data\nSET raw_data = raw_data || jsonb_build_object('${affectedColumns[0]}', (\n  SELECT mode() WITHIN GROUP (ORDER BY raw_data->>'${affectedColumns[0]}')\n  FROM dq_data WHERE upload_id = '${upload_id}'\n))\nWHERE upload_id = '${upload_id}'\n  AND (raw_data->>'${affectedColumns[0]}' IS NULL);`,
            affected_rows: affectedRows,
            affected_columns: affectedColumns,
            safety_score: 85,
            reversible: true,
            estimated_impact: {
              before_score: currentScore,
              after_score: Math.min(100, currentScore + Math.round(affectedRows * 0.7))
            }
          });
          break;
        }

        case 'duplicate_value':
        case 'duplicate_id': {
          remediationPlans.push({
            action_type: 'DEDUPLICATE',
            description: `Remove ${affectedRows} duplicate records`,
            sql_preview: `-- Remove duplicates, keeping first occurrence\nDELETE FROM dq_data a\nUSING dq_data b\nWHERE a.upload_id = '${upload_id}'\n  AND b.upload_id = '${upload_id}'\n  AND a.record_hash = b.record_hash\n  AND a.row_index > b.row_index;`,
            affected_rows: affectedRows,
            affected_columns: affectedColumns,
            safety_score: 90,
            reversible: true,
            estimated_impact: {
              before_score: currentScore,
              after_score: Math.min(100, currentScore + Math.round(affectedRows * 0.8))
            }
          });
          break;
        }

        case 'format_violation': {
          if (affectedColumns.some(c => c?.toLowerCase().includes('email'))) {
            remediationPlans.push({
              action_type: 'NORMALIZE_FORMAT',
              description: `Normalize email format in ${affectedRows} rows`,
              sql_preview: `-- Normalize email format (lowercase, trim)\nUPDATE dq_data\nSET raw_data = raw_data || jsonb_build_object('email', \n  LOWER(TRIM(raw_data->>'email'))\n)\nWHERE upload_id = '${upload_id}'\n  AND raw_data->>'email' IS NOT NULL;`,
              python_script: `# Python script for email normalization\nimport re\n\ndef normalize_email(email):\n    if not email:\n        return None\n    email = email.strip().lower()\n    # Fix common typos\n    email = re.sub(r'\\.c$', '.com', email)\n    email = re.sub(r'@gmial\\.', '@gmail.', email)\n    return email`,
              affected_rows: affectedRows,
              affected_columns: affectedColumns,
              safety_score: 95,
              reversible: true,
              estimated_impact: {
                before_score: currentScore,
                after_score: Math.min(100, currentScore + Math.round(affectedRows * 0.6))
              }
            });
          }

          // General whitespace trim
          remediationPlans.push({
            action_type: 'TRIM_WHITESPACE',
            description: `Trim whitespace from ${affectedColumns.length} columns`,
            sql_preview: `-- Trim whitespace from all text columns\n${affectedColumns.map(c => 
              `UPDATE dq_data\nSET raw_data = raw_data || jsonb_build_object('${c}', TRIM(raw_data->>'${c}'))\nWHERE upload_id = '${upload_id}';`
            ).join('\n\n')}`,
            affected_rows: affectedRows,
            affected_columns: affectedColumns,
            safety_score: 98,
            reversible: true,
            estimated_impact: {
              before_score: currentScore,
              after_score: Math.min(100, currentScore + 2)
            }
          });
          break;
        }

        case 'type_mismatch': {
          remediationPlans.push({
            action_type: 'CAST_TYPE',
            description: `Fix type mismatches in ${affectedRows} rows`,
            sql_preview: `-- Attempt to cast values to correct type\nUPDATE bronze_data\nSET raw_data = raw_data || jsonb_build_object('${affectedColumns[0]}',\n  CASE \n    WHEN raw_data->>'${affectedColumns[0]}' ~ '^[0-9]+\\.?[0-9]*$' \n    THEN (raw_data->>'${affectedColumns[0]}')::numeric\n    ELSE NULL\n  END\n)\nWHERE upload_id = '${upload_id}';`,
            affected_rows: affectedRows,
            affected_columns: affectedColumns,
            safety_score: 70,
            reversible: true,
            estimated_impact: {
              before_score: currentScore,
              after_score: Math.min(100, currentScore + Math.round(affectedRows * 0.5))
            }
          });
          break;
        }
      }
    }

    // Insert remediation actions into database
    if (remediationPlans.length > 0) {
      const actionsToInsert = remediationPlans.map(plan => ({
        upload_id,
        action_type: plan.action_type,
        description: plan.description,
        sql_preview: plan.sql_preview,
        python_script: plan.python_script,
        affected_rows: plan.affected_rows,
        affected_columns: plan.affected_columns,
        safety_score: plan.safety_score,
        reversible: plan.reversible,
        estimated_impact: plan.estimated_impact,
        status: 'pending'
      }));

      const { error: insertError } = await supabase
        .from('remediation_actions')
        .insert(actionsToInsert);

      if (insertError) {
        console.error('[generate-remediation] Insert error:', insertError);
      }
    }

    console.log(`[generate-remediation] Generated ${remediationPlans.length} remediation plans`);

    return new Response(
      JSON.stringify({
        success: true,
        remediation_count: remediationPlans.length,
        plans: remediationPlans
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-remediation] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
