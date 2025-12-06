import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting red team simulation...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active test cases
    const { data: testCases, error: testsError } = await supabase
      .from("red_team_tests")
      .select("*")
      .eq("is_active", true);

    if (testsError) {
      console.error("Error fetching test cases:", testsError);
      throw testsError;
    }

    console.log(`Found ${testCases?.length || 0} active test cases`);

    // Get deployed systems to test
    const { data: systems, error: systemsError } = await supabase
      .from("systems")
      .select("id, name, project_id")
      .in("deployment_status", ["deployed", "approved"]);

    if (systemsError) {
      console.error("Error fetching systems:", systemsError);
      throw systemsError;
    }

    console.log(`Testing ${systems?.length || 0} deployed systems`);

    const results: any[] = [];
    const gatewayUrl = `${supabaseUrl}/functions/v1/ai-gateway`;

    for (const system of systems || []) {
      console.log(`Testing system: ${system.name} (${system.id})`);
      
      for (const test of testCases || []) {
        try {
          const traceId = `redteam_${test.id}_${Date.now()}`;
          
          const response = await fetch(gatewayUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              systemId: system.id,
              input: {
                messages: [{ role: "user", content: test.prompt }],
              },
              traceId,
            }),
          });

          const result = await response.json();
          const wasBlocked = response.status === 451 || result.decision === "BLOCK";
          const passed = wasBlocked; // For adversarial tests, blocking is success

          results.push({
            systemId: system.id,
            systemName: system.name,
            testId: test.id,
            category: test.category,
            severity: test.severity,
            prompt: test.prompt.substring(0, 50) + "...",
            expectedBehavior: test.expected_behavior,
            wasBlocked,
            passed,
            statusCode: response.status,
            traceId,
          });

          // If test failed (should have been blocked but wasn't), create an incident
          if (!passed) {
            console.warn(`Red team test FAILED for ${system.name}: ${test.category}`);
            
            await supabase.from("incidents").insert({
              title: `Red Team Test Failed: ${test.category}`,
              description: `System "${system.name}" failed to block adversarial prompt.\nExpected: ${test.expected_behavior}\nPrompt: ${test.prompt.substring(0, 100)}...`,
              incident_type: "red_team_failure",
              severity: test.severity,
              status: "open",
              model_id: null,
            });
          }

        } catch (err) {
          console.error(`Error running test ${test.id} on system ${system.id}:`, err);
          results.push({
            systemId: system.id,
            testId: test.id,
            error: err instanceof Error ? err.message : "Unknown error",
            passed: false,
          });
        }
      }
    }

    // Calculate summary
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    console.log(`Red team simulation complete: ${passedTests}/${totalTests} passed (${passRate}%)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: {
          totalTests,
          passedTests,
          failedTests,
          passRate,
        },
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Red team simulation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
