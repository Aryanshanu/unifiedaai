import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple SHA-256 hash function
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    if (req.method === 'POST') {
      const { action, testRunId, evidence, evidenceHash } = await req.json();

      if (action === 'capture') {
        // Capture evidence with hash
        if (!testRunId || !evidence) {
          return new Response(
            JSON.stringify({ error: 'testRunId and evidence are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const evidenceString = JSON.stringify(evidence);
        const hash = await sha256(evidenceString);
        const timestamp = new Date().toISOString();

        // Update test run with evidence
        const { error: updateError } = await supabase
          .from('security_test_runs')
          .update({
            summary: {
              evidence: evidenceString,
              evidenceHash: hash,
              capturedAt: timestamp,
            },
          })
          .eq('id', testRunId);

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            hash,
            timestamp,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'verify') {
        // Verify evidence integrity
        if (!testRunId || !evidenceHash) {
          return new Response(
            JSON.stringify({ error: 'testRunId and evidenceHash are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: testRun, error: fetchError } = await supabase
          .from('security_test_runs')
          .select('summary')
          .eq('id', testRunId)
          .single();

        if (fetchError || !testRun) {
          return new Response(
            JSON.stringify({ error: 'Test run not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const storedHash = testRun.summary?.evidenceHash;
        const isValid = storedHash === evidenceHash;

        return new Response(
          JSON.stringify({
            valid: isValid,
            storedHash,
            providedHash: evidenceHash,
            capturedAt: testRun.summary?.capturedAt,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'GET' && path && path !== 'security-evidence-service') {
      // Get evidence for a test run
      const testRunId = path;

      const { data: testRun, error: fetchError } = await supabase
        .from('security_test_runs')
        .select('*')
        .eq('id', testRunId)
        .single();

      if (fetchError || !testRun) {
        return new Response(
          JSON.stringify({ error: 'Test run not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Also fetch associated findings
      const { data: findings } = await supabase
        .from('security_findings')
        .select('*')
        .eq('test_run_id', testRunId);

      return new Response(
        JSON.stringify({
          testRun,
          findings: findings || [],
          evidenceHash: testRun.summary?.evidenceHash,
          capturedAt: testRun.summary?.capturedAt,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Evidence service error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
