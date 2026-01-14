import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/auth-helper.ts";
import { validateMLOpsEventInput, validationErrorResponse } from "../_shared/input-validation.ts";

interface MLOpsEventRequest {
  systemId: string;
  modelId?: string;
  eventType: 'deployment' | 'model_update' | 'pipeline_run' | 'config_change' | 'rollback' | 'bypass';
  eventDetails: Record<string, unknown>;
  actorId?: string;
  artifactHash?: string;
  commitSha?: string;
}

interface GovernanceDecision {
  decision: 'ALLOW' | 'WARN' | 'BLOCK' | 'ESCALATE';
  violations: string[];
  reason: string;
}

serve(async (req) => {
  console.log("=== RECORD-MLOPS-EVENT CALLED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Validate input with schema
    const body = await req.json();
    const validation = validateMLOpsEventInput(body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!, corsHeaders);
    }
    
    const { systemId, modelId, eventType, eventDetails, actorId, artifactHash, commitSha } = validation.data!;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const violations: string[] = [];
    let governanceDecision: GovernanceDecision = {
      decision: 'ALLOW',
      violations: [],
      reason: 'All checks passed'
    };

    // Bypass Detection: Check if deployment happening without approval
    if (eventType === 'deployment') {
      // Check system status
      const { data: system } = await supabase
        .from("systems")
        .select("deployment_status, requires_approval, registry_locked")
        .eq("id", systemId)
        .single();

      if (system?.registry_locked) {
        violations.push("BYPASS_DETECTED: Deployment attempted on locked system");
        governanceDecision.decision = 'BLOCK';
      }

      if (system?.requires_approval) {
        const { data: approval } = await supabase
          .from("system_approvals")
          .select("status")
          .eq("system_id", systemId)
          .eq("status", "approved")
          .order("approved_at", { ascending: false })
          .limit(1)
          .single();

        if (!approval) {
          violations.push("BYPASS_DETECTED: Deployment without required approval");
          governanceDecision.decision = 'BLOCK';
        }
      }

      // Check attestation exists for deployment
      if (artifactHash && commitSha) {
        const { data: attestation } = await supabase
          .from("deployment_attestations")
          .select("verification_status, hash_match")
          .eq("system_id", systemId)
          .eq("artifact_hash", artifactHash)
          .eq("commit_sha", commitSha)
          .single();

        if (!attestation) {
          violations.push("ATTESTATION_MISSING: No attestation record for deployment");
          governanceDecision.decision = governanceDecision.decision === 'BLOCK' ? 'BLOCK' : 'WARN';
        } else if (attestation.verification_status !== 'verified' || !attestation.hash_match) {
          violations.push("ATTESTATION_INVALID: Deployment attestation verification failed");
          governanceDecision.decision = 'BLOCK';
        }
      }
    }

    // Check for unauthorized model updates
    if (eventType === 'model_update' && modelId) {
      const { data: model } = await supabase
        .from("models")
        .select("status")
        .eq("id", modelId)
        .single();

      if (model?.status === 'archived' || model?.status === 'blocked') {
        violations.push("MODEL_LOCKED: Cannot update archived or blocked model");
        governanceDecision.decision = 'BLOCK';
      }
    }

    // Update decision based on violations
    if (violations.length > 0) {
      governanceDecision.violations = violations;
      governanceDecision.reason = violations.join("; ");

      // Auto-escalate critical violations
      if (governanceDecision.decision === 'BLOCK') {
        // Create incident
        await supabase.from("incidents").insert({
          model_id: modelId,
          incident_type: "governance_bypass",
          title: `MLOps Governance Violation: ${eventType}`,
          description: `System ${systemId} triggered governance violation during ${eventType}. Violations: ${violations.join(", ")}`,
          severity: violations.some(v => v.includes("BYPASS_DETECTED")) ? "critical" : "high",
          status: "open"
        });
      }
    }

    // Record the MLOps event
    const { data: event, error: insertError } = await supabase
      .from("mlops_governance_events")
      .insert({
        system_id: systemId,
        model_id: modelId,
        event_type: eventType,
        event_details: {
          ...eventDetails,
          artifact_hash: artifactHash,
          commit_sha: commitSha,
          recorded_at: new Date().toISOString()
        },
        actor_id: actorId,
        governance_decision: governanceDecision.decision,
        violations: violations.length > 0 ? violations : null
      })
      .select()
      .single();

    if (insertError) {
      console.error("[record-mlops-event] Insert error:", insertError);
      throw insertError;
    }

    console.log(`[record-mlops-event] Recorded ${eventType} for system ${systemId}, decision: ${governanceDecision.decision}`);

    return new Response(
      JSON.stringify({
        event_id: event.id,
        governance_decision: governanceDecision,
        recorded_at: event.recorded_at,
        latency_ms: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[record-mlops-event] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
