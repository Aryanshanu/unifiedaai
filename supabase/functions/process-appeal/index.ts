import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ProcessAppealRequest {
  action: "create" | "assign" | "review" | "resolve";
  decisionId?: string;
  appealId?: string;
  appellantReference?: string;
  appealReason?: string;
  appealCategory?: "accuracy" | "fairness" | "privacy" | "transparency" | "other";
  assigneeId?: string;
  reviewNotes?: string;
  finalDecision?: "upheld" | "overturned" | "escalated";
  overrideDecision?: string;
  overrideReason?: string;
}

/**
 * Calculate SLA deadline based on appeal category
 * GDPR Article 22 requires timely response to automated decision challenges
 */
function calculateSLADeadline(category: string): Date {
  const now = new Date();
  const hours = {
    accuracy: 72,      // 3 days for accuracy disputes
    fairness: 48,      // 2 days for fairness concerns (priority)
    privacy: 24,       // 1 day for privacy issues (urgent)
    transparency: 72,  // 3 days for transparency requests
    other: 120,        // 5 days for other
  };
  
  const hoursToAdd = hours[category as keyof typeof hours] || 72;
  return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
}

serve(async (req) => {
  console.log("=== PROCESS-APPEAL CALLED ===");

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

    const body: ProcessAppealRequest = await req.json();
    const { action } = body;

    // =====================================================
    // ACTION: CREATE - Submit a new appeal
    // =====================================================
    if (action === "create") {
      const { decisionId, appellantReference, appealReason, appealCategory } = body;

      if (!decisionId || !appellantReference || !appealReason || !appealCategory) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields",
            required: ["decisionId", "appellantReference", "appealReason", "appealCategory"],
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify decision exists
      const { data: decision, error: decisionError } = await supabase
        .from("decision_ledger")
        .select("id, decision_ref, decision_value")
        .eq("id", decisionId)
        .single();

      if (decisionError || !decision) {
        return new Response(
          JSON.stringify({ error: "Decision not found", decisionId }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for existing pending appeal
      const { data: existingAppeal } = await supabase
        .from("decision_appeals")
        .select("id, status")
        .eq("decision_id", decisionId)
        .in("status", ["pending", "under_review"])
        .single();

      if (existingAppeal) {
        return new Response(
          JSON.stringify({
            error: "Active appeal already exists",
            existingAppealId: existingAppeal.id,
            status: existingAppeal.status,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate SLA deadline
      const slaDeadline = calculateSLADeadline(appealCategory);

      // Create appeal
      const { data: appeal, error: insertError } = await supabase
        .from("decision_appeals")
        .insert({
          decision_id: decisionId,
          appellant_reference: appellantReference,
          appeal_reason: appealReason,
          appeal_category: appealCategory,
          status: "pending",
          sla_deadline: slaDeadline.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create appeal:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create appeal", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Appeal created: ${appeal.id} for decision ${decisionId}`);

      return new Response(
        JSON.stringify({
          success: true,
          action: "create",
          appealId: appeal.id,
          decisionRef: decision.decision_ref,
          status: "pending",
          slaDeadline: slaDeadline.toISOString(),
          hoursRemaining: Math.round((slaDeadline.getTime() - Date.now()) / (60 * 60 * 1000)),
          latencyMs: Date.now() - startTime,
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // ACTION: ASSIGN - Assign reviewer to appeal
    // =====================================================
    if (action === "assign") {
      const { appealId, assigneeId } = body;

      if (!appealId || !assigneeId) {
        return new Response(
          JSON.stringify({ error: "appealId and assigneeId are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: appeal, error: updateError } = await supabase
        .from("decision_appeals")
        .update({
          assigned_to: assigneeId,
          status: "under_review",
        })
        .eq("id", appealId)
        .eq("status", "pending")
        .select()
        .single();

      if (updateError || !appeal) {
        return new Response(
          JSON.stringify({ error: "Failed to assign appeal or appeal not in pending status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "assign",
          appealId,
          assigneeId,
          status: "under_review",
          latencyMs: Date.now() - startTime,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // ACTION: REVIEW - Add review notes
    // =====================================================
    if (action === "review") {
      const { appealId, reviewNotes } = body;

      if (!appealId || !reviewNotes) {
        return new Response(
          JSON.stringify({ error: "appealId and reviewNotes are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: appeal, error: updateError } = await supabase
        .from("decision_appeals")
        .update({ review_notes: reviewNotes })
        .eq("id", appealId)
        .select()
        .single();

      if (updateError || !appeal) {
        return new Response(
          JSON.stringify({ error: "Failed to update appeal" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "review",
          appealId,
          latencyMs: Date.now() - startTime,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // ACTION: RESOLVE - Final decision on appeal
    // =====================================================
    if (action === "resolve") {
      const { appealId, finalDecision, reviewNotes, overrideDecision, overrideReason } = body;

      if (!appealId || !finalDecision) {
        return new Response(
          JSON.stringify({ error: "appealId and finalDecision are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch appeal with decision info
      const { data: appeal, error: fetchError } = await supabase
        .from("decision_appeals")
        .select(`
          *,
          decision_ledger:decision_id (
            id, decision_ref, decision_value, model_id
          )
        `)
        .eq("id", appealId)
        .single();

      if (fetchError || !appeal) {
        return new Response(
          JSON.stringify({ error: "Appeal not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map finalDecision to status
      const statusMap: Record<string, string> = {
        upheld: "upheld",
        overturned: "overturned",
        escalated: "escalated",
      };

      const newStatus = statusMap[finalDecision] || "upheld";

      // Update appeal
      const { error: updateError } = await supabase
        .from("decision_appeals")
        .update({
          status: newStatus,
          final_decision: finalDecision,
          review_notes: reviewNotes || appeal.review_notes,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", appealId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to resolve appeal" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If overturned, create override record
      let overrideId: string | null = null;
      if (finalDecision === "overturned" && overrideDecision) {
        const decision = appeal.decision_ledger as any;
        
        const { data: override, error: overrideError } = await supabase
          .from("decision_overrides")
          .insert({
            decision_id: decision.id,
            appeal_id: appealId,
            original_decision: decision.decision_value,
            new_decision: overrideDecision,
            override_reason: overrideReason || "Appeal overturned",
            authorized_by: appeal.assigned_to,
            authorization_level: "supervisor", // Default level
          })
          .select()
          .single();

        if (!overrideError && override) {
          overrideId = override.id;
        }
      }

      console.log(`Appeal ${appealId} resolved: ${finalDecision}`);

      return new Response(
        JSON.stringify({
          success: true,
          action: "resolve",
          appealId,
          finalDecision,
          status: newStatus,
          overrideId,
          resolvedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action", validActions: ["create", "assign", "review", "resolve"] }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("process-appeal error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
