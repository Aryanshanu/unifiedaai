import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AutoAssistRequest {
  review_id?: string;
  batch_mode?: boolean;
  max_items?: number;
}

interface AutoAssistResult {
  review_id: string;
  summary: string;
  suggested_decision: 'approve' | 'reject' | 'escalate';
  confidence: number;
  risk_score: number;
  evidence_refs: string[];
  reasoning: string;
  sla_recommendation: string;
}

// Risk scoring weights
const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  info: 10,
};

// Review type risk modifiers
const TYPE_RISK_MODIFIERS: Record<string, number> = {
  safety: 1.5,
  security: 1.4,
  fairness: 1.3,
  compliance: 1.2,
  privacy: 1.2,
  data_quality: 1.0,
  performance: 0.8,
};

function calculateRiskScore(severity: string, reviewType: string): number {
  const baseScore = SEVERITY_WEIGHTS[severity] || 50;
  const modifier = TYPE_RISK_MODIFIERS[reviewType] || 1.0;
  return Math.min(100, Math.round(baseScore * modifier));
}

function determineSuggestedDecision(
  riskScore: number, 
  severity: string,
  reviewType: string
): { decision: 'approve' | 'reject' | 'escalate'; confidence: number; reasoning: string } {
  // Critical severity always escalates
  if (severity === 'critical') {
    return {
      decision: 'escalate',
      confidence: 0.95,
      reasoning: 'Critical severity items require human oversight per governance policy.',
    };
  }

  // High risk items should be escalated or rejected
  if (riskScore >= 80) {
    return {
      decision: 'escalate',
      confidence: 0.85,
      reasoning: `High risk score (${riskScore}) indicates potential significant impact requiring senior review.`,
    };
  }

  // Safety and security items with high severity get escalated
  if ((reviewType === 'safety' || reviewType === 'security') && severity === 'high') {
    return {
      decision: 'escalate',
      confidence: 0.80,
      reasoning: `${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)} concerns with high severity require additional verification.`,
    };
  }

  // Medium risk can be approved with conditions
  if (riskScore >= 50) {
    return {
      decision: 'approve',
      confidence: 0.70,
      reasoning: `Moderate risk (${riskScore}) acceptable with standard monitoring. Recommend documentation of decision rationale.`,
    };
  }

  // Low risk items can be auto-approved
  if (riskScore < 30) {
    return {
      decision: 'approve',
      confidence: 0.90,
      reasoning: `Low risk score (${riskScore}) meets auto-approval threshold. Standard audit trail will be maintained.`,
    };
  }

  // Default to approval for other cases
  return {
    decision: 'approve',
    confidence: 0.75,
    reasoning: `Risk assessment indicates acceptable levels for automated approval with standard oversight.`,
  };
}

function generateSummary(title: string, reviewType: string, severity: string, context: Record<string, unknown>): string {
  const typeLabel = reviewType.replace('_', ' ').charAt(0).toUpperCase() + reviewType.slice(1).replace('_', ' ');
  let summary = `${typeLabel} review: ${title}. Severity: ${severity}.`;
  
  if (context.model_name) {
    summary += ` Model: ${context.model_name}.`;
  }
  if (context.dataset_name) {
    summary += ` Dataset: ${context.dataset_name}.`;
  }
  if (context.system_name) {
    summary += ` System: ${context.system_name}.`;
  }
  
  return summary;
}

function extractEvidenceRefs(context: Record<string, unknown>): string[] {
  const refs: string[] = [];
  
  if (context.evaluation_id) refs.push(`evaluation:${context.evaluation_id}`);
  if (context.incident_id) refs.push(`incident:${context.incident_id}`);
  if (context.model_id) refs.push(`model:${context.model_id}`);
  if (context.system_id) refs.push(`system:${context.system_id}`);
  if (context.dataset_id) refs.push(`dataset:${context.dataset_id}`);
  if (context.policy_violation_id) refs.push(`violation:${context.policy_violation_id}`);
  
  return refs;
}

function determineSLARecommendation(severity: string, riskScore: number): string {
  if (severity === 'critical' || riskScore >= 80) {
    return 'Immediate: Resolve within 1 hour';
  }
  if (severity === 'high' || riskScore >= 60) {
    return 'Urgent: Resolve within 4 hours';
  }
  if (severity === 'medium' || riskScore >= 40) {
    return 'Standard: Resolve within 24 hours';
  }
  return 'Low priority: Resolve within 48 hours';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const body: AutoAssistRequest = await req.json().catch(() => ({}));
    const results: AutoAssistResult[] = [];

    if (body.review_id) {
      // Single item analysis
      const { data: review, error } = await supabase
        .from("review_queue")
        .select("*")
        .eq("id", body.review_id)
        .single();

      if (error || !review) {
        return new Response(
          JSON.stringify({ error: "Review item not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const riskScore = calculateRiskScore(review.severity, review.review_type);
      const { decision, confidence, reasoning } = determineSuggestedDecision(
        riskScore, 
        review.severity, 
        review.review_type
      );
      const context = (review.context as Record<string, unknown>) || {};

      results.push({
        review_id: review.id,
        summary: generateSummary(review.title, review.review_type, review.severity, context),
        suggested_decision: decision,
        confidence,
        risk_score: riskScore,
        evidence_refs: extractEvidenceRefs(context),
        reasoning,
        sla_recommendation: determineSLARecommendation(review.severity, riskScore),
      });

    } else if (body.batch_mode) {
      // Batch analysis of pending items
      const maxItems = Math.min(body.max_items || 50, 100);
      
      const { data: reviews, error } = await supabase
        .from("review_queue")
        .select("*")
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: true })
        .limit(maxItems);

      if (error) {
        console.error("Batch fetch error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch review items" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      for (const review of reviews || []) {
        const riskScore = calculateRiskScore(review.severity, review.review_type);
        const { decision, confidence, reasoning } = determineSuggestedDecision(
          riskScore, 
          review.severity, 
          review.review_type
        );
        const context = (review.context as Record<string, unknown>) || {};

        results.push({
          review_id: review.id,
          summary: generateSummary(review.title, review.review_type, review.severity, context),
          suggested_decision: decision,
          confidence,
          risk_score: riskScore,
          evidence_refs: extractEvidenceRefs(context),
          reasoning,
          sla_recommendation: determineSLARecommendation(review.severity, riskScore),
        });
      }
    }

    // Calculate statistics
    const stats = {
      total_analyzed: results.length,
      suggested_approve: results.filter(r => r.suggested_decision === 'approve').length,
      suggested_reject: results.filter(r => r.suggested_decision === 'reject').length,
      suggested_escalate: results.filter(r => r.suggested_decision === 'escalate').length,
      avg_confidence: results.length > 0 
        ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length 
        : 0,
      avg_risk_score: results.length > 0 
        ? results.reduce((sum, r) => sum + r.risk_score, 0) / results.length 
        : 0,
    };

    return new Response(
      JSON.stringify({
        success: true,
        results,
        statistics: stats,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("HITL auto-assist error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Analysis failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
