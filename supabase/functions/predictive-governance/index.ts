import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PredictiveRequest {
  entity_type?: 'model' | 'system' | 'dataset';
  entity_id?: string;
  prediction_types?: string[];
  lookback_days?: number;
}

interface Prediction {
  entity_type: string;
  entity_id: string;
  prediction_type: string;
  risk_score: number;
  confidence: number;
  predicted_timeframe_hours: number;
  factors: Record<string, unknown>;
}

// Weights for different signals
const SIGNAL_WEIGHTS = {
  recent_incidents: 0.30,
  drift_alerts: 0.25,
  evaluation_trend: 0.20,
  error_rate: 0.15,
  staleness: 0.10,
};

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

    const body: PredictiveRequest = await req.json().catch(() => ({}));
    const lookbackDays = body.lookback_days || 30;
    const predictionTypes = body.prediction_types || ['drift_risk', 'compliance_risk', 'incident_probability'];
    
    const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    const predictions: Prediction[] = [];

    // Analyze models
    if (!body.entity_type || body.entity_type === 'model') {
      let modelsQuery = supabase.from("models").select("id, name, status, updated_at");
      
      if (body.entity_id && body.entity_type === 'model') {
        modelsQuery = modelsQuery.eq("id", body.entity_id);
      }
      
      const { data: models } = await modelsQuery.limit(50);

      for (const model of models || []) {
        // Get recent incidents for this model
        const { data: incidents, count: incidentCount } = await supabase
          .from("incidents")
          .select("id, severity", { count: 'exact', head: false })
          .eq("model_id", model.id)
          .gte("created_at", cutoffDate);

        // Get evaluation trend
        const { data: evaluations } = await supabase
          .from("evaluation_runs")
          .select("overall_score, created_at")
          .eq("model_id", model.id)
          .order("created_at", { ascending: false })
          .limit(5);

        // Get drift alerts
        const { count: driftCount } = await supabase
          .from("drift_alerts")
          .select("id", { count: 'exact', head: true })
          .eq("model_id", model.id)
          .gte("detected_at", cutoffDate);

        // Calculate risk factors
        const incidentRisk = Math.min(100, (incidentCount || 0) * 15);
        const criticalIncidents = incidents?.filter(i => i.severity === 'critical').length || 0;
        const criticalRisk = criticalIncidents * 25;
        
        // Evaluation trend (declining scores = higher risk)
        let evalTrendRisk = 0;
        if (evaluations && evaluations.length >= 2) {
          const recent = evaluations[0]?.overall_score || 80;
          const older = evaluations[evaluations.length - 1]?.overall_score || 80;
          const trend = older - recent; // Positive = declining
          evalTrendRisk = Math.max(0, Math.min(100, trend * 2));
        }

        const driftRisk = Math.min(100, (driftCount || 0) * 20);
        
        // Staleness risk
        const daysSinceUpdate = (Date.now() - new Date(model.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        const stalenessRisk = Math.min(100, daysSinceUpdate * 2);

        // Calculate composite scores
        for (const predictionType of predictionTypes) {
          let riskScore = 0;
          let confidence = 0.7;
          let timeframeHours = 24;
          const factors: Record<string, unknown> = {};

          if (predictionType === 'drift_risk') {
            riskScore = Math.round(
              driftRisk * 0.4 +
              evalTrendRisk * 0.3 +
              stalenessRisk * 0.3
            );
            factors.drift_alerts = driftCount || 0;
            factors.eval_trend = evalTrendRisk > 0 ? 'declining' : 'stable';
            factors.staleness_days = Math.round(daysSinceUpdate);
            timeframeHours = riskScore > 70 ? 24 : 72;
            confidence = driftCount && driftCount > 0 ? 0.85 : 0.65;
          }

          if (predictionType === 'compliance_risk') {
            riskScore = Math.round(
              incidentRisk * 0.35 +
              criticalRisk * 0.35 +
              evalTrendRisk * 0.30
            );
            factors.recent_incidents = incidentCount || 0;
            factors.critical_incidents = criticalIncidents;
            factors.evaluation_score = evaluations?.[0]?.overall_score;
            timeframeHours = riskScore > 60 ? 48 : 168;
            confidence = incidentCount && incidentCount > 2 ? 0.80 : 0.60;
          }

          if (predictionType === 'incident_probability') {
            riskScore = Math.round(
              incidentRisk * 0.40 +
              driftRisk * 0.30 +
              evalTrendRisk * 0.20 +
              stalenessRisk * 0.10
            );
            factors.incident_history = incidentCount || 0;
            factors.drift_signals = driftCount || 0;
            factors.trend_direction = evalTrendRisk > 20 ? 'concerning' : 'stable';
            timeframeHours = 24;
            confidence = 0.70 + (incidentCount || 0) * 0.02;
          }

          if (riskScore > 20) { // Only store meaningful predictions
            predictions.push({
              entity_type: 'model',
              entity_id: model.id,
              prediction_type: predictionType,
              risk_score: Math.min(100, riskScore),
              confidence: Math.min(0.95, confidence),
              predicted_timeframe_hours: timeframeHours,
              factors,
            });
          }
        }
      }
    }

    // Analyze systems
    if (!body.entity_type || body.entity_type === 'system') {
      let systemsQuery = supabase.from("systems").select("id, name, deployment_status");
      
      if (body.entity_id && body.entity_type === 'system') {
        systemsQuery = systemsQuery.eq("id", body.entity_id);
      }
      
      const { data: systems } = await systemsQuery.limit(20);

      for (const system of systems || []) {
        const { count: incidentCount } = await supabase
          .from("incidents")
          .select("id", { count: 'exact', head: true })
          .eq("system_id", system.id)
          .gte("created_at", cutoffDate);

        const { count: violationCount } = await supabase
          .from("policy_violations")
          .select("id", { count: 'exact', head: true })
          .eq("system_id", system.id)
          .gte("created_at", cutoffDate);

        const incidentRisk = Math.min(100, (incidentCount || 0) * 12);
        const violationRisk = Math.min(100, (violationCount || 0) * 20);

        for (const predictionType of predictionTypes) {
          let riskScore = 0;
          const factors: Record<string, unknown> = {};

          if (predictionType === 'compliance_risk') {
            riskScore = Math.round(violationRisk * 0.6 + incidentRisk * 0.4);
            factors.policy_violations = violationCount || 0;
            factors.incidents = incidentCount || 0;
            factors.deployment_status = system.deployment_status;
          }

          if (predictionType === 'incident_probability') {
            riskScore = Math.round(incidentRisk * 0.5 + violationRisk * 0.5);
            factors.historical_incidents = incidentCount || 0;
            factors.violations = violationCount || 0;
          }

          if (riskScore > 20) {
            predictions.push({
              entity_type: 'system',
              entity_id: system.id,
              prediction_type: predictionType,
              risk_score: Math.min(100, riskScore),
              confidence: 0.70,
              predicted_timeframe_hours: 72,
              factors,
            });
          }
        }
      }
    }

    // Store predictions
    if (predictions.length > 0) {
      const { error: insertError } = await supabase
        .from("predictive_governance")
        .insert(predictions);

      if (insertError) {
        console.error("Failed to store predictions:", insertError);
      }
    }

    // Generate summary
    const summary = {
      total_predictions: predictions.length,
      high_risk_count: predictions.filter(p => p.risk_score >= 70).length,
      medium_risk_count: predictions.filter(p => p.risk_score >= 40 && p.risk_score < 70).length,
      low_risk_count: predictions.filter(p => p.risk_score < 40).length,
      by_type: predictionTypes.reduce((acc, type) => {
        acc[type] = predictions.filter(p => p.prediction_type === type).length;
        return acc;
      }, {} as Record<string, number>),
    };

    return new Response(
      JSON.stringify({
        success: true,
        predictions,
        summary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Predictive governance error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Prediction analysis failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
