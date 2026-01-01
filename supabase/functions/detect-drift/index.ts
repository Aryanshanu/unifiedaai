import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateSession, requireAuth, hasAnyRole, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";

interface DriftMetrics {
  psi: number; // Population Stability Index
  klDivergence: number; // KL Divergence
  latencyDrift: number;
  errorRateDrift: number;
}

// Calculate Population Stability Index (PSI)
function calculatePSI(baseline: number[], current: number[]): number {
  if (baseline.length === 0 || current.length === 0) return 0;
  
  const buckets = 10;
  const baselineHist = new Array(buckets).fill(0);
  const currentHist = new Array(buckets).fill(0);
  
  const min = Math.min(...baseline, ...current);
  const max = Math.max(...baseline, ...current);
  const bucketSize = (max - min) / buckets || 1;
  
  for (const val of baseline) {
    const idx = Math.min(Math.floor((val - min) / bucketSize), buckets - 1);
    baselineHist[idx]++;
  }
  for (const val of current) {
    const idx = Math.min(Math.floor((val - min) / bucketSize), buckets - 1);
    currentHist[idx]++;
  }
  
  // Normalize
  const baselineTotal = baseline.length;
  const currentTotal = current.length;
  
  let psi = 0;
  for (let i = 0; i < buckets; i++) {
    const baselineP = (baselineHist[i] / baselineTotal) || 0.0001;
    const currentP = (currentHist[i] / currentTotal) || 0.0001;
    psi += (currentP - baselineP) * Math.log(currentP / baselineP);
  }
  
  return Math.abs(psi);
}

// Calculate KL Divergence
function calculateKLDivergence(p: number[], q: number[]): number {
  if (p.length === 0 || q.length === 0) return 0;
  
  const pSum = p.reduce((a, b) => a + b, 0) || 1;
  const qSum = q.reduce((a, b) => a + b, 0) || 1;
  
  let kl = 0;
  for (let i = 0; i < Math.min(p.length, q.length); i++) {
    const pNorm = (p[i] / pSum) || 0.0001;
    const qNorm = (q[i] / qSum) || 0.0001;
    kl += pNorm * Math.log(pNorm / qNorm);
  }
  
  return Math.abs(kl);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Authentication required for drift detection
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    const { user } = authResult;
    
    // Only admins and analysts can run drift detection
    if (!hasAnyRole(user!, ['admin', 'analyst'])) {
      return new Response(
        JSON.stringify({ error: "Admin or analyst role required for drift detection" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[detect-drift] User ${user?.id} starting drift detection...`);
    
    const serviceClient = getServiceClient();
    const supabase = authResult.supabase!;

    // Get all active systems (uses RLS)
    const { data: systems, error: systemsError } = await supabase
      .from("systems")
      .select("id, name, project_id")
      .eq("status", "active");

    if (systemsError) throw systemsError;

    const alertsCreated: any[] = [];
    const incidentsCreated: any[] = [];

    for (const system of systems || []) {
      console.log(`Analyzing drift for system: ${system.name}`);

      // Get request logs from last 5 minutes (current window)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: currentLogs } = await supabase
        .from("request_logs")
        .select("latency_ms, status_code, decision, engine_scores")
        .eq("system_id", system.id)
        .gte("created_at", fiveMinutesAgo);

      // Get request logs from 1 hour ago (baseline window)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneHourFiveMinAgo = new Date(Date.now() - 65 * 60 * 1000).toISOString();
      const { data: baselineLogs } = await supabase
        .from("request_logs")
        .select("latency_ms, status_code, decision, engine_scores")
        .eq("system_id", system.id)
        .gte("created_at", oneHourFiveMinAgo)
        .lt("created_at", oneHourAgo);

      if (!currentLogs?.length || !baselineLogs?.length) {
        console.log(`Insufficient data for system ${system.name}`);
        continue;
      }

      // Extract metrics
      const currentLatencies = currentLogs.map(l => l.latency_ms || 0);
      const baselineLatencies = baselineLogs.map(l => l.latency_ms || 0);
      
      const currentErrors = currentLogs.filter(l => (l.status_code || 0) >= 400).length;
      const baselineErrors = baselineLogs.filter(l => (l.status_code || 0) >= 400).length;
      
      const currentBlocks = currentLogs.filter(l => l.decision === "BLOCK").length;
      const baselineBlocks = baselineLogs.filter(l => l.decision === "BLOCK").length;

      // Calculate drift metrics
      const psi = calculatePSI(baselineLatencies, currentLatencies);
      const klDivergence = calculateKLDivergence(
        baselineLatencies.slice(0, 100), 
        currentLatencies.slice(0, 100)
      );
      
      const currentErrorRate = currentErrors / currentLogs.length;
      const baselineErrorRate = baselineErrors / baselineLogs.length || 0.01;
      const errorRateDrift = Math.abs(currentErrorRate - baselineErrorRate);
      
      const currentBlockRate = currentBlocks / currentLogs.length;
      const baselineBlockRate = baselineBlocks / baselineLogs.length || 0.01;
      const blockRateDrift = Math.abs(currentBlockRate - baselineBlockRate);

      console.log(`System ${system.name} metrics:`, {
        psi,
        klDivergence,
        errorRateDrift,
        blockRateDrift,
        currentSamples: currentLogs.length,
        baselineSamples: baselineLogs.length
      });

      // Create alerts based on thresholds
      const alerts: any[] = [];

      // PSI threshold: > 0.25 indicates significant drift
      if (psi > 0.25) {
        alerts.push({
          model_id: system.id, // Using system_id as model_id for now
          drift_type: "latency_distribution",
          drift_value: psi,
          feature: "response_latency",
          severity: psi > 0.5 ? "critical" : "high",
          status: "open"
        });
      }

      // KL Divergence threshold: > 0.1 indicates meaningful divergence
      if (klDivergence > 0.1) {
        alerts.push({
          model_id: system.id,
          drift_type: "kl_divergence",
          drift_value: klDivergence,
          feature: "latency_pattern",
          severity: klDivergence > 0.3 ? "high" : "medium",
          status: "open"
        });
      }

      // Error rate drift: > 10% increase
      if (errorRateDrift > 0.1) {
        alerts.push({
          model_id: system.id,
          drift_type: "error_rate",
          drift_value: errorRateDrift * 100,
          feature: "error_rate",
          severity: errorRateDrift > 0.2 ? "critical" : "high",
          status: "open"
        });
      }

      // Block rate drift: > 15% increase
      if (blockRateDrift > 0.15) {
        alerts.push({
          model_id: system.id,
          drift_type: "block_rate",
          drift_value: blockRateDrift * 100,
          feature: "safety_blocks",
          severity: blockRateDrift > 0.3 ? "critical" : "high",
          status: "open"
        });
      }

      // Insert alerts
      if (alerts.length > 0) {
        const { data: insertedAlerts, error: alertError } = await supabase
          .from("drift_alerts")
          .insert(alerts)
          .select();

        if (alertError) {
          console.error("Error inserting drift alerts:", alertError);
        } else {
          alertsCreated.push(...(insertedAlerts || []));
          console.log(`Created ${alerts.length} drift alerts for ${system.name}`);
        }

        // Create incidents for critical alerts
        const criticalAlerts = alerts.filter(a => a.severity === "critical");
        for (const alert of criticalAlerts) {
          const { data: incident, error: incidentError } = await supabase
            .from("incidents")
            .insert({
              title: `Critical Drift: ${alert.drift_type} on ${system.name}`,
              description: `Detected ${alert.drift_type} drift of ${alert.drift_value.toFixed(3)} on feature "${alert.feature}". This exceeds critical thresholds and requires immediate attention.`,
              incident_type: "drift_detection",
              severity: "critical",
              status: "open"
            })
            .select()
            .single();

          if (!incidentError && incident) {
            incidentsCreated.push(incident);
            
            // Auto-escalate to HITL
            await supabase.from("review_queue").insert({
              title: `Drift Incident: ${alert.drift_type}`,
              description: `Critical drift detected. Value: ${alert.drift_value.toFixed(3)}`,
              review_type: "drift_escalation",
              severity: "critical",
              status: "pending",
              context: {
                system_id: system.id,
                system_name: system.name,
                incident_id: incident.id,
                drift_metrics: alert
              },
              sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
            });
          }
        }
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`Drift detection completed in ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        execution_time_ms: executionTime,
        systems_analyzed: systems?.length || 0,
        alerts_created: alertsCreated.length,
        incidents_created: incidentsCreated.length,
        details: {
          alerts: alertsCreated,
          incidents: incidentsCreated
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Drift detection error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
