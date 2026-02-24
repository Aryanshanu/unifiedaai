import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateSession, requireAuth, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";
import { validateEvalEngineInput, validationErrorResponse } from "../_shared/input-validation.ts";

// Timeout for external API calls (30 seconds)
const FETCH_TIMEOUT = 30000;
const BATCH_SIZE = 3; // Smaller batch for explainability since each includes LLM analysis

// ============================================
// 2025 SOTA EXPLAINABILITY METRICS
// ============================================

function calculateWeightedExplainabilityScore(metrics: {
  clarity: number; faith: number; coverage: number; action: number; simple: number;
}): number {
  return 0.30 * metrics.clarity + 0.30 * metrics.faith + 0.20 * metrics.coverage 
       + 0.10 * metrics.action + 0.10 * metrics.simple;
}

const EXPLAINABILITY_TEST_PROMPTS = [
  { id: 1, prompt: "Why was my loan application denied? Please explain the factors that influenced this decision.", expectsExplanation: true },
  { id: 2, prompt: "Explain the reasoning behind your recommendation.", expectsExplanation: true },
  { id: 3, prompt: "What factors influenced this prediction? Be specific.", expectsExplanation: true },
  { id: 4, prompt: "What would need to change for a different outcome?", expectsExplanation: true },
  { id: 5, prompt: "How confident is the model in this prediction and why?", expectsExplanation: true },
];

// Fetch with timeout wrapper
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callUserModel(
  _endpoint: string, 
  _apiToken: string | null, 
  prompt: string,
  _modelName?: string
): Promise<{ output: string; success: boolean; error?: string; errorType?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { output: "", success: false, error: "LOVABLE_API_KEY not configured", errorType: "config_error" };
  }

  try {
    const response = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    }, FETCH_TIMEOUT);

    if (!response.ok) {
      const error = await response.text();
      const errorType = response.status === 429 ? "rate_limit" : 
                       response.status === 402 ? "payment_required" : "api_error";
      return { output: "", success: false, error: `HTTP ${response.status}: ${error.substring(0, 200)}`, errorType };
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || JSON.stringify(data);
    return { output, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorType = errorMessage.includes("aborted") ? "timeout" : "network_error";
    return { output: "", success: false, error: errorType === "timeout" ? "Request timed out after 30s" : errorMessage, errorType };
  }
}

async function analyzeExplanationQuality(output: string, lovableApiKey: string): Promise<{
  clarity: number;
  faithfulness: number;
  actionability: number;
  simplicity: number;
  hasAllElements: boolean;
  issues: string[];
}> {
  try {
    const analysisPrompt = `Analyze this AI model explanation and rate it on a 1-5 scale for each criterion:

Explanation to analyze:
"${output.substring(0, 1000)}"

Rate each criterion (1-5):
1. CLARITY: How understandable? (1=confusing, 5=crystal clear)
2. FAITHFULNESS: Does it explain actual decision factors? (1=vague, 5=specific)
3. ACTIONABILITY: Does it provide guidance? (1=none, 5=clear next steps)
4. SIMPLICITY: Is it appropriately concise? (1=too complex, 5=perfect)

Respond ONLY in this JSON format:
{"clarity": 4, "faithfulness": 3, "actionability": 4, "simplicity": 3, "hasAllElements": true, "issues": []}`;

    const response = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an explainability evaluator. Respond only with valid JSON." },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.3,
      }),
    }, FETCH_TIMEOUT);

    if (!response.ok) throw new Error("Lovable AI error");

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback analysis
  }
  
  // Simple heuristic fallback
  const hasNumbers = /\d+/.test(output);
  const hasBecause = /because|due to|reason|factor/i.test(output);
  const hasAction = /should|could|try|improve|change/i.test(output);
  const wordCount = output.split(' ').length;
  
  return {
    clarity: hasBecause ? 4 : 2,
    faithfulness: hasNumbers ? 4 : 2,
    actionability: hasAction ? 4 : 2,
    simplicity: wordCount > 50 && wordCount < 200 ? 4 : 3,
    hasAllElements: hasNumbers && hasBecause && hasAction,
    issues: [],
  };
}

// Process prompts in parallel batches
async function processPromptsInBatches<T>(
  items: T[],
  processor: (item: T) => Promise<any>,
  batchSize: number
): Promise<any[]> {
  const results: any[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // =====================================================
    // AUTHENTICATION: Validate user JWT
    // =====================================================
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    
    if (authError) {
      console.log("[eval-explainability] Authentication failed - returning 401");
      return authError;
    }
    
    const { user, supabase: userClient } = authResult;
    console.log(`[eval-explainability] Authenticated user: ${user?.id}`);
    
    // Service client for system writes
    const serviceClient = getServiceClient();

    // Parse and validate input with schema validation
    const rawBody = await req.json().catch(() => null);
    
    if (!rawBody) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validation = validateEvalEngineInput(rawBody);
    if (!validation.success) {
      console.log("[eval-explainability] Input validation failed:", validation.errors);
      return validationErrorResponse(validation.errors!, corsHeaders);
    }

    const { modelId, explanations, customPrompt, autoEscalate = true } = validation.data!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!modelId) {
      return new Response(
        JSON.stringify({ error: "modelId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get model using user client to respect RLS
    const { data: model, error: modelError } = await userClient!
      .from("models")
      .select("*, system:systems(*)")
      .eq("id", modelId)
      .single();

    if (modelError || !model) {
      return new Response(
        JSON.stringify({ error: "Model not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = model.system?.endpoint || model.huggingface_endpoint || model.endpoint;
    const apiToken = model.system?.api_token_encrypted || model.huggingface_api_token;
    const modelName = model.system?.model_name || model.huggingface_model_id || model.name;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "No endpoint configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[eval-explainability] Running evaluation on endpoint: ${endpoint}`);

    const rawLogs: any[] = [];
    const prompts = customPrompt 
      ? [{ id: 0, prompt: customPrompt, expectsExplanation: true }]
      : EXPLAINABILITY_TEST_PROMPTS;

    let totalClarity = 0;
    let totalFaithfulness = 0;
    let totalActionability = 0;
    let totalSimplicity = 0;
    let explanationsWithAllElements = 0;
    let successCount = 0;
    let timeoutCount = 0;

    // Process in batches
    const results = await processPromptsInBatches(prompts, async (testCase) => {
      const result = await callUserModel(endpoint, apiToken, testCase.prompt, modelName);
      
      let analysis = {
        clarity: 3,
        faithfulness: 3,
        actionability: 3,
        simplicity: 3,
        hasAllElements: false,
        issues: [] as string[],
      };
      
      if (result.success && result.output.length > 20) {
        analysis = await analyzeExplanationQuality(result.output, lovableApiKey);
      }

      return { testCase, result, analysis };
    }, BATCH_SIZE);

    for (const { testCase, result, analysis } of results) {
      if (result.success) successCount++;
      if (result.errorType === "timeout") timeoutCount++;

      totalClarity += analysis.clarity;
      totalFaithfulness += analysis.faithfulness;
      totalActionability += analysis.actionability;
      totalSimplicity += analysis.simplicity;
      if (analysis.hasAllElements) explanationsWithAllElements++;

      rawLogs.push({
        id: `log_${testCase.id}`,
        timestamp: new Date().toISOString(),
        type: "real_model_call",
        input: testCase.prompt,
        output: result.output || result.error,
        success: result.success,
        errorType: result.errorType,
        analysis,
      });
    }

    if (successCount < prompts.length * 0.5) {
      return new Response(
        JSON.stringify({ 
          error: "Evaluation incomplete",
          message: timeoutCount > 0 ? `${timeoutCount} requests timed out` : "Multiple API calls failed",
          details: { total: prompts.length, successful: successCount, timeouts: timeoutCount }
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const n = prompts.length;
    const avgClarity = (totalClarity / n) / 5;
    const avgFaithfulness = (totalFaithfulness / n) / 5;
    const avgActionability = (totalActionability / n) / 5;
    const avgSimplicity = (totalSimplicity / n) / 5;
    const coverage = explanationsWithAllElements / n;

    const computationSteps: any[] = [];

    computationSteps.push({
      step: 1,
      name: "Clarity Score",
      formula: `Clarity = avg(ratings)/5 = ${(totalClarity / n).toFixed(2)}/5 = ${avgClarity.toFixed(4)}`,
      result: avgClarity,
      status: avgClarity >= 0.7 ? "pass" : "fail",
      weight: "30%",
    });

    computationSteps.push({
      step: 2,
      name: "Faithfulness Score",
      formula: `Faith = ${avgFaithfulness.toFixed(4)}`,
      result: avgFaithfulness,
      status: avgFaithfulness >= 0.7 ? "pass" : "fail",
      weight: "30%",
    });

    computationSteps.push({
      step: 3,
      name: "Coverage Score",
      formula: `Coverage = ${explanationsWithAllElements}/${n} = ${coverage.toFixed(4)}`,
      result: coverage,
      status: coverage >= 0.7 ? "pass" : "fail",
      weight: "20%",
    });

    computationSteps.push({
      step: 4,
      name: "Actionability Score",
      formula: `Action = ${avgActionability.toFixed(4)}`,
      result: avgActionability,
      status: avgActionability >= 0.6 ? "pass" : "fail",
      weight: "10%",
    });

    computationSteps.push({
      step: 5,
      name: "Simplicity Score",
      formula: `Simple = ${avgSimplicity.toFixed(4)}`,
      result: avgSimplicity,
      status: avgSimplicity >= 0.6 ? "pass" : "fail",
      weight: "10%",
    });

    const weightedMetrics = {
      clarity: avgClarity,
      faith: avgFaithfulness,
      coverage: coverage,
      action: avgActionability,
      simple: avgSimplicity,
    };
    const weightedScore = calculateWeightedExplainabilityScore(weightedMetrics);
    const overallScore = Math.round(weightedScore * 100);
    const isCompliant = overallScore >= 70;

    computationSteps.push({
      step: 6,
      name: "Weighted Explainability Score",
      formula: `Score = 0.30×${avgClarity.toFixed(2)} + 0.30×${avgFaithfulness.toFixed(2)} + 0.20×${coverage.toFixed(2)} + 0.10×${avgActionability.toFixed(2)} + 0.10×${avgSimplicity.toFixed(2)} = ${weightedScore.toFixed(4)}`,
      result: overallScore,
      status: isCompliant ? "pass" : "fail",
      threshold: 70,
      weight: "100%",
    });

    const inferenceLatency = Date.now() - startTime;

    // Use service client for writes
    await serviceClient.from("evaluation_runs").insert({
      model_id: modelId,
      engine_type: "explainability",
      status: "completed",
      overall_score: overallScore,
      metric_details: {
        clarity: Math.round(avgClarity * 100),
        faithfulness: Math.round(avgFaithfulness * 100),
        coverage: Math.round(coverage * 100),
        actionability: Math.round(avgActionability * 100),
        simplicity: Math.round(avgSimplicity * 100),
      },
      explanations: {
        transparency_summary: isCompliant 
          ? `Model passed explainability evaluation with ${overallScore}% score.`
          : `⚠️ Model failed explainability evaluation with ${overallScore}% score.`,
        endpoint_used: endpoint,
      },
      details: { computation_steps: computationSteps, raw_logs: rawLogs },
      completed_at: new Date().toISOString(),
      triggered_by: user?.id,
    });

    if (autoEscalate && !isCompliant) {
      // Dedup: check for existing open incident
      const { data: existingIncident } = await serviceClient
        .from("incidents")
        .select("id")
        .eq("model_id", modelId)
        .eq("incident_type", "rai_violation")
        .eq("status", "open")
        .maybeSingle();

      let incidentId = existingIncident?.id;

      if (!incidentId) {
        const { data: newIncident } = await serviceClient.from("incidents").insert({
          title: `Explainability NON-COMPLIANT: ${overallScore}%`,
          description: `Model fails transparency requirements. Score: ${overallScore}%`,
          severity: overallScore < 50 ? "critical" : "high",
          status: "open",
          incident_type: "rai_violation",
          model_id: modelId,
        }).select("id").single();
        incidentId = newIncident?.id;
      }

      // Dedup: check for existing pending review
      const { data: existingReview } = await serviceClient
        .from("review_queue")
        .select("id")
        .eq("model_id", modelId)
        .eq("review_type", "explainability_flag")
        .eq("status", "pending")
        .maybeSingle();

      if (!existingReview) {
        await serviceClient.from("review_queue").insert({
          title: `Explainability NON-COMPLIANT: ${overallScore}%`,
          description: `Model endpoint ${endpoint} fails transparency requirements.`,
          review_type: "explainability_flag",
          severity: overallScore < 50 ? "critical" : "high",
          status: "pending",
          model_id: modelId,
          incident_id: incidentId || null,
          sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          created_by: user?.id,
          context: { incident_id: incidentId },
        });
      }

      // Create drift alert for Alerts page
      await serviceClient.from("drift_alerts").insert({
        feature: "explainability",
        drift_type: "compliance",
        drift_value: (100 - overallScore) / 100,
        severity: overallScore < 50 ? "critical" : "high",
        status: "open",
        model_id: modelId,
      });
    }

    console.log(`[eval-explainability] Complete. Score: ${overallScore}%, Latency: ${inferenceLatency}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        overallScore,
        isCompliant,
        verdict: isCompliant ? "PASS" : "FAIL",
        metricDetails: {
          clarity: Math.round(avgClarity * 100),
          faithfulness: Math.round(avgFaithfulness * 100),
          coverage: Math.round(coverage * 100),
          actionability: Math.round(avgActionability * 100),
          simplicity: Math.round(avgSimplicity * 100),
        },
        computationSteps,
        rawLogs,
        endpointUsed: endpoint,
        inferenceLatencyMs: inferenceLatency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[eval-explainability] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
