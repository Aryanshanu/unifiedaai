import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateSession, requireAuth, hasAnyRole, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";

interface RuntimeMetrics {
  totalRequests: number;
  blockedRequests: number;
  warnedRequests: number;
  errorRequests: number;
  avgLatency: number;
}

function calculateRiskTier(score: number): "low" | "medium" | "high" | "critical" {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  if (score <= 80) return "high";
  return "critical";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication required for risk computation
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    const { user } = authResult;
    
    // Only admins and analysts can run risk computation
    if (!hasAnyRole(user!, ['admin', 'analyst'])) {
      return new Response(
        JSON.stringify({ error: "Admin or analyst role required for risk computation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[compute-runtime-risk] User ${user?.id} starting runtime risk computation...`);
    
    // Use service client for system writes, user client for data reads (RLS)
    const serviceClient = getServiceClient();
    const supabase = authResult.supabase!;

    // Get all active systems (uses RLS)
    const { data: systems, error: systemsError } = await supabase
      .from("systems")
      .select("id, project_id, deployment_status, requires_approval")
      .in("status", ["active", "draft"]);

    if (systemsError) {
      console.error("Error fetching systems:", systemsError);
      throw systemsError;
    }

    console.log(`Processing ${systems?.length || 0} systems...`);
    const results: any[] = [];

    for (const system of systems || []) {
      try {
        // Get logs from last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: logs, error: logsError } = await supabase
          .from("request_logs")
          .select("decision, latency_ms, status_code")
          .eq("system_id", system.id)
          .gte("created_at", twentyFourHoursAgo);

        if (logsError) {
          console.error(`Error fetching logs for system ${system.id}:`, logsError);
          continue;
        }

        const totalRequests = logs?.length || 0;
        
        // Skip if no traffic
        if (totalRequests === 0) {
          console.log(`No traffic for system ${system.id}, skipping...`);
          continue;
        }

        const blockedRequests = logs?.filter(l => l.decision === "BLOCK").length || 0;
        const warnedRequests = logs?.filter(l => l.decision === "WARN").length || 0;
        const errorRequests = logs?.filter(l => (l.status_code || 0) >= 500).length || 0;
        const avgLatency = logs?.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / totalRequests;

        // Calculate rates
        const blockRate = blockedRequests / totalRequests;
        const warnRate = warnedRequests / totalRequests;
        const errorRate = errorRequests / totalRequests;
        
        // Calculate latency impact (assume 200ms is baseline, anything above increases risk)
        const latencyImpact = Math.max(0, Math.min(1, (avgLatency - 200) / 1000));

        // Calculate runtime risk score (0-100)
        // blockRate/warnRate/errorRate are fractions (0-1), multiply by weights to get 0-100 score
        const runtimeRiskScore = Math.min(100, Math.round(
          (blockRate * 100 * 0.4) +   // 40% weight for blocks
          (warnRate * 100 * 0.3) +    // 30% weight for warns  
          (errorRate * 100 * 0.2) +   // 20% weight for errors
          (latencyImpact * 100 * 0.1) // 10% weight for latency
        ));

        // Get latest static risk assessment
        const { data: latestRisk } = await supabase
          .from("risk_assessments")
          .select("static_risk_score, risk_tier")
          .eq("system_id", system.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const staticRiskScore = latestRisk?.static_risk_score || 0;
        
        // Calculate unified risk index (60% static, 40% runtime)
        const uriScore = Math.round((staticRiskScore * 0.6) + (runtimeRiskScore * 0.4));
        const riskTier = calculateRiskTier(uriScore);

        // Update system with new scores
        const { error: updateError } = await supabase
          .from("systems")
          .update({
            uri_score: uriScore,
            runtime_risk_score: runtimeRiskScore,
            last_risk_calculation: new Date().toISOString(),
          })
          .eq("id", system.id);

        if (updateError) {
          console.error(`Error updating system ${system.id}:`, updateError);
          continue;
        }

        // Store runtime metrics
        await supabase.from("risk_metrics").insert([
          { system_id: system.id, metric_name: "block_rate_24h", metric_value: blockRate * 100, time_window: "24h" },
          { system_id: system.id, metric_name: "warn_rate_24h", metric_value: warnRate * 100, time_window: "24h" },
          { system_id: system.id, metric_name: "error_rate_24h", metric_value: errorRate * 100, time_window: "24h" },
          { system_id: system.id, metric_name: "avg_latency_24h", metric_value: avgLatency, time_window: "24h" },
          { system_id: system.id, metric_name: "runtime_risk_score", metric_value: runtimeRiskScore, time_window: "24h" },
          { system_id: system.id, metric_name: "uri_score", metric_value: uriScore, time_window: "24h" },
        ]);

        // Check for auto-suspension: if block rate > 20% in 24h, suspend the system
        if (blockRate > 0.2 && system.deployment_status === "deployed") {
          console.log(`Auto-suspending system ${system.id} due to high block rate: ${blockRate * 100}%`);
          
          await supabase
            .from("systems")
            .update({ deployment_status: "blocked" })
            .eq("id", system.id);

          // Create incident
          await supabase.from("incidents").insert({
            title: `Auto-suspended: High block rate (${Math.round(blockRate * 100)}%)`,
            description: `System automatically suspended due to ${blockedRequests} blocked requests out of ${totalRequests} total in 24 hours.`,
            incident_type: "auto_suspension",
            severity: "critical",
            status: "open",
            model_id: null,
          });
        }

        results.push({
          systemId: system.id,
          totalRequests,
          blockRate: Math.round(blockRate * 100),
          warnRate: Math.round(warnRate * 100),
          errorRate: Math.round(errorRate * 100),
          avgLatency: Math.round(avgLatency),
          runtimeRiskScore,
          staticRiskScore: Math.round(staticRiskScore),
          uriScore,
          riskTier,
        });

        console.log(`Updated system ${system.id}: URI=${uriScore}, Runtime=${runtimeRiskScore}, Tier=${riskTier}`);
      } catch (err) {
        console.error(`Error processing system ${system.id}:`, err);
      }
    }

    console.log(`Completed runtime risk computation for ${results.length} systems`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Runtime risk computation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
