import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-deployment-token",
};

// Rate limiting (simple in-memory for now)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60000;

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

interface CICDGateRequest {
  systemId: string;
  commitSha?: string;
  branch?: string;
  pipelineId?: string;
  requestedBy?: string;
}

interface CICDGateResponse {
  allowed: boolean;
  deploymentToken?: string;
  reason?: string;
  violations: string[];
  checks: {
    name: string;
    passed: boolean;
    details?: string;
  }[];
  riskTier?: string;
  requiresApproval: boolean;
}

serve(async (req) => {
  console.log("=== CICD-GATE CALLED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Rate limiting
    const clientId = req.headers.get("x-client-id") || req.headers.get("x-forwarded-for") || "anonymous";
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", retry_after: 60 }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CICDGateRequest = await req.json();
    const { systemId, commitSha, branch, pipelineId, requestedBy } = body;

    if (!systemId) {
      return new Response(
        JSON.stringify({ error: "systemId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch system
    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("*, projects(*)")
      .eq("id", systemId)
      .single();

    if (systemError || !system) {
      return new Response(
        JSON.stringify({ error: "System not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const violations: string[] = [];
    const checks: { name: string; passed: boolean; details?: string }[] = [];
    let requiresApproval = false;

    // CHECK 1: Registry Lock
    const isLocked = system.registry_locked === true;
    checks.push({
      name: "Registry Lock Check",
      passed: !isLocked,
      details: isLocked ? `System locked at ${system.locked_at}: ${system.lock_reason}` : "System is not locked",
    });
    if (isLocked) {
      violations.push("REGISTRY_LOCKED: System is permanently blocked");
    }

    // CHECK 2: Deployment Status
    const validDeploymentStatuses = ["approved", "deployed"];
    const hasValidStatus = validDeploymentStatuses.includes(system.deployment_status);
    checks.push({
      name: "Deployment Status Check",
      passed: hasValidStatus,
      details: `Current status: ${system.deployment_status}`,
    });
    if (!hasValidStatus) {
      violations.push(`DEPLOYMENT_STATUS: System status '${system.deployment_status}' is not deployable`);
    }

    // CHECK 3: Risk Assessment Exists
    const { data: riskAssessment } = await supabase
      .from("risk_assessments")
      .select("*")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const hasRiskAssessment = !!riskAssessment;
    checks.push({
      name: "Risk Assessment Check",
      passed: hasRiskAssessment,
      details: hasRiskAssessment 
        ? `Risk tier: ${riskAssessment.risk_tier}, URI score: ${riskAssessment.uri_score}` 
        : "No risk assessment found",
    });
    if (!hasRiskAssessment) {
      violations.push("RISK_ASSESSMENT: No risk assessment completed");
    }

    // CHECK 4: Impact Assessment Exists
    const { data: impactAssessment } = await supabase
      .from("impact_assessments")
      .select("*")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const hasImpactAssessment = !!impactAssessment;
    checks.push({
      name: "Impact Assessment Check",
      passed: hasImpactAssessment,
      details: hasImpactAssessment 
        ? `Quadrant: ${impactAssessment.quadrant}, Score: ${impactAssessment.overall_score}` 
        : "No impact assessment found",
    });
    if (!hasImpactAssessment) {
      violations.push("IMPACT_ASSESSMENT: No impact assessment completed");
    }

    // CHECK 5: Recent Evaluation Runs
    const { data: recentEvals } = await supabase
      .from("evaluation_runs")
      .select("engine_type, overall_score, status")
      .eq("model_id", systemId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);

    const hasEvaluations = (recentEvals?.length || 0) > 0;
    const failedEvals = recentEvals?.filter(e => (e.overall_score || 0) < 70) || [];
    checks.push({
      name: "Evaluation Results Check",
      passed: hasEvaluations && failedEvals.length === 0,
      details: hasEvaluations 
        ? `${recentEvals?.length} evaluations, ${failedEvals.length} below threshold`
        : "No evaluations found",
    });
    if (failedEvals.length > 0) {
      violations.push(`EVALUATION_FAILED: ${failedEvals.length} evaluation(s) below 70% threshold`);
    }

    // CHECK 6: Approval Chain
    if (system.requires_approval) {
      const { data: approval } = await supabase
        .from("system_approvals")
        .select("*")
        .eq("system_id", systemId)
        .eq("status", "approved")
        .order("approved_at", { ascending: false })
        .limit(1)
        .single();

      const hasApproval = !!approval;
      checks.push({
        name: "Approval Chain Check",
        passed: hasApproval,
        details: hasApproval 
          ? `Approved by ${approval.approver_id} at ${approval.approved_at}` 
          : "Requires approval but none found",
      });
      if (!hasApproval) {
        violations.push("APPROVAL_REQUIRED: System requires approval before deployment");
        requiresApproval = true;
      }
    }

    // CHECK 7: Risk Policy Bindings
    if (riskAssessment) {
      const { data: bindings } = await supabase
        .from("risk_policy_bindings")
        .select("*")
        .eq("risk_tier", riskAssessment.risk_tier)
        .eq("auto_enforce", true);

      const blockingBindings = bindings?.filter(b => 
        b.action_type === 'executive_signoff' || b.action_type === 'auto_lock'
      ) || [];

      if (blockingBindings.length > 0 && riskAssessment.risk_tier === 'critical') {
        checks.push({
          name: "Risk Policy Check",
          passed: false,
          details: `Critical risk requires: ${blockingBindings.map(b => b.required_action).join(", ")}`,
        });
        violations.push("RISK_POLICY: Critical risk tier requires executive signoff");
      } else {
        checks.push({
          name: "Risk Policy Check",
          passed: true,
          details: `Risk tier '${riskAssessment.risk_tier}' policies satisfied`,
        });
      }
    }

    // Determine if deployment is allowed
    const allowed = violations.length === 0;
    let deploymentToken: string | undefined;

    if (allowed) {
      // Generate HMAC-SHA256 signed JWT deployment token
      const signingSecret = Deno.env.get("DEPLOYMENT_SIGNING_SECRET");
      
      if (signingSecret) {
        const tokenPayload = {
          systemId,
          commitSha,
          branch,
          pipelineId,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
          checks: checks.filter(c => c.passed).length,
          riskTier: riskAssessment?.risk_tier,
        };
        
        try {
          // Create JWT-like signed token
          const encoder = new TextEncoder();
          const header = { alg: "HS256", typ: "JWT", aud: "cicd-pipeline" };
          const now = Math.floor(Date.now() / 1000);
          const jwtPayload = { ...tokenPayload, iat: now, exp: now + 3600 };
          
          const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          const data = `${headerB64}.${payloadB64}`;
          
          const key = await crypto.subtle.importKey(
            "raw", 
            encoder.encode(signingSecret),
            { name: "HMAC", hash: "SHA-256" }, 
            false, 
            ["sign"]
          );
          
          const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
          const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          
          deploymentToken = `${headerB64}.${payloadB64}.${sigB64}`;
          console.log(`[cicd-gate] Signed JWT deployment token generated for ${systemId}`);
        } catch (signError) {
          console.error(`[cicd-gate] Token signing failed:`, signError);
          // Fallback to simple encoding if signing fails (logged as warning)
          deploymentToken = btoa(JSON.stringify(tokenPayload));
        }
      } else {
        // No signing secret configured - use simple encoding with warning
        console.warn(`[cicd-gate] DEPLOYMENT_SIGNING_SECRET not configured - using unsigned token`);
        const tokenPayload = {
          systemId,
          commitSha,
          branch,
          pipelineId,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          checks: checks.filter(c => c.passed).length,
          unsigned: true, // Mark as unsigned
        };
        deploymentToken = btoa(JSON.stringify(tokenPayload));
      }
    }

    const response: CICDGateResponse = {
      allowed,
      deploymentToken,
      reason: allowed ? "All checks passed" : `${violations.length} check(s) failed`,
      violations,
      checks,
      riskTier: riskAssessment?.risk_tier,
      requiresApproval,
    };

    // Log the gate check
    await supabase.from("request_logs").insert({
      system_id: systemId,
      project_id: system.project_id,
      request_body: { cicd_gate: body },
      response_body: response,
      status_code: allowed ? 200 : 403,
      latency_ms: Date.now() - startTime,
      decision: allowed ? "ALLOW" : "BLOCK",
      engine_scores: {
        cicd_gate: {
          checks_passed: checks.filter(c => c.passed).length,
          checks_failed: checks.filter(c => !c.passed).length,
          violations: violations.length,
        }
      },
    });

    console.log(`[cicd-gate] System ${systemId}: ${allowed ? "ALLOWED" : "BLOCKED"}, ${violations.length} violations`);

    return new Response(
      JSON.stringify(response),
      { 
        status: allowed ? 200 : 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[cicd-gate] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        allowed: false,
        violations: ["INTERNAL_ERROR: Gate check failed"],
        checks: [],
        requiresApproval: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
