import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  scenario_id: string;
  scenario_name: string;
  actual_score: number;
  detected_issues: string[];
  passed: boolean;
  failure_reasons: string[];
  execution_time_ms: number;
}

// Simulate quality scoring for test scenarios
function calculateTestScore(data: Record<string, unknown>[]): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let deductions = 0;

  if (data.length === 0) {
    return { score: 0, issues: ['empty_data'] };
  }

  const headers = Object.keys(data[0]);
  
  // Check for null values
  let nullCount = 0;
  for (const row of data) {
    for (const key of headers) {
      if (row[key] === null || row[key] === '') {
        nullCount++;
        if (!issues.includes('null_value')) issues.push('null_value');
      }
    }
  }
  deductions += (nullCount / (data.length * headers.length)) * 25;

  // Check for duplicates (by id if exists)
  const idField = headers.find(h => h.toLowerCase() === 'id');
  if (idField) {
    const ids = data.map(row => row[idField]);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size < ids.length) {
      issues.push('duplicate_id');
      deductions += 15;
    }
  }

  // Check email format
  const emailField = headers.find(h => h.toLowerCase().includes('email'));
  if (emailField) {
    for (const row of data) {
      const email = row[emailField];
      if (typeof email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        if (!issues.includes('format_violation')) issues.push('format_violation');
        deductions += 5;
      }
    }
  }

  // Check for type mismatches
  const numericFields = headers.filter(h => 
    h.toLowerCase().includes('score') || 
    h.toLowerCase().includes('count') ||
    h.toLowerCase().includes('age')
  );
  
  for (const field of numericFields) {
    for (const row of data) {
      const value = row[field];
      if (value !== null && typeof value !== 'number') {
        if (!issues.includes('type_mismatch')) issues.push('type_mismatch');
        deductions += 10;
        break;
      }
    }
  }

  // Check for stale dates (older than 1 year)
  const dateFields = headers.filter(h => 
    h.toLowerCase().includes('date') || 
    h.toLowerCase().includes('login') ||
    h.toLowerCase().includes('_at')
  );
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  for (const field of dateFields) {
    for (const row of data) {
      const dateStr = row[field];
      if (typeof dateStr === 'string') {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          if (date < oneYearAgo) {
            if (!issues.includes('stale_data')) issues.push('stale_data');
            deductions += 5;
          }
          // Future date check
          if (date > new Date()) {
            if (!issues.includes('future_date')) issues.push('future_date');
            deductions += 10;
          }
        }
      }
    }
  }

  const score = Math.max(0, Math.min(100, 100 - deductions));
  return { score: Math.round(score), issues };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user for recording results
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { scenario_id } = await req.json();

    // Fetch scenarios to run
    let scenarios;
    if (scenario_id) {
      const { data, error } = await supabase
        .from('test_scenarios')
        .select('*')
        .eq('id', scenario_id)
        .single();
      
      if (error) throw new Error(`Scenario not found: ${error.message}`);
      scenarios = [data];
    } else {
      const { data, error } = await supabase
        .from('test_scenarios')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      scenarios = data || [];
    }

    console.log(`[run-quality-tests] Running ${scenarios.length} test scenarios`);

    const results: TestResult[] = [];

    for (const scenario of scenarios) {
      const startTime = Date.now();
      const failureReasons: string[] = [];

      // Parse input payload
      const inputData = Array.isArray(scenario.input_payload) 
        ? scenario.input_payload 
        : [scenario.input_payload];

      // Calculate score and detect issues
      const { score, issues } = calculateTestScore(inputData);

      // Check if score is within expected range
      if (score < scenario.expected_score_min || score > scenario.expected_score_max) {
        failureReasons.push(
          `Score ${score}% outside expected range [${scenario.expected_score_min}%-${scenario.expected_score_max}%]`
        );
      }

      // Check if expected issues were detected
      const expectedIssues = scenario.expected_issues || [];
      for (const expectedIssue of expectedIssues) {
        if (!issues.includes(expectedIssue)) {
          failureReasons.push(`Expected issue "${expectedIssue}" was not detected`);
        }
      }

      // Check if forbidden issues were detected
      const forbiddenIssues = scenario.forbidden_issues || [];
      for (const forbiddenIssue of forbiddenIssues) {
        if (issues.includes(forbiddenIssue)) {
          failureReasons.push(`Forbidden issue "${forbiddenIssue}" was incorrectly detected`);
        }
      }

      const passed = failureReasons.length === 0;
      const executionTime = Date.now() - startTime;

      const result: TestResult = {
        scenario_id: scenario.id,
        scenario_name: scenario.name,
        actual_score: score,
        detected_issues: issues,
        passed,
        failure_reasons: failureReasons,
        execution_time_ms: executionTime
      };

      results.push(result);

      // Record result in database
      await supabase.from('test_run_results').insert({
        scenario_id: scenario.id,
        actual_score: score,
        detected_issues: issues,
        passed,
        failure_reasons: failureReasons,
        execution_time_ms: executionTime,
        run_by: userId
      });

      console.log(`[run-quality-tests] ${scenario.name}: ${passed ? 'PASSED' : 'FAILED'} (score: ${score}%)`);
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      pass_rate: Math.round((results.filter(r => r.passed).length / results.length) * 100)
    };

    console.log(`[run-quality-tests] Complete: ${summary.passed}/${summary.total} passed (${summary.pass_rate}%)`);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[run-quality-tests] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
