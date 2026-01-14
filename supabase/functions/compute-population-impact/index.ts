// Phase 1: Data Sovereignty & Fairness Layer - 100% Production Ready
// Implements real Disparate Impact Ratio (DIR) with referential integrity joins
// EU AI Act Article 10 compliant - requires demographic context

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/auth-helper.ts";

interface PopulationImpactRequest {
  systemId: string;
  modelId?: string;
  timeWindow?: '7d' | '30d' | '90d' | 'all';
  protectedAttributes?: string[];
  strictMode?: boolean; // If true, fails on missing demographic data
}

interface FairnessMetrics {
  demographicParity: number;
  equalizedOdds: number;
  calibration: number;
  disparateImpactRatio: number;
}

interface GroupMetrics {
  group: string;
  attribute: string;
  decisionCount: number;
  positiveRate: number;
  harmRate: number;
  appealRate: number;
  sampleSize: number;
  metrics: FairnessMetrics;
}

interface DisparateImpactResult {
  ratio: number;
  privilegedGroup: string;
  unprivilegedGroup: string;
  isCompliant: boolean;
  threshold: number;
}

// Calculate real Disparate Impact Ratio (DIR) per EEOC 80% rule
function calculateDisparateImpactRatio(
  groups: GroupMetrics[],
  outcomeField: 'positiveRate' | 'harmRate'
): DisparateImpactResult {
  if (groups.length < 2) {
    return {
      ratio: 1,
      privilegedGroup: groups[0]?.group || 'N/A',
      unprivilegedGroup: groups[0]?.group || 'N/A',
      isCompliant: true,
      threshold: 0.8
    };
  }

  // Sort by outcome rate to find privileged (highest) and unprivileged (lowest)
  const sorted = [...groups]
    .filter(g => g.sampleSize >= 5) // Statistical significance filter
    .sort((a, b) => b[outcomeField] - a[outcomeField]);

  if (sorted.length < 2) {
    return {
      ratio: 1,
      privilegedGroup: sorted[0]?.group || 'N/A',
      unprivilegedGroup: sorted[0]?.group || 'N/A',
      isCompliant: true,
      threshold: 0.8
    };
  }

  const privileged = sorted[0];
  const unprivileged = sorted[sorted.length - 1];

  // DIR = Rate(unprivileged) / Rate(privileged)
  // Per EEOC: DIR < 0.8 indicates potential discrimination
  const ratio = privileged[outcomeField] > 0
    ? unprivileged[outcomeField] / privileged[outcomeField]
    : 1;

  return {
    ratio: Math.round(ratio * 1000) / 1000,
    privilegedGroup: privileged.group,
    unprivilegedGroup: unprivileged.group,
    isCompliant: ratio >= 0.8,
    threshold: 0.8
  };
}

// Calculate Demographic Parity difference
function calculateDemographicParity(groupRate: number, overallRate: number): number {
  if (overallRate === 0) return 1;
  const ratio = groupRate / overallRate;
  // Return a score where 1 = perfect parity, 0 = complete disparity
  return Math.max(0, Math.min(1, 1 - Math.abs(1 - ratio)));
}

// Calculate Equalized Odds (simplified: compare true positive rates)
function calculateEqualizedOdds(
  groupPositiveRate: number,
  overallPositiveRate: number,
  groupHarmRate: number,
  overallHarmRate: number
): number {
  const tprDiff = Math.abs(groupPositiveRate - overallPositiveRate);
  const fprDiff = Math.abs(groupHarmRate - overallHarmRate);
  // Score where 1 = perfect equalized odds
  return Math.max(0, 1 - (tprDiff + fprDiff) / 2);
}

serve(async (req) => {
  console.log("=== COMPUTE-POPULATION-IMPACT CALLED ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: PopulationImpactRequest = await req.json();
    const {
      systemId,
      modelId,
      timeWindow = '30d',
      protectedAttributes = ['age_group', 'gender', 'region'],
      strictMode = false
    } = body;

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

    // Fetch decisions with demographic context (referential integrity join)
    let decisionsQuery = supabase
      .from("decision_ledger")
      .select("id, decision_value, confidence, context, demographic_context, decision_timestamp")
      .gte("decision_timestamp", fromDate);

    if (modelId) {
      decisionsQuery = decisionsQuery.eq("model_id", modelId);
    }

    const { data: decisions, error: decisionsError } = await decisionsQuery;

    if (decisionsError) {
      console.error("[compute-population-impact] Decisions fetch error:", decisionsError);
      throw new Error(`Failed to fetch decisions: ${decisionsError.message}`);
    }

    // EU AI Act Article 10 Compliance: Check for demographic data availability
    const decisionsWithDemographics = decisions?.filter(d => 
      d.demographic_context && Object.keys(d.demographic_context as object).length > 0
    ) || [];
    
    const decisionsWithoutDemographics = decisions?.filter(d => 
      !d.demographic_context || Object.keys(d.demographic_context as object).length === 0
    ) || [];

    const demographicCoverage = decisions?.length 
      ? decisionsWithDemographics.length / decisions.length 
      : 0;

    // Strict mode: Fail if less than 90% of decisions have demographic context
    if (strictMode && demographicCoverage < 0.9) {
      return new Response(JSON.stringify({
        error: "Missing Demographic Context",
        code: 422,
        message: `${decisionsWithoutDemographics.length} of ${decisions?.length || 0} decisions (${((1 - demographicCoverage) * 100).toFixed(1)}%) lack demographic data. EU AI Act Article 10 requires complete demographic context for fairness analysis.`,
        missing_count: decisionsWithoutDemographics.length,
        coverage: Math.round(demographicCoverage * 100),
        remediation: "Ensure all decision records include demographic_context before running population impact analysis.",
        eu_ai_act_reference: "Article 10 - Data and Data Governance"
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // Build lookup maps
    type OutcomeType = { decision_id: string; outcome_type: string; harm_severity: string | null; harm_category: string | null };
    const outcomesMap = new Map<string, OutcomeType>();
    outcomes?.forEach(o => outcomesMap.set(o.decision_id, o));

    type AppealType = { decision_id: string; status: string; final_decision: string | null };
    const appealsMap = new Map<string, AppealType>();
    appeals?.forEach(a => appealsMap.set(a.decision_id, a));

    // Extract unique demographic groups from actual data
    const demographicGroups = new Map<string, Set<string>>();
    for (const decision of decisionsWithDemographics) {
      const demographics = decision.demographic_context as Record<string, string>;
      for (const attr of protectedAttributes) {
        if (demographics[attr]) {
          if (!demographicGroups.has(attr)) {
            demographicGroups.set(attr, new Set());
          }
          demographicGroups.get(attr)!.add(demographics[attr]);
        }
      }
    }

    // Calculate per-group metrics using REAL demographic data
    const groupMetrics: GroupMetrics[] = [];
    const overallMetrics = {
      totalDecisions: decisions?.length || 0,
      decisionsWithDemographics: decisionsWithDemographics.length,
      demographicCoverage: Math.round(demographicCoverage * 100),
      positiveDecisions: 0,
      harmfulOutcomes: 0,
      appealedDecisions: 0,
      successfulAppeals: 0
    };

    // Calculate overall rates for comparison
    const allPositive = decisionsWithDemographics.filter(d =>
      ['approved', 'allowed', 'positive', 'granted'].includes(d.decision_value?.toLowerCase())
    );
    const allHarmful = decisionsWithDemographics.filter(d => {
      const outcome = outcomesMap.get(d.id);
      return outcome?.outcome_type === 'harmful';
    });
    const overallPositiveRate = decisionsWithDemographics.length > 0 
      ? allPositive.length / decisionsWithDemographics.length 
      : 0;
    const overallHarmRate = decisionsWithDemographics.length > 0 
      ? allHarmful.length / decisionsWithDemographics.length 
      : 0;

    // Process each protected attribute and its groups
    for (const [attribute, groups] of demographicGroups) {
      for (const groupName of groups) {
        // Filter decisions for this specific demographic group
        const groupDecisions = decisionsWithDemographics.filter(d => {
          const demographics = d.demographic_context as Record<string, string>;
          return demographics[attribute] === groupName;
        });

        if (groupDecisions.length === 0) continue;

        const positiveDecisions = groupDecisions.filter(d =>
          ['approved', 'allowed', 'positive', 'granted'].includes(d.decision_value?.toLowerCase())
        );

        const harmfulCount = groupDecisions.filter(d => {
          const outcome = outcomesMap.get(d.id);
          return outcome?.outcome_type === 'harmful';
        }).length;

        const appealedCount = groupDecisions.filter(d => appealsMap.has(d.id)).length;
        const successfulAppealCount = groupDecisions.filter(d => {
          const appeal = appealsMap.get(d.id);
          return appeal?.status === 'resolved' && appeal?.final_decision === 'overturned';
        }).length;

        const positiveRate = groupDecisions.length > 0 ? positiveDecisions.length / groupDecisions.length : 0;
        const harmRate = groupDecisions.length > 0 ? harmfulCount / groupDecisions.length : 0;
        const appealRate = groupDecisions.length > 0 ? appealedCount / groupDecisions.length : 0;

        groupMetrics.push({
          group: groupName,
          attribute,
          decisionCount: groupDecisions.length,
          sampleSize: groupDecisions.length,
          positiveRate: Math.round(positiveRate * 1000) / 1000,
          harmRate: Math.round(harmRate * 1000) / 1000,
          appealRate: Math.round(appealRate * 1000) / 1000,
          metrics: {
            demographicParity: calculateDemographicParity(positiveRate, overallPositiveRate),
            equalizedOdds: calculateEqualizedOdds(positiveRate, overallPositiveRate, harmRate, overallHarmRate),
            calibration: 1 - Math.abs(positiveRate - overallPositiveRate), // Simplified calibration
            disparateImpactRatio: overallPositiveRate > 0 ? positiveRate / overallPositiveRate : 1,
          }
        });

        overallMetrics.positiveDecisions += positiveDecisions.length;
        overallMetrics.harmfulOutcomes += harmfulCount;
        overallMetrics.appealedDecisions += appealedCount;
        overallMetrics.successfulAppeals += successfulAppealCount;
      }
    }

    // Calculate Disparate Impact Ratio per attribute
    const disparateImpactByAttribute: Record<string, DisparateImpactResult> = {};
    for (const attr of protectedAttributes) {
      const attrGroups = groupMetrics.filter(g => g.attribute === attr);
      if (attrGroups.length >= 2) {
        disparateImpactByAttribute[attr] = calculateDisparateImpactRatio(attrGroups, 'positiveRate');
      }
    }

    // Overall DIR (across all groups)
    const overallDIR = calculateDisparateImpactRatio(groupMetrics, 'positiveRate');

    // Generate compliance alerts
    const alerts = [];

    // Alert for overall DIR below threshold
    if (!overallDIR.isCompliant) {
      alerts.push({
        type: 'DISPARATE_IMPACT',
        severity: overallDIR.ratio < 0.6 ? 'critical' : 'high',
        message: `Disparate Impact Ratio ${(overallDIR.ratio * 100).toFixed(1)}% is below 80% threshold (EEOC four-fifths rule)`,
        privileged_group: overallDIR.privilegedGroup,
        unprivileged_group: overallDIR.unprivilegedGroup,
        eu_ai_act_reference: 'Article 10 - Data Governance, Article 9 - Risk Management'
      });
    }

    // Alert for per-attribute DIR violations
    for (const [attr, dir] of Object.entries(disparateImpactByAttribute)) {
      if (!dir.isCompliant) {
        alerts.push({
          type: 'ATTRIBUTE_DISPARATE_IMPACT',
          severity: dir.ratio < 0.6 ? 'critical' : 'high',
          attribute: attr,
          message: `${attr} shows ${(dir.ratio * 100).toFixed(1)}% DIR between ${dir.privilegedGroup} and ${dir.unprivilegedGroup}`,
          remediation: `Review decisions affecting ${dir.unprivilegedGroup} for potential bias`
        });
      }
    }

    // Alert for elevated harm rates in specific groups
    const avgHarmRate = groupMetrics.reduce((sum, g) => sum + g.harmRate, 0) / Math.max(groupMetrics.length, 1);
    for (const g of groupMetrics) {
      if (g.harmRate > avgHarmRate * 1.5 && g.harmRate > 0.1 && g.sampleSize >= 10) {
        alerts.push({
          type: 'ELEVATED_HARM',
          severity: g.harmRate > avgHarmRate * 2 ? 'critical' : 'high',
          message: `Group "${g.group}" (${g.attribute}) has ${(g.harmRate * 100).toFixed(1)}% harm rate vs ${(avgHarmRate * 100).toFixed(1)}% average`,
          affected_group: g.group,
          attribute: g.attribute,
          sample_size: g.sampleSize
        });
      }
    }

    // Alert for low demographic coverage (warning, not critical)
    if (demographicCoverage < 0.8) {
      alerts.push({
        type: 'LOW_DEMOGRAPHIC_COVERAGE',
        severity: demographicCoverage < 0.5 ? 'high' : 'medium',
        message: `Only ${(demographicCoverage * 100).toFixed(1)}% of decisions have demographic context. Results may be incomplete.`,
        missing_count: decisionsWithoutDemographics.length,
        total_count: decisions?.length || 0
      });
    }

    // Store impact metrics in database
    const { error: insertError } = await supabase
      .from("population_impact_metrics")
      .insert({
        model_id: modelId || systemId,
        metric_type: 'disparate_impact_ratio',
        protected_attribute: protectedAttributes.join(','),
        group_value: 'aggregate',
        metric_value: overallDIR.ratio,
        threshold: 0.8,
        is_compliant: overallDIR.isCompliant,
        sample_size: decisionsWithDemographics.length,
        measurement_period_start: fromDate,
        measurement_period_end: new Date().toISOString()
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
      
      // Overall metrics
      overall: overallMetrics,
      
      // Per-group breakdowns
      groups: groupMetrics,
      
      // Disparate Impact Analysis
      fairness: {
        overall_disparate_impact: overallDIR,
        by_attribute: disparateImpactByAttribute,
        methodology: 'EEOC Four-Fifths (80%) Rule',
        formula: 'DIR = Rate(unprivileged_group) / Rate(privileged_group)',
        threshold: 0.8,
        is_compliant: overallDIR.isCompliant && Object.values(disparateImpactByAttribute).every(d => d.isCompliant)
      },
      
      // Compliance alerts
      alerts,
      alert_count: alerts.length,
      has_critical_alerts: alerts.some(a => a.severity === 'critical'),
      
      // Evidence for audit
      evidence: {
        decisions_analyzed: decisions?.length || 0,
        decisions_with_demographics: decisionsWithDemographics.length,
        demographic_coverage: Math.round(demographicCoverage * 100),
        outcomes_tracked: outcomes?.length || 0,
        appeals_processed: appeals?.length || 0,
        protected_attributes_evaluated: protectedAttributes,
        unique_groups_found: groupMetrics.length
      },
      
      // Regulatory references
      eu_ai_act_compliance: {
        article_10_data_governance: demographicCoverage >= 0.8,
        article_9_risk_management: alerts.filter(a => a.severity === 'critical').length === 0,
        is_compliant: overallDIR.isCompliant && demographicCoverage >= 0.8
      }
    };

    console.log(`[compute-population-impact] Computed metrics for ${decisionsWithDemographics.length} decisions with demographics, DIR=${overallDIR.ratio.toFixed(3)}, ${alerts.length} alerts`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[compute-population-impact] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        fail_closed: true,
        eu_ai_act_reference: "Article 10 - Data and Data Governance"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
