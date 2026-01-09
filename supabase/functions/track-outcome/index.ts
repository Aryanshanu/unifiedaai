import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TrackOutcomeRequest {
  decisionId: string;
  outcomeType: "correct" | "incorrect" | "harmful" | "reversed" | "unknown" | "pending_verification";
  harmCategory?: "financial" | "legal" | "reputational" | "safety" | "discrimination" | "privacy" | "none";
  harmSeverity?: "none" | "low" | "medium" | "high" | "critical";
  outcomeDetails?: Record<string, unknown>;
  remediationTaken?: string;
  verifiedBy?: string;
}

/**
 * Validates harm classification consistency
 * If outcome is harmful, harm category and severity are required
 */
function validateHarmClassification(
  outcomeType: string,
  harmCategory?: string,
  harmSeverity?: string
): { valid: boolean; error?: string } {
  if (outcomeType === "harmful") {
    if (!harmCategory || harmCategory === "none") {
      return { valid: false, error: "Harmful outcomes require a harm category" };
    }
    if (!harmSeverity || harmSeverity === "none") {
      return { valid: false, error: "Harmful outcomes require a harm severity" };
    }
  }
  
  if (outcomeType === "correct" && (harmCategory && harmCategory !== "none")) {
    return { valid: false, error: "Correct outcomes should not have harm category" };
  }
  
  return { valid: true };
}

serve(async (req) => {
  console.log("=== TRACK-OUTCOME CALLED ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: TrackOutcomeRequest = await req.json();
    const {
      decisionId,
      outcomeType,
      harmCategory,
      harmSeverity,
      outcomeDetails,
      remediationTaken,
      verifiedBy,
    } = body;

    // Validate required fields
    if (!decisionId || !outcomeType) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["decisionId", "outcomeType"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate harm classification consistency
    const validation = validateHarmClassification(outcomeType, harmCategory, harmSeverity);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify decision exists
    const { data: decision, error: decisionError } = await supabase
      .from("decision_ledger")
      .select("id, decision_ref, decision_value, model_id")
      .eq("id", decisionId)
      .single();

    if (decisionError || !decision) {
      return new Response(
        JSON.stringify({ error: "Decision not found", decisionId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if outcome already exists for this decision
    const { data: existingOutcome } = await supabase
      .from("decision_outcomes")
      .select("id, outcome_type")
      .eq("decision_id", decisionId)
      .single();

    let outcome;
    let isUpdate = false;

    if (existingOutcome) {
      // Update existing outcome
      isUpdate = true;
      const { data: updatedOutcome, error: updateError } = await supabase
        .from("decision_outcomes")
        .update({
          outcome_type: outcomeType,
          harm_category: harmCategory || null,
          harm_severity: harmSeverity || null,
          outcome_details: outcomeDetails || {},
          remediation_taken: remediationTaken || null,
          verified_by: verifiedBy || null,
          detected_at: new Date().toISOString(),
        })
        .eq("id", existingOutcome.id)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update outcome:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update outcome", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      outcome = updatedOutcome;
    } else {
      // Create new outcome
      const { data: newOutcome, error: insertError } = await supabase
        .from("decision_outcomes")
        .insert({
          decision_id: decisionId,
          outcome_type: outcomeType,
          harm_category: harmCategory || null,
          harm_severity: harmSeverity || null,
          outcome_details: outcomeDetails || {},
          remediation_taken: remediationTaken || null,
          verified_by: verifiedBy || null,
          detected_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create outcome:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create outcome", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      outcome = newOutcome;
    }

    // If harmful outcome with high/critical severity, trigger escalation is automatic via DB trigger
    let incidentCreated = false;
    if (outcomeType === "harmful" && (harmSeverity === "high" || harmSeverity === "critical")) {
      // The DB trigger handles incident creation, but we note it here
      incidentCreated = true;
      console.log(`Harmful outcome detected - incident auto-created by trigger`);
    }

    const latencyMs = Date.now() - startTime;
    console.log(`Outcome tracked for decision ${decisionId}: ${outcomeType} in ${latencyMs}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        outcomeId: outcome.id,
        decisionId,
        decisionRef: decision.decision_ref,
        outcomeType,
        harmCategory: harmCategory || null,
        harmSeverity: harmSeverity || null,
        isUpdate,
        incidentCreated,
        latencyMs,
      }),
      { status: isUpdate ? 200 : 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("track-outcome error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
