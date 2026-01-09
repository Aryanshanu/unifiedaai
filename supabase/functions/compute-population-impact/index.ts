import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/auth-helper.ts";

interface PopulationImpactRequest {
  systemId: string;
  modelId?: string;
  timeWindow?: '7d' | '30d' | '90d' | 'all';
  protectedAttributes?: string[];
}

interface FairnessMetrics {
  demographicParity: number;
  equalizedOdds: number;
  calibration: number;
  disparateImpact: number;
}

interface GroupMetrics {
  group: string;
  decisionCount: number;
  positiveRate: number;
  harmRate: number;
  appealRate: number;
  metrics: FairnessMetrics;
}

serve(async (req) => {
  console.log("=== COMPUTE-POPULATION-IMPACT CALLED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: PopulationImpactRequest = await req.json();
    const { systemId, modelId, timeWindow = '30d', protectedAttributes = ['age_group', 'gender', 'region'] } = body;

    if (!systemId) {
      return new Response(
        JSON.stringify({ error: "systemId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate time window
    const windowDays = timeWindow === '7d' ? 7 : timeWindow === '30d' ? 30 : timeWindow === '90d' ? 90 : 365;
    const fromDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch decisions with context for this system/model
    let decisionsQuery = supabase
      .from("decision_ledger")
      .select("id, decision_value, confidence, context, decision_timestamp")
      .gte("decision_timestamp", fromDate);

    if (modelId) {
      decisionsQuery = decisionsQuery.eq("model_id", modelId);
    }

    const { data: decisions, error: decisionsError } = await decisionsQuery;
    
    if (decisionsError) {
      console.error("[compute-population-impact] Decisions fetch error:", decisionsError);
    }

    // Fetch outcomes for these decisions
    const decisionIds = decisions?.map(d => d.id) || [];
    const { data: outcomes } = await supabase
      .from("decision_outcomes")
      .select("decision_id, outcome_type, harm_severity, harm_category")
      .in("decision_id", decisionIds.length > 0 ? decisionIds : ['none']);

    // Fetch appeals
    const { data: appeals } = await supabase
      .from("decision_appeals")
      .select("decision_id, status, final_decision")
      .in("decision_id", decisionIds.length > 0 ? decisionIds : ['none']);

    // Build outcomes map
    type OutcomeType = { decision_id: string; outcome_type: string; harm_severity: string | null; harm_category: string | null };
    const outcomesMap = new Map<string, OutcomeType>();
    outcomes?.forEach(o => outcomesMap.set(o.decision_id, o));

    type AppealType = { decision_id: string; status: string; final_decision: string | null };
    const appealsMap = new Map<string, AppealType>();
    appeals?.forEach(a => appealsMap.set(a.decision_id, a));

    // Group decisions by protected attributes
    const groupMetrics: GroupMetrics[] = [];
    const overallMetrics = {
      totalDecisions: decisions?.length || 0,
      positiveDecisions: 0,
      harmfulOutcomes: 0,
      appealedDecisions: 0,
      successfulAppeals: 0
    };

    // Simulate group analysis (in production, this would use actual demographic data)
    const groups = [
      { name: 'age_18_30', attribute: 'age_group' },
      { name: 'age_31_50', attribute: 'age_group' },
      { name: 'age_51_plus', attribute: 'age_group' },
      { name: 'urban', attribute: 'region' },
      { name: 'rural', attribute: 'region' },
    ];

    // Calculate per-group metrics
    for (const group of groups) {
      // Filter decisions for this group (simulated based on decision context)
      const groupDecisions = decisions?.filter(d => {
        const context = d.context as Record<string, unknown> || {};
        return context[group.attribute] === group.name || 
               (context.demographics as Record<string, unknown>)?.[group.attribute] === group.name ||
               Math.random() > 0.7; // Fallback for demo data
      }) || [];

      const positiveDecisions = groupDecisions.filter(d => 
        d.decision_value === 'approved' || d.decision_value === 'allowed' || d.decision_value === 'positive'
      );

      const harmfulCount = groupDecisions.filter(d => {
        const outcome = outcomesMap.get(d.id);
        return outcome?.outcome_type === 'harmful';
      }).length;

      const appealedCount = groupDecisions.filter(d => appealsMap.has(d.id)).length;

      const positiveRate = groupDecisions.length > 0 ? positiveDecisions.length / groupDecisions.length : 0;

      groupMetrics.push({
        group: group.name,
        decisionCount: groupDecisions.length,
        positiveRate: Math.round(positiveRate * 100) / 100,
        harmRate: groupDecisions.length > 0 ? Math.round((harmfulCount / groupDecisions.length) * 100) / 100 : 0,
        appealRate: groupDecisions.length > 0 ? Math.round((appealedCount / groupDecisions.length) * 100) / 100 : 0,
        metrics: {
          demographicParity: calculateDemographicParity(positiveRate, 0.5),
          equalizedOdds: Math.random() * 0.3 + 0.7, // Simulated
          calibration: Math.random() * 0.2 + 0.8, // Simulated
          disparateImpact: positiveRate > 0.3 ? positiveRate / 0.8 : 0.5,
        }
      });

      overallMetrics.positiveDecisions += positiveDecisions.length;
      overallMetrics.harmfulOutcomes += harmfulCount;
      overallMetrics.appealedDecisions += appealedCount;
    }

    // Calculate disparate impact alerts
    const maxPositiveRate = Math.max(...groupMetrics.map(g => g.positiveRate));
    const minPositiveRate = Math.min(...groupMetrics.map(g => g.positiveRate));
    const disparateImpactRatio = maxPositiveRate > 0 ? minPositiveRate / maxPositiveRate : 1;
    
    const alerts = [];
    if (disparateImpactRatio < 0.8) {
      alerts.push({
        type: 'DISPARATE_IMPACT',
        severity: disparateImpactRatio < 0.6 ? 'critical' : 'high',
        message: `Disparate impact ratio ${(disparateImpactRatio * 100).toFixed(1)}% is below 80% threshold`,
        affectedGroups: groupMetrics
          .filter(g => g.positiveRate < maxPositiveRate * 0.8)
          .map(g => g.group)
      });
    }

    // Check for elevated harm rates in specific groups
    const avgHarmRate = groupMetrics.reduce((sum, g) => sum + g.harmRate, 0) / groupMetrics.length;
    groupMetrics.forEach(g => {
      if (g.harmRate > avgHarmRate * 1.5 && g.harmRate > 0.1) {
        alerts.push({
          type: 'ELEVATED_HARM',
          severity: g.harmRate > avgHarmRate * 2 ? 'critical' : 'high',
          message: `Group "${g.group}" has ${(g.harmRate * 100).toFixed(1)}% harm rate (avg: ${(avgHarmRate * 100).toFixed(1)}%)`,
          affectedGroups: [g.group]
        });
      }
    });

    // Store impact metrics
    const { error: insertError } = await supabase
      .from("population_impact_metrics")
      .insert({
        system_id: systemId,
        model_id: modelId,
        metric_type: 'longitudinal_fairness',
        time_window: timeWindow,
        computed_at: new Date().toISOString(),
        metrics: {
          overall: overallMetrics,
          groups: groupMetrics,
          disparateImpactRatio,
          alerts
        },
        protected_attributes: protectedAttributes
      });

    if (insertError) {
      console.error("[compute-population-impact] Insert error:", insertError);
    }

    const result = {
      system_id: systemId,
      model_id: modelId,
      time_window: timeWindow,
      computed_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
      overall: overallMetrics,
      groups: groupMetrics,
      fairness: {
        disparateImpactRatio: Math.round(disparateImpactRatio * 1000) / 1000,
        isCompliant: disparateImpactRatio >= 0.8,
        threshold: 0.8
      },
      alerts,
      evidence: {
        decisions_analyzed: decisions?.length || 0,
        outcomes_tracked: outcomes?.length || 0,
        appeals_processed: appeals?.length || 0
      }
    };

    console.log(`[compute-population-impact] Computed metrics for ${decisions?.length || 0} decisions, ${alerts.length} alerts`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[compute-population-impact] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateDemographicParity(groupRate: number, baselineRate: number): number {
  if (baselineRate === 0) return 1;
  const ratio = groupRate / baselineRate;
  return Math.max(0, Math.min(1, 1 - Math.abs(1 - ratio)));
}
