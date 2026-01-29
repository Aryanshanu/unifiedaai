import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BypassDetectionRequest {
  lookback_hours?: number;
  threshold_multiplier?: number;
}

interface BypassIndicator {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: Record<string, unknown>;
  detected_at: string;
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

    const body: BypassDetectionRequest = await req.json().catch(() => ({}));
    const lookbackHours = body.lookback_hours || 24;
    const thresholdMultiplier = body.threshold_multiplier || 3;
    
    const cutoffTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
    const indicators: BypassIndicator[] = [];

    // 1. Check for unusual rate limit patterns
    const { data: rateLimits } = await supabase
      .from("rate_limits")
      .select("identifier, request_count, window_start")
      .gte("window_start", cutoffTime)
      .order("request_count", { ascending: false })
      .limit(20);

    // Calculate average and detect outliers
    if (rateLimits && rateLimits.length > 0) {
      const avgRequests = rateLimits.reduce((sum, r) => sum + r.request_count, 0) / rateLimits.length;
      
      for (const limit of rateLimits) {
        if (limit.request_count > avgRequests * thresholdMultiplier) {
          indicators.push({
            type: 'rate_limit_anomaly',
            severity: limit.request_count > avgRequests * 5 ? 'high' : 'medium',
            description: `Unusual request volume from identifier: ${limit.identifier}`,
            evidence: {
              identifier: limit.identifier,
              request_count: limit.request_count,
              average: Math.round(avgRequests),
              multiplier: Math.round(limit.request_count / avgRequests * 10) / 10,
            },
            detected_at: new Date().toISOString(),
          });
        }
      }
    }

    // 2. Check for direct database modifications without audit trail
    const { data: auditLogs } = await supabase
      .from("admin_audit_log")
      .select("action_type, table_name, performed_by, performed_at")
      .gte("performed_at", cutoffTime)
      .is("performed_by", null);

    for (const log of auditLogs || []) {
      indicators.push({
        type: 'unattributed_change',
        severity: 'high',
        description: `Database change without user attribution on ${log.table_name}`,
        evidence: {
          table_name: log.table_name,
          action_type: log.action_type,
          performed_at: log.performed_at,
        },
        detected_at: new Date().toISOString(),
      });
    }

    // 3. Check for policy violations without corresponding review items
    const { data: violations } = await supabase
      .from("policy_violations")
      .select("id, severity, policy_id, created_at")
      .gte("created_at", cutoffTime)
      .eq("status", "open");

    for (const violation of violations || []) {
      // Check if there's a corresponding review item
      const { count } = await supabase
        .from("review_queue")
        .select("id", { count: 'exact', head: true })
        .eq("context->>policy_violation_id", violation.id);

      if (!count || count === 0) {
        indicators.push({
          type: 'unreviewed_violation',
          severity: violation.severity === 'critical' ? 'critical' : 'medium',
          description: `Policy violation ${violation.id.slice(0, 8)} has no review item`,
          evidence: {
            violation_id: violation.id,
            severity: violation.severity,
            created_at: violation.created_at,
          },
          detected_at: new Date().toISOString(),
        });
      }
    }

    // 4. Check for systems deployed without approval
    const { data: systems } = await supabase
      .from("systems")
      .select("id, name, deployment_status, requires_approval")
      .eq("deployment_status", "deployed")
      .eq("requires_approval", true);

    for (const system of systems || []) {
      const { data: approval } = await supabase
        .from("system_approvals")
        .select("id, status")
        .eq("system_id", system.id)
        .eq("status", "approved")
        .maybeSingle();

      if (!approval) {
        indicators.push({
          type: 'unauthorized_deployment',
          severity: 'critical',
          description: `System "${system.name}" deployed without required approval`,
          evidence: {
            system_id: system.id,
            system_name: system.name,
            deployment_status: system.deployment_status,
          },
          detected_at: new Date().toISOString(),
        });
      }
    }

    // 5. Check for models with blocked status that have recent predictions
    const { data: blockedModels } = await supabase
      .from("models")
      .select("id, name, status")
      .eq("status", "blocked");

    for (const model of blockedModels || []) {
      const { count: requestCount } = await supabase
        .from("request_logs")
        .select("id", { count: 'exact', head: true })
        .eq("model_id", model.id)
        .gte("created_at", cutoffTime);

      if (requestCount && requestCount > 0) {
        indicators.push({
          type: 'blocked_model_activity',
          severity: 'critical',
          description: `Blocked model "${model.name}" has ${requestCount} requests in the last ${lookbackHours}h`,
          evidence: {
            model_id: model.id,
            model_name: model.name,
            request_count: requestCount,
            lookback_hours: lookbackHours,
          },
          detected_at: new Date().toISOString(),
        });
      }
    }

    // Create incidents for critical/high severity indicators
    const incidentsCreated: string[] = [];
    for (const indicator of indicators.filter(i => i.severity === 'critical' || i.severity === 'high')) {
      const { data: incident, error } = await supabase
        .from("incidents")
        .insert({
          title: `Governance Bypass: ${indicator.type}`,
          description: indicator.description,
          severity: indicator.severity,
          status: 'open',
          incident_type: 'security_breach',
          detected_at: indicator.detected_at,
        })
        .select("id")
        .single();

      if (incident && !error) {
        incidentsCreated.push(incident.id);
      }
    }

    // Log to audit trail
    if (indicators.length > 0) {
      await supabase.from("admin_audit_log").insert({
        action_type: 'BYPASS_DETECTION',
        table_name: 'governance_bypass',
        change_summary: `Detected ${indicators.length} potential bypass indicators`,
        new_values: { indicators: indicators.slice(0, 10) }, // Limit stored indicators
      });
    }

    const summary = {
      total_indicators: indicators.length,
      critical: indicators.filter(i => i.severity === 'critical').length,
      high: indicators.filter(i => i.severity === 'high').length,
      medium: indicators.filter(i => i.severity === 'medium').length,
      low: indicators.filter(i => i.severity === 'low').length,
      incidents_created: incidentsCreated.length,
      by_type: indicators.reduce((acc, i) => {
        acc[i.type] = (acc[i.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    console.log(`Bypass detection completed: ${JSON.stringify(summary)}`);

    return new Response(
      JSON.stringify({
        success: true,
        indicators,
        incidents_created: incidentsCreated,
        summary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Bypass detection error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Bypass detection failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
