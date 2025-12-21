// ============================================
// FRACTAL RAI-OS: FAIL-CLOSED UTILITIES
// Handles evaluation failures with proper state tracking
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface FailClosedResult {
  success: false;
  status: "EVALUATION_FAILED";
  decision: "FAIL_CLOSED";
  error: string;
  requires: string;
  evaluation_id?: string;
}

/**
 * Records an evaluation failure and returns a fail-closed response
 * This ensures the system blocks by default when evaluations fail
 */
export async function recordEvaluationFailure(
  modelId: string,
  engineType: string,
  errorMessage: string,
  details?: Record<string, unknown>
): Promise<{ response: Response; evaluationId: string | null }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Insert failed evaluation record
  const { data: evaluation, error: insertError } = await supabase
    .from("evaluation_runs")
    .insert({
      model_id: modelId,
      engine_type: engineType,
      status: "failed",
      overall_score: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      fail_closed: true,
      failed_reason: errorMessage,
      details: {
        error: errorMessage,
        fail_closed: true,
        timestamp: new Date().toISOString(),
        ...details,
      },
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[fail-closed] Failed to record evaluation failure:", insertError);
  }

  const result: FailClosedResult = {
    success: false,
    status: "EVALUATION_FAILED",
    decision: "FAIL_CLOSED",
    error: errorMessage,
    requires: "External service must be available before model can be evaluated. Manual review required.",
    evaluation_id: evaluation?.id,
  };

  const response = new Response(
    JSON.stringify(result),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    }
  );

  return { response, evaluationId: evaluation?.id || null };
}

/**
 * Creates a review queue item for failed evaluations
 */
export async function escalateFailedEvaluation(
  modelId: string,
  engineType: string,
  errorMessage: string
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Check if there's already a pending review for this
  const { data: existingReview } = await supabase
    .from("review_queue")
    .select("id")
    .eq("review_type", "evaluation_failure")
    .eq("status", "pending")
    .contains("context", { model_id: modelId, engine_type: engineType })
    .single();

  if (!existingReview) {
    await supabase.from("review_queue").insert({
      title: `Evaluation Failure: ${engineType}`,
      description: `${engineType} evaluation failed due to external service error. Model is blocked until manually reviewed.`,
      review_type: "evaluation_failure",
      severity: "high",
      status: "pending",
      model_id: modelId,
      context: {
        model_id: modelId,
        engine_type: engineType,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        action_required: "Verify external service availability and re-run evaluation",
      },
      sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
    });
  }
}

/**
 * Check if evaluations allow gateway passage
 * Returns block response if evaluations are missing or failed
 */
export async function checkEvaluationGate(
  systemId: string,
  minScore: number = 70
): Promise<{ allowed: boolean; response?: Response; details?: Record<string, unknown> }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get recent evaluations for this system
  const { data: evaluations, error } = await supabase
    .from("evaluation_runs")
    .select("engine_type, overall_score, status, fail_closed, created_at")
    .eq("model_id", systemId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[fail-closed] Error fetching evaluations:", error);
    // Fail closed on database errors too
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: "EVALUATION_CHECK_FAILED",
          decision: "FAIL_CLOSED",
          message: "Unable to verify evaluation status",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      ),
    };
  }

  // No evaluations = block
  if (!evaluations || evaluations.length === 0) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: "NO_EVALUATIONS",
          decision: "BLOCK",
          message: "System has not been evaluated. Run evaluations before accessing gateway.",
          requires: "Complete at least one evaluation (fairness, toxicity, or privacy)",
        }),
        {
          status: 451,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      ),
    };
  }

  // Check for failed evaluations (fail-closed)
  const failedEvals = evaluations.filter(e => e.status === "failed" || e.fail_closed === true);
  if (failedEvals.length > 0) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: "EVALUATION_FAILED",
          decision: "FAIL_CLOSED",
          message: `${failedEvals.length} evaluation(s) in failed state`,
          failed_engines: failedEvals.map(e => e.engine_type),
          requires: "Re-run failed evaluations or manual review to proceed",
        }),
        {
          status: 451,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      ),
    };
  }

  // Check for low scores
  const completedEvals = evaluations.filter(e => e.status === "completed");
  const lowScoreEvals = completedEvals.filter(e => (e.overall_score || 0) < minScore);
  
  if (lowScoreEvals.length > 0) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: "NON_COMPLIANT",
          decision: "BLOCK",
          message: `${lowScoreEvals.length} evaluation(s) below ${minScore}% threshold`,
          low_score_engines: lowScoreEvals.map(e => ({
            engine: e.engine_type,
            score: e.overall_score,
          })),
          requires: "Improve model scores to meet compliance threshold",
        }),
        {
          status: 451,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      ),
    };
  }

  return {
    allowed: true,
    details: {
      evaluations_checked: completedEvals.length,
      all_passing: true,
      min_score: minScore,
    },
  };
}
