import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateSession, requireAuth, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";
import { validateAIGatewayInput, validationErrorResponse } from "../_shared/input-validation.ts";

// =====================================================
// RATE LIMITING (Database-backed persistent rate limiting)
// =====================================================
const RATE_LIMIT = 100; // 100 requests per minute per system
const RATE_WINDOW_MS = 60000;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

async function checkRateLimitDB(
  systemId: string, 
  serviceClient: any
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  
  try {
    // Count recent requests in the time window
    const { count, error: countError } = await serviceClient
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', `system:${systemId}`)
      .gte('window_start', windowStart);
    
    if (countError) {
      console.error('[ai-gateway] Rate limit check error:', countError);
      // SECURITY FIX: Fail CLOSED on DB error - security first over availability
      return { allowed: false, remaining: 0, resetIn: 60 };
    }
    
    const currentCount = count || 0;
    
    if (currentCount >= RATE_LIMIT) {
      console.log(`[ai-gateway] Rate limit exceeded for system: ${systemId} (${currentCount}/${RATE_LIMIT})`);
      return { allowed: false, remaining: 0, resetIn: 60 };
    }
    
    // Insert new rate limit entry
    await serviceClient.from('rate_limits').insert({
      identifier: `system:${systemId}`,
      window_start: new Date().toISOString(),
      window_ms: RATE_WINDOW_MS
    });
    
    return { 
      allowed: true, 
      remaining: RATE_LIMIT - currentCount - 1, 
      resetIn: 60 
    };
  } catch (error) {
    console.error('[ai-gateway] Rate limiting error:', error);
    // SECURITY FIX: Fail CLOSED on error - security first over availability
    return { allowed: false, remaining: 0, resetIn: 60 };
  }
}

// Simple PII detection patterns - EXPANDED with India-specific patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b|\b\d{10}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
  // India-specific PII patterns - CRITICAL FIX
  aadhaar: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Aadhaar: 1234-5678-9012 or 1234 5678 9012
  pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g, // PAN: ABCDE1234F
  upi: /\b[\w.-]+@[\w]+\b/g, // UPI: name@upi or name@bank
  indianPhone: /\b(\+91[-\s]?)?[6-9]\d{9}\b/g, // Indian mobile: +91 9876543210
  passport: /\b[A-Z]\d{7}\b/g, // Indian passport: A1234567
};

// EXPANDED harmful content keywords - includes religious/ethnic hate speech
const HARMFUL_KEYWORDS = [
  // Self-harm patterns
  "how to harm myself", "hurt myself", "harm my body", "harm myself",
  "end my life", "kill myself", "commit suicide", "suicide methods",
  "self harm", "self-harm",
  // Violence patterns
  "kill yourself", "how to make a bomb", "synthesize drugs", "child exploitation",
  // Chemical harm
  "harm using chemicals", "poison myself", "dangerous chemicals to hurt",
  // General dangerous
  "how to hurt someone", "how to kill", "how to attack",
  // Religious hate speech - CRITICAL FIX
  "hate all muslims", "hate muslims", "kill muslims", "death to muslims",
  "hate all jews", "hate jews", "kill jews", "death to jews",
  "hate all christians", "hate christians", "kill christians", "death to christians",
  "hate all hindus", "hate hindus", "kill hindus", "death to hindus",
  // Ethnic hate speech
  "hate all blacks", "kill blacks", "death to blacks",
  "hate all whites", "kill whites", "death to whites",
  "hate all asians", "kill asians", "death to asians",
  // Generic hate patterns
  "i hate all", "death to all", "kill all", "exterminate",
  // Slurs and derogatory terms (abbreviated for detection)
  "terrorist", "vermin", "subhuman", "inferior race",
];

// FIX #2: Expanded secret patterns with sk-test and JWT detection
const SECRET_PATTERNS = {
  apiKey: /\b(api[_-]?key|apikey)\s*[:=]\s*['"]?[\w-]{20,}['"]?/gi,
  // FIX #2: Add sk- prefix pattern (OpenAI style keys)
  skPrefix: /\bsk-[a-zA-Z0-9]{10,}\b/g,
  bearer: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/gi,
  // FIX #2: Expanded AWS key pattern
  awsKey: /\bAKIA[0-9A-Z]{12,}\b/g,
  privateKey: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
  // FIX #2: JWT pattern detection
  jwt: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  // FIX #2: Internal URL detection
  internalUrl: /https?:\/\/[a-z0-9.-]*\.(local|internal|cluster\.local|svc|corp)\b/gi,
};

interface EngineScore {
  engine: string;
  scores: Record<string, number>;
  verdict: "ALLOW" | "WARN" | "BLOCK";
  details?: string;
}

// Privacy Engine: Detect PII in text - EXPANDED with India-specific detection
function runPrivacyEngine(text: string): EngineScore {
  const scores: Record<string, number> = {};
  let piiCount = 0;
  let hasSensitivePII = false;
  const detectedTypes: string[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern) || [];
    scores[`${type}_count`] = matches.length;
    piiCount += matches.length;
    
    // Sensitive PII types that trigger BLOCK
    if (type === "ssn" || type === "creditCard" || type === "aadhaar" || type === "pan") {
      if (matches.length > 0) {
        hasSensitivePII = true;
        detectedTypes.push(type.toUpperCase());
      }
    }
  }

  scores.pii_present = piiCount > 0 ? 1 : 0;
  scores.total_pii = piiCount;

  return {
    engine: "privacy",
    scores,
    verdict: hasSensitivePII ? "BLOCK" : piiCount > 0 ? "WARN" : "ALLOW",
    details: hasSensitivePII 
      ? `Sensitive PII detected: ${detectedTypes.join(", ")}` 
      : piiCount > 0 
        ? `Found ${piiCount} PII entities` 
        : undefined,
  };
}

// Safety Engine: Detect harmful content
function runSafetyEngine(text: string): EngineScore {
  const lowerText = text.toLowerCase();
  const detectedHarmful: string[] = [];

  for (const keyword of HARMFUL_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      detectedHarmful.push(keyword);
    }
  }

  const toxicityScore = detectedHarmful.length / HARMFUL_KEYWORDS.length;

  return {
    engine: "safety",
    scores: {
      toxicity: toxicityScore,
      harmful_keywords: detectedHarmful.length,
    },
    verdict: detectedHarmful.length > 0 ? "BLOCK" : "ALLOW",
    details: detectedHarmful.length > 0 
      ? `Harmful content detected: ${detectedHarmful.join(", ")}` 
      : undefined,
  };
}

// Security Engine: Detect secrets/credentials
function runSecurityEngine(text: string): EngineScore {
  const scores: Record<string, number> = {};
  let secretFound = false;

  for (const [type, pattern] of Object.entries(SECRET_PATTERNS)) {
    const matches = text.match(pattern) || [];
    scores[`${type}_count`] = matches.length;
    if (matches.length > 0) secretFound = true;
  }

  scores.secret_leak = secretFound ? 1 : 0;

  return {
    engine: "security",
    scores,
    verdict: secretFound ? "BLOCK" : "ALLOW",
    details: secretFound ? "Potential secrets/credentials detected" : undefined,
  };
}

// Combine engine verdicts
function combineVerdicts(engines: EngineScore[]): "ALLOW" | "WARN" | "BLOCK" {
  if (engines.some(e => e.verdict === "BLOCK")) return "BLOCK";
  if (engines.some(e => e.verdict === "WARN")) return "WARN";
  return "ALLOW";
}

serve(async (req) => {
  console.log("=== AI-GATEWAY CALLED ===");
  console.log(`Method: ${req.method}, URL: ${req.url}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`Request started at: ${new Date().toISOString()}`);

  try {
    // =====================================================
    // AUTHENTICATION: Validate user JWT via auth-helper
    // This enforces RLS for user-scoped queries
    // =====================================================
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    
    if (authError) {
      console.log("[ai-gateway] Authentication failed - returning 401");
      return authError;
    }
    
    const { user } = authResult;
    // Non-null assertion safe: requireAuth already verified authentication
    const supabase = authResult.supabase!;
    console.log(`[ai-gateway] Authenticated user: ${user?.id}`);
    
    // Service client for system operations (logging, incidents, system updates)
    // This is isolated from user context and used only for system writes
    const serviceClient = getServiceClient();

    // Parse and validate input with schema validation
    const rawBody = await req.json().catch(() => null);

    if (!rawBody) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Schema validation for input
    const validation = validateAIGatewayInput(rawBody);
    if (!validation.success) {
      console.log("[ai-gateway] Input validation failed:", validation.errors);
      return validationErrorResponse(validation.errors!, corsHeaders);
    }

    const { systemId, traceId, messages } = validation.data!;
    console.log(`[ai-gateway] Validated input: systemId=${systemId}, messages=${messages.length}`);

    // =====================================================
    // RATE LIMITING CHECK (Database-backed, per-system enforcement)
    // =====================================================
    const rateLimitResult = await checkRateLimitDB(systemId, serviceClient);
    if (!rateLimitResult.allowed) {
      console.log(`[ai-gateway] Rate limit exceeded for system: ${systemId}`);
      return new Response(
        JSON.stringify({
          error: "RATE_LIMITED: Too many requests",
          decision: "BLOCK",
          retry_after: rateLimitResult.resetIn,
          system_id: systemId
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetIn)
          } 
        }
      );
    }

    // Fetch system configuration (uses RLS via user context)
    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("*, projects(*)")
      .eq("id", systemId)
      .single();

    if (systemError || !system) {
      return new Response(
        JSON.stringify({ error: "System not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GOVERNANCE ENFORCEMENT: Check registry lock (Point of No Return)
    if (system.registry_locked) {
      const logEntry = {
        system_id: systemId,
        project_id: system.project_id,
        request_body: { messages },
        response_body: { error: "REGISTRY_LOCKED: System permanently blocked" },
        status_code: 451,
        latency_ms: Date.now() - startTime,
        error_message: `Permanent block: ${system.lock_reason || 'Governance policy violation'}`,
        trace_id: traceId,
        decision: "PERMANENT_BLOCK",
        engine_scores: {
          governance: { 
            verdict: "PERMANENT_BLOCK", 
            reason: system.lock_reason,
            locked_at: system.locked_at,
            locked_by: system.locked_by
          }
        },
      };
      await serviceClient.from("request_logs").insert(logEntry);

      return new Response(
        JSON.stringify({ 
          error: "REGISTRY_LOCKED: System permanently blocked",
          decision: "PERMANENT_BLOCK",
          locked_at: system.locked_at,
          lock_reason: system.lock_reason,
          requires: "Admin escalation with justification to unlock"
        }),
        { status: 451, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PHASE 2: RISK POLICY BINDING ENFORCEMENT
    // Check risk tier and enforce mandatory actions
    const { data: latestRiskAssessment } = await supabase
      .from("risk_assessments")
      .select("risk_tier, uri_score")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestRiskAssessment?.risk_tier) {
      const riskTier = latestRiskAssessment.risk_tier;
      
      // Auto-lock critical risk systems
      if (riskTier === 'critical' && !system.registry_locked) {
        console.log(`[ai-gateway] Auto-locking critical risk system: ${systemId}`);
        await serviceClient.from("systems").update({
          registry_locked: true,
          locked_at: new Date().toISOString(),
          lock_reason: "Auto-locked: Critical risk tier detected",
          deployment_status: "blocked",
        }).eq("id", systemId);

        // Create incident for auto-lock
        await serviceClient.from("incidents").insert({
          title: `Critical Risk Auto-Lock: ${system.name}`,
          description: `System auto-locked due to critical risk tier (URI score: ${latestRiskAssessment.uri_score})`,
          incident_type: "risk_auto_lock",
          severity: "critical",
          status: "open",
        });

        return new Response(
          JSON.stringify({
            error: "CRITICAL_RISK: System auto-locked pending executive review",
            decision: "PERMANENT_BLOCK",
            risk_tier: riskTier,
            uri_score: latestRiskAssessment.uri_score,
            requires: "Executive signoff and compliance review to unlock"
          }),
          { status: 451, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check risk policy bindings
      const { data: bindings } = await supabase
        .from("risk_policy_bindings")
        .select("*")
        .eq("risk_tier", riskTier)
        .eq("auto_enforce", true);

      if (bindings && bindings.length > 0) {
        for (const binding of bindings) {
          // Enforce approval requirement for high risk
          if (binding.action_type === 'approval_required' && 
              system.deployment_status !== 'approved' && 
              system.deployment_status !== 'deployed') {
            return new Response(
              JSON.stringify({
                error: `Risk Policy: ${binding.required_action}`,
                decision: "BLOCK",
                risk_tier: riskTier,
                policy_binding: binding.enforcement_description,
                requires: "System must be approved before deployment"
              }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Enforce HITL requirement
          if (binding.action_type === 'hitl_mandatory') {
            // Create HITL review item if not exists
            const { data: existingReview } = await supabase
              .from("review_queue")
              .select("id")
              .eq("context->system_id", systemId)
              .eq("status", "pending")
              .single();

            if (!existingReview) {
              await serviceClient.from("review_queue").insert({
                title: `HITL Required: ${system.name} (${riskTier} risk)`,
                description: binding.enforcement_description,
                review_type: "hitl_gate",
                severity: "high",
                status: "pending",
                context: { system_id: systemId, risk_tier: riskTier, binding_id: binding.id },
                sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
              });
            }
          }
        }
      }
    }

    // FIX #6: Check if Risk & Impact assessments exist
    const { data: riskAssessments } = await supabase
      .from("risk_assessments")
      .select("id")
      .eq("system_id", systemId);

    const { data: impactAssessments } = await supabase
      .from("impact_assessments")
      .select("id")
      .eq("system_id", systemId);

    if (!riskAssessments?.length || !impactAssessments?.length) {
      const missingAssessments = [];
      if (!riskAssessments?.length) missingAssessments.push("Risk");
      if (!impactAssessments?.length) missingAssessments.push("Impact");
      
      const logEntry = {
        system_id: systemId,
        project_id: system.project_id,
        request_body: { messages },
        response_body: { error: `${missingAssessments.join(" & ")} assessment(s) missing` },
        status_code: 451,
        latency_ms: Date.now() - startTime,
        error_message: `Compliance block: ${missingAssessments.join(" & ")} evaluation missing`,
        trace_id: traceId,
        decision: "BLOCK",
        engine_scores: {
          compliance: { verdict: "BLOCK", reason: `Missing: ${missingAssessments.join(", ")}` }
        },
      };
      await serviceClient.from("request_logs").insert(logEntry);

      return new Response(
        JSON.stringify({ 
          error: `${missingAssessments.join(" & ")} assessment(s) missing. Complete required evaluations.`,
          decision: "BLOCK",
          missing: missingAssessments
        }),
        { status: 451, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // EVALUATION SCORE ENFORCEMENT (CRITICAL FIX)
    // Block if no evaluations, failed evaluations, or low scores
    // =====================================================
    const { data: recentEvals } = await supabase
      .from("evaluation_runs")
      .select("engine_type, overall_score, status, fail_closed")
      .or(`model_id.eq.${systemId},model_id.in.(${systemId})`)
      .order("created_at", { ascending: false })
      .limit(10);

    // Block if no evaluations exist for high-risk systems
    if (latestRiskAssessment?.risk_tier === 'high' || latestRiskAssessment?.risk_tier === 'critical') {
      if (!recentEvals?.length) {
        const logEntry = {
          system_id: systemId,
          project_id: system.project_id,
          request_body: { messages },
          response_body: { error: "NO_EVALUATIONS: High-risk system has not been evaluated" },
          status_code: 451,
          latency_ms: Date.now() - startTime,
          error_message: `High-risk system requires evaluation before deployment`,
          trace_id: traceId,
          decision: "FAIL_CLOSED",
          engine_scores: {
            evaluation_gate: { verdict: "FAIL_CLOSED", reason: "No evaluations found for high-risk system" }
          },
        };
        await serviceClient.from("request_logs").insert(logEntry);

        return new Response(
          JSON.stringify({
            error: "NO_EVALUATIONS: High-risk system requires evaluation",
            decision: "FAIL_CLOSED",
            risk_tier: latestRiskAssessment.risk_tier,
            requires: "Complete at least one RAI evaluation before deployment"
          }),
          { status: 451, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Block if any evaluation has fail_closed = true or status = 'failed'
    const failClosedEvals = recentEvals?.filter(e => 
      e.status === 'failed' || e.fail_closed === true
    ) || [];
    
    if (failClosedEvals.length > 0) {
      const logEntry = {
        system_id: systemId,
        project_id: system.project_id,
        request_body: { messages },
        response_body: { error: "EVALUATION_FAILED: Fail-closed triggered" },
        status_code: 451,
        latency_ms: Date.now() - startTime,
        error_message: `${failClosedEvals.length} evaluation(s) in fail-closed state`,
        trace_id: traceId,
        decision: "FAIL_CLOSED",
        engine_scores: {
          evaluation_gate: { 
            verdict: "FAIL_CLOSED", 
            failed_engines: failClosedEvals.map(e => e.engine_type),
            reason: "Evaluation failure triggered fail-closed"
          }
        },
      };
      await serviceClient.from("request_logs").insert(logEntry);

      return new Response(
        JSON.stringify({
          error: "EVALUATION_FAILED: Fail-closed triggered",
          decision: "FAIL_CLOSED",
          failed_engines: failClosedEvals.map(e => e.engine_type),
          requires: "Re-run failed evaluations and achieve passing scores"
        }),
        { status: 451, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Block if any completed evaluation has score below 70%
    const completedEvals = recentEvals?.filter(e => e.status === 'completed') || [];
    const lowScoreEvals = completedEvals.filter(e => 
      (e.overall_score ?? 0) < 70
    );
    
    if (lowScoreEvals.length > 0) {
      const logEntry = {
        system_id: systemId,
        project_id: system.project_id,
        request_body: { messages },
        response_body: { error: `NON_COMPLIANT: ${lowScoreEvals.length} evaluation(s) below 70%` },
        status_code: 451,
        latency_ms: Date.now() - startTime,
        error_message: `Evaluation scores below compliance threshold`,
        trace_id: traceId,
        decision: "BLOCK",
        engine_scores: {
          evaluation_gate: { 
            verdict: "BLOCK", 
            low_score_engines: lowScoreEvals.map(e => ({ engine: e.engine_type, score: e.overall_score })),
            reason: "One or more evaluations below 70% threshold"
          }
        },
      };
      await serviceClient.from("request_logs").insert(logEntry);

      // Create HITL review for low scores
      await serviceClient.from("review_queue").insert({
        title: `Low Evaluation Score: ${system.name}`,
        description: `System blocked due to evaluation scores below 70%. Engines: ${lowScoreEvals.map(e => `${e.engine_type}=${e.overall_score}%`).join(', ')}`,
        review_type: "evaluation_failure",
        severity: "high",
        status: "pending",
        context: { 
          system_id: systemId, 
          low_scores: lowScoreEvals.map(e => ({ engine: e.engine_type, score: e.overall_score }))
        },
        sla_deadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: `NON_COMPLIANT: ${lowScoreEvals.length} evaluation(s) below 70%`,
          decision: "BLOCK",
          scores: lowScoreEvals.map(e => ({ engine: e.engine_type, score: e.overall_score })),
          requires: "Improve model performance to achieve 70%+ scores on all evaluations"
        }),
        { status: 451, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-gateway] Evaluation gate passed: ${completedEvals.length} evaluations, all >= 70%`);
    if (system.requires_approval && system.deployment_status !== "approved" && system.deployment_status !== "deployed") {
      // FIX #1: Ensure approval record exists when pending
      if (system.deployment_status === "pending_approval") {
        const { data: existingApproval } = await supabase
          .from("system_approvals")
          .select("id")
          .eq("system_id", systemId)
          .eq("status", "pending")
          .single();

        if (!existingApproval) {
          await serviceClient.from("system_approvals").insert({
            system_id: systemId,
            status: "pending",
            reason: "Auto-generated on gateway call - transition to pending_approval",
            requested_by: system.owner_id,
          });
          console.log(`Auto-created pending approval for system ${systemId}`);
        }
      }

      const logEntry = {
        system_id: systemId,
        project_id: system.project_id,
        request_body: { messages },
        response_body: { error: "System not approved for deployment" },
        status_code: 403,
        latency_ms: Date.now() - startTime,
        error_message: "Governance block: System requires approval",
        trace_id: traceId,
        decision: "BLOCK",
        engine_scores: {
          governance: { verdict: "BLOCK", reason: "Not approved" }
        },
      };
      await serviceClient.from("request_logs").insert(logEntry);

      return new Response(
        JSON.stringify({ error: "System not approved for deployment", decision: "BLOCK" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user input text for evaluation (messages already validated above)
    const userMessage = messages.find((m: any) => m.role === "user")?.content || "";
    
    // Run input evaluations
    const inputEngineScores: EngineScore[] = [
      runPrivacyEngine(userMessage),
      runSafetyEngine(userMessage),
      runSecurityEngine(userMessage),
    ];

    const inputVerdict = combineVerdicts(inputEngineScores);

    // Block if input is harmful - AUTO-ESCALATE TO HITL
    if (inputVerdict === "BLOCK") {
      const blockingEngine = inputEngineScores.find(e => e.verdict === "BLOCK");
      const traceIdGen = traceId || crypto.randomUUID();
      
      const logEntry = {
        system_id: systemId,
        project_id: system.project_id,
        request_body: { messages },
        response_body: { error: "Input blocked by safety policy" },
        status_code: 451,
        latency_ms: Date.now() - startTime,
        error_message: blockingEngine?.details,
        trace_id: traceIdGen,
        decision: "BLOCK",
        engine_scores: { input: Object.fromEntries(inputEngineScores.map(e => [e.engine, e])) },
      };
      console.log("=== INSERTING REQUEST_LOG (BLOCK) ===");
      console.log(`System: ${systemId}, Decision: BLOCK, Trace: ${traceIdGen}`);
      const { error: logError } = await serviceClient.from("request_logs").insert(logEntry);
      if (logError) {
        console.error("REQUEST_LOG INSERT FAILED:", logError);
      } else {
        console.log("REQUEST_LOG INSERT SUCCESS");
      }

      // AUTO-ESCALATE: Create HITL review item on BLOCK
      const toxicityScore = blockingEngine?.scores?.toxicity ?? 0;
      const severity = (toxicityScore > 80 || blockingEngine?.engine === "safety") ? "critical" : "high";
      
      await serviceClient.from("review_queue").insert({
        title: `Gateway Block: ${blockingEngine?.engine || 'Policy'} violation`,
        description: `Request blocked. Engine: ${blockingEngine?.engine}. Details: ${blockingEngine?.details || 'Safety policy triggered'}`,
        review_type: "gateway_block",
        severity,
        status: "pending",
        context: {
          trace_id: traceIdGen,
          system_id: systemId,
          system_name: system.name,
          engine_scores: inputEngineScores,
          prompt_preview: userMessage.substring(0, 200),
        },
        sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4-hour SLA
      });
      console.log(`Auto-created HITL review for blocked request: ${traceIdGen}`);

      // Create incident for critical blocks
      if (severity === "critical") {
        await serviceClient.from("incidents").insert({
          title: `Critical Block: ${blockingEngine?.engine} threshold exceeded`,
          description: `System "${system.name}" blocked a request due to ${blockingEngine?.engine} policy. Trace: ${traceIdGen}`,
          incident_type: `${blockingEngine?.engine}_violation`,
          severity: "critical",
          status: "open",
        });
        console.log(`Auto-created incident for critical block: ${traceIdGen}`);

        // KG AUTO-EDGE: Create edge for every BLOCK
        try {
          await serviceClient.functions.invoke('kg-upsert', {
            body: {
              nodes: [
                { entity_type: 'request', entity_id: traceIdGen, label: `Request ${traceIdGen.slice(0,8)}` },
                { entity_type: 'incident', entity_id: traceIdGen, label: `Block: ${blockingEngine?.engine}` }
              ],
              edges: [
                { 
                  source_entity_type: 'request', 
                  source_entity_id: traceIdGen,
                  target_entity_type: 'incident', 
                  target_entity_id: traceIdGen,
                  relationship_type: 'TRIGGERED_BLOCK',
                  properties: { engine: blockingEngine?.engine, system: system.name }
                }
              ]
            }
          });
          console.log(`KG edge created for block: ${traceIdGen}`);
        } catch (kgError) {
          console.warn(`KG edge creation failed (non-fatal):`, kgError);
        }
      }

      return new Response(
        JSON.stringify({ 
          error: "Request blocked by safety policy",
          decision: "BLOCK",
          trace_id: traceIdGen,
          details: inputEngineScores.filter(e => e.verdict === "BLOCK").map(e => e.details)
        }),
        { status: 451, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if system has its own endpoint configured
    let aiResponse!: Response;
    let usedUserEndpoint = false;
    
    if (system.endpoint && system.api_token_encrypted) {
      // Use user's configured model endpoint
      usedUserEndpoint = true;
      
      try {
        // Detect endpoint type and format request accordingly
        const isOpenAI = system.endpoint.includes("openai.com") || system.endpoint.includes("api.openai");
        const isHuggingFace = system.endpoint.includes("huggingface") || system.endpoint.includes("hf.space");
        const isAzure = system.endpoint.includes("azure") || system.endpoint.includes("openai.azure");
        const isOpenRouter = system.endpoint.includes("openrouter.ai");
        
        let requestBody: any;
        let headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        
        // CRITICAL FIX: Determine the actual API endpoint URL
        let apiEndpoint = system.endpoint;
        
        // OpenRouter endpoints need special handling - the stored endpoint might be a model URL
        if (isOpenRouter) {
          // Always use the correct OpenRouter API endpoint
          apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
          
          // Extract model name from the stored endpoint if it looks like a model URL
          // e.g., "https://openrouter.ai/openai/gpt-oss-120b" -> "openai/gpt-oss-120b"
          let modelName = system.model_name;
          if (!modelName && system.endpoint) {
            const modelMatch = system.endpoint.match(/openrouter\.ai\/(.+)$/);
            if (modelMatch) {
              modelName = modelMatch[1].replace(/:free$/, ''); // Remove :free suffix if present
            }
          }
          
          headers["Authorization"] = `Bearer ${system.api_token_encrypted}`;
          headers["HTTP-Referer"] = "https://fractal-rai-os.lovable.app";
          headers["X-Title"] = "Fractal RAI-OS";
          requestBody = {
            model: modelName || "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: system.use_case || "You are a helpful AI assistant." },
              ...messages,
            ],
          };
          console.log(`Using OpenRouter API with model: ${modelName}`);
        } else if (isOpenAI || isAzure) {
          headers["Authorization"] = `Bearer ${system.api_token_encrypted}`;
          requestBody = {
            model: system.model_name || "gpt-4",
            messages: [
              { role: "system", content: system.use_case || "You are a helpful AI assistant." },
              ...messages,
            ],
          };
        } else if (isHuggingFace) {
          headers["Authorization"] = `Bearer ${system.api_token_encrypted}`;
          requestBody = {
            inputs: messages.map((m: any) => `${m.role}: ${m.content}`).join("\n"),
            parameters: { max_new_tokens: 1000 }
          };
        } else {
          // Generic OpenAI-compatible endpoint
          headers["Authorization"] = `Bearer ${system.api_token_encrypted}`;
          requestBody = {
            model: system.model_name || "default",
            messages: [
              { role: "system", content: system.use_case || "You are a helpful AI assistant." },
              ...messages,
            ],
          };
        }
        
        console.log(`Using endpoint: ${apiEndpoint}`);
        aiResponse = await fetch(apiEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });
        
        if (!aiResponse.ok) {
          console.warn(`User endpoint failed with ${aiResponse.status}, falling back to Lovable AI`);
          usedUserEndpoint = false;
        }
      } catch (endpointError) {
        console.warn(`User endpoint error: ${endpointError}, falling back to Lovable AI`);
        usedUserEndpoint = false;
      }
    }
    
    // Fallback to Lovable AI if no user endpoint or it failed
    if (!usedUserEndpoint) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system.use_case || "You are a helpful AI assistant." },
            ...messages,
          ],
        }),
      });
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    // Parse response, handling HTML error pages gracefully
    const responseText = await aiResponse.text();
    let aiData;
    try {
      aiData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", responseText.substring(0, 200));
      return new Response(
        JSON.stringify({ 
          error: "External AI provider returned invalid response. Please try again or check your endpoint configuration.",
          trace_id: traceId
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const assistantMessage = aiData.choices?.[0]?.message?.content || "";

    // Run output evaluations
    const outputEngineScores: EngineScore[] = [
      runPrivacyEngine(assistantMessage),
      runSafetyEngine(assistantMessage),
      runSecurityEngine(assistantMessage),
    ];

    const outputVerdict = combineVerdicts(outputEngineScores);
    const allEngineScores = {
      input: Object.fromEntries(inputEngineScores.map(e => [e.engine, e])),
      output: Object.fromEntries(outputEngineScores.map(e => [e.engine, e])),
    };

    let finalResponse = aiData;
    let finalStatusCode = 200;
    let decision = outputVerdict;

    // Modify response if output is blocked
    if (outputVerdict === "BLOCK") {
      finalResponse = {
        ...aiData,
        choices: [{
          ...aiData.choices?.[0],
          message: {
            role: "assistant",
            content: "I apologize, but I cannot provide that response as it was flagged by our safety systems.",
          }
        }]
      };
      decision = "BLOCK";
    }

    // Log the request
    const latencyMs = Date.now() - startTime;
    const logEntry = {
      system_id: systemId,
      project_id: system.project_id,
      request_body: { messages },
      response_body: { message: assistantMessage.substring(0, 500) },
      status_code: finalStatusCode,
      latency_ms: latencyMs,
      trace_id: traceId,
      decision,
      engine_scores: allEngineScores,
    };

    console.log("=== INSERTING REQUEST_LOG (SUCCESS PATH) ===");
    console.log(`System: ${systemId}, Decision: ${decision}, Latency: ${latencyMs}ms`);
    const { error: logInsertError } = await serviceClient.from("request_logs").insert(logEntry);
    if (logInsertError) {
      console.error("REQUEST_LOG INSERT FAILED:", logInsertError);
    } else {
      console.log("REQUEST_LOG INSERT SUCCESS");
    }

    // Update runtime metrics
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    
    await serviceClient.from("risk_metrics").insert([
      { system_id: systemId, metric_name: "request_logged", metric_value: 1, time_window: "5m" },
      { system_id: systemId, metric_name: "latency_ms", metric_value: latencyMs, time_window: "5m" },
      { system_id: systemId, metric_name: decision === "BLOCK" ? "blocked_count" : "allowed_count", metric_value: 1, time_window: "5m" },
    ]);

    return new Response(
      JSON.stringify({
        ...finalResponse,
        _meta: {
          decision,
          latency_ms: latencyMs,
          trace_id: traceId,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Gateway error:", error);
    
    // Log to app_errors table for debugging
    try {
      const errorClient = getServiceClient();
      
      await errorClient.from("app_errors").insert({
        error_type: "edge_function_error",
        error_message: error instanceof Error ? error.message : "Unknown error",
        error_stack: error instanceof Error ? error.stack : null,
        component_name: "ai-gateway",
        page_url: null,
        user_agent: null,
        metadata: { function: "ai-gateway" },
      });
    } catch (logErr) {
      console.error("Failed to log error:", logErr);
    }
    
    // Return friendly error message - NEVER expose raw errors to user
    return new Response(
      JSON.stringify({ 
        error: "Service temporarily unavailable — we're fixing it. Please retry in a moment.",
        retry_after: 5
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
