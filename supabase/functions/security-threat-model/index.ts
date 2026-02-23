import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateSession, requireAuth, getServiceClient, corsHeaders, errorResponse, successResponse } from "../_shared/auth-helper.ts";
import { isValidUUID } from "../_shared/input-validation.ts";

const LOVABLE_API_KEY = () => Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const FRAMEWORKS = ["STRIDE", "OWASP_LLM", "MAESTRO", "ATLAS"] as const;
type Framework = typeof FRAMEWORKS[number];

const FRAMEWORK_DESCRIPTIONS: Record<Framework, string> = {
  STRIDE: "Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege",
  OWASP_LLM: "OWASP Top 10 for LLM Applications: Prompt Injection, Insecure Output, Training Data Poisoning, Model DoS, Supply Chain, Sensitive Info Disclosure, Insecure Plugin Design, Excessive Agency, Overreliance, Model Theft",
  MAESTRO: "Multi-Agent Environment Security Threat Risk & Oversight framework layers",
  ATLAS: "MITRE ATLAS - Adversarial Threat Landscape for AI Systems tactics and techniques",
};

async function generateThreats(modelName: string, modelType: string, framework: Framework, systemDetails: string): Promise<any[]> {
  const apiKey = LOVABLE_API_KEY();
  if (!apiKey) {
    return generateFallbackThreats(framework);
  }

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an AI security threat modeling expert. Generate realistic, specific threat vectors for AI/ML systems using the ${framework} framework (${FRAMEWORK_DESCRIPTIONS[framework]}). Be precise and actionable. Use the generate_threats tool.`
          },
          {
            role: "user",
            content: `Generate a threat model for this AI system:\n- Model: ${modelName} (${modelType})\n- System context: ${systemDetails}\n- Framework: ${framework}\n\nProvide 5-8 specific threat vectors with likelihood (1-5), impact (1-5), and concrete mitigations.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_threats",
            description: "Generate structured threat vectors for the AI system",
            parameters: {
              type: "object",
              properties: {
                threats: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      likelihood: { type: "number", description: "1-5 scale" },
                      impact: { type: "number", description: "1-5 scale" },
                      category: { type: "string" },
                      mitigation_checklist: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "description", "likelihood", "impact", "category", "mitigation_checklist"],
                    additionalProperties: false,
                  }
                }
              },
              required: ["threats"],
              additionalProperties: false,
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_threats" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        console.warn(`[security-threat-model] AI Gateway ${response.status}, using fallback`);
        return generateFallbackThreats(framework);
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed.threats || [];
    }
    return generateFallbackThreats(framework);
  } catch (error) {
    console.error("[security-threat-model] Generation error:", error);
    return generateFallbackThreats(framework);
  }
}

function generateFallbackThreats(framework: Framework): any[] {
  return [
    { title: "Prompt Injection Attack", description: "Adversary crafts input to override system instructions", likelihood: 4, impact: 4, category: "Input Manipulation", mitigation_checklist: ["Input sanitization", "Prompt hardening", "Output filtering"] },
    { title: "Training Data Poisoning", description: "Malicious data injected into training pipeline", likelihood: 2, impact: 5, category: "Data Integrity", mitigation_checklist: ["Data provenance tracking", "Anomaly detection on training data", "Periodic retraining audits"] },
    { title: "Model Theft via API", description: "Model weights extracted through repeated API queries", likelihood: 3, impact: 4, category: "IP Protection", mitigation_checklist: ["Rate limiting", "Query logging", "Watermarking outputs"] },
    { title: "Sensitive Information Disclosure", description: "Model reveals PII or proprietary data from training set", likelihood: 3, impact: 5, category: "Data Leakage", mitigation_checklist: ["Differential privacy", "Output scanning", "PII detection in responses"] },
    { title: "Denial of Service via Resource Exhaustion", description: "Crafted inputs causing excessive compute consumption", likelihood: 3, impact: 3, category: "Availability", mitigation_checklist: ["Input length limits", "Timeout enforcement", "Resource quotas"] },
    { title: "Excessive Agency / Autonomous Actions", description: "Model takes actions beyond intended scope", likelihood: 2, impact: 5, category: "Control", mitigation_checklist: ["Human-in-the-loop gates", "Action whitelisting", "Rollback mechanisms"] },
  ];
}

/** Map category to the correct framework-specific column */
function mapCategoryToFrameworkField(framework: Framework, category: string): Record<string, string> {
  switch (framework) {
    case "OWASP_LLM": return { owasp_category: category };
    case "ATLAS": return { atlas_tactic: category };
    case "MAESTRO": return { maestro_layer: category };
    case "STRIDE":
    default: return { owasp_category: category };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    const { user } = authResult;
    const serviceClient = getServiceClient();

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || !isValidUUID(rawBody?.modelId)) {
      return errorResponse("modelId (valid UUID) is required", 400);
    }

    const { modelId } = rawBody;
    const framework: Framework = FRAMEWORKS.includes(rawBody.framework) ? rawBody.framework : "STRIDE";
    console.log(`[security-threat-model] Generating ${framework} threat model for: ${modelId}`);

    // Fetch model info (includes system)
    const { data: model, error: modelError } = await serviceClient
      .from("models")
      .select("*, system:systems(*)")
      .eq("id", modelId)
      .single();

    if (modelError || !model) {
      return errorResponse("Model not found", 404);
    }

    const systemId = model.system_id;
    if (!systemId) {
      return errorResponse("Model has no linked system. Register the model under a system first.", 400);
    }

    const systemDetails = model.system
      ? `System: ${model.system.name}, Provider: ${model.system.provider || 'unknown'}, Risk: ${model.system.risk_tier || 'unclassified'}`
      : "No linked system";

    const computationSteps: any[] = [];

    computationSteps.push({
      step: 1, name: "Model Context Loaded",
      formula: `Framework: ${framework} (${FRAMEWORK_DESCRIPTIONS[framework]})`,
      inputs: { modelName: model.name, modelType: model.model_type, framework },
      result: "Context ready", status: "info",
    });

    // Generate threats
    const threats = await generateThreats(model.name, model.model_type || "llm", framework, systemDetails);

    // Compute risk score
    let totalRisk = 0;
    for (const threat of threats) {
      threat.likelihood = Math.min(5, Math.max(1, threat.likelihood || 3));
      threat.impact = Math.min(5, Math.max(1, threat.impact || 3));
      threat.riskScore = (threat.likelihood * threat.impact) / 25;
      totalRisk += threat.riskScore;
    }

    const riskScore = threats.length > 0 ? totalRisk / threats.length : 0;
    const overallScore = Math.round((1 - riskScore) * 100);

    computationSteps.push({
      step: 2, name: "Individual Risk Scores",
      formula: "riskScore(i) = (likelihood × impact) / 25",
      inputs: { threatCount: threats.length },
      result: threats.map(t => `${t.title}: ${t.riskScore.toFixed(2)}`).join(", "),
      status: "info",
    });

    computationSteps.push({
      step: 3, name: "Aggregate Risk Score",
      formula: `riskScore = avg(individual_risks) = ${totalRisk.toFixed(3)} / ${threats.length}`,
      inputs: { totalRisk: totalRisk.toFixed(3), threatCount: threats.length },
      result: riskScore.toFixed(4),
      status: riskScore > 0.5 ? "fail" : riskScore > 0.3 ? "warn" : "pass",
      threshold: 0.5,
    });

    // Save threat model (correct schema)
    const { data: threatModel, error: tmError } = await serviceClient
      .from("threat_models")
      .insert({
        system_id: systemId,
        name: `${framework} Threat Model: ${model.name}`,
        framework,
        risk_score: riskScore,
        description: `${framework} threat analysis for ${model.name}. ${threats.length} threats identified. Risk: ${(riskScore * 100).toFixed(0)}%`,
        architecture_graph: { computationSteps, overallScore, model_id: modelId },
        created_by: user!.id,
      })
      .select("id")
      .single();

    if (tmError) console.error("[security-threat-model] Failed to save threat model:", tmError);

    // Save individual threat vectors (correct schema)
    if (threatModel) {
      for (const threat of threats) {
        const frameworkField = mapCategoryToFrameworkField(framework, threat.category);
        await serviceClient.from("threat_vectors").insert({
          threat_model_id: threatModel.id,
          title: threat.title,
          description: threat.description,
          likelihood: threat.likelihood,
          impact: threat.impact,
          mitigation_checklist: threat.mitigation_checklist,
          ...frameworkField,
        });
      }
    }

    // Save test run for dashboard consistency (correct schema)
    const riskLevel = riskScore > 0.5 ? "high" : riskScore > 0.3 ? "medium" : "low";
    await serviceClient.from("security_test_runs").insert({
      test_type: "threat_model",
      system_id: systemId,
      status: "completed",
      summary: {
        overall_score: 1 - riskScore,
        risk_level: riskLevel,
        framework,
        threats,
        risk_score: riskScore,
        computation_steps: computationSteps,
        overall_score_pct: overallScore,
        model_id: modelId,
      },
      tests_total: threats.length,
      tests_passed: threats.filter(t => t.riskScore <= 0.3).length,
      tests_failed: threats.filter(t => t.riskScore > 0.3).length,
      coverage_percentage: (1 - riskScore) * 100,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      triggered_by: user!.id,
    });

    // Auto-escalation if high risk
    if (riskScore > 0.5) {
      await serviceClient.from("review_queue").insert({
        review_type: "security_threat_model",
        model_id: modelId,
        severity: riskScore > 0.7 ? "critical" : "high",
        status: "pending",
        title: `Threat Model HIGH RISK: ${framework} analysis for ${model.name}`,
        description: `${threats.length} threats identified. Aggregate risk: ${(riskScore * 100).toFixed(0)}%. HITL review required.`,
        context: { framework, riskScore, threatCount: threats.length, threatModelId: threatModel?.id },
      });
    }

    return successResponse({
      threats,
      riskScore,
      overallScore,
      framework,
      computationSteps,
      threatModelId: threatModel?.id,
      latencyMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[security-threat-model] Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});