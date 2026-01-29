import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LifecycleRequest {
  action?: 'check_sla' | 'auto_close' | 'assign_rca' | 'bulk_resolve';
  incident_ids?: string[];
  resolution_reason?: string;
  max_age_days?: number;
}

interface LifecycleResult {
  escalated: string[];
  auto_closed: string[];
  rca_assigned: string[];
  bulk_resolved: string[];
  errors: string[];
}

// SLA thresholds in minutes by severity
const SLA_THRESHOLDS: Record<string, number> = {
  critical: 30,
  high: 120,
  medium: 480,
  low: 1440,
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

    const body: LifecycleRequest = await req.json().catch(() => ({}));
    const action = body.action || 'check_sla';
    
    const result: LifecycleResult = {
      escalated: [],
      auto_closed: [],
      rca_assigned: [],
      bulk_resolved: [],
      errors: [],
    };

    if (action === 'check_sla' || action === 'auto_close') {
      // Fetch open incidents
      const { data: incidents, error } = await supabase
        .from("incidents")
        .select("*")
        .in("status", ["open", "investigating"])
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Fetch incidents error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch incidents" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date();
      
      for (const incident of incidents || []) {
        const createdAt = new Date(incident.created_at);
        const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        const slaThreshold = SLA_THRESHOLDS[incident.severity] || 480;
        
        // Check SLA breach
        if (action === 'check_sla' && ageMinutes > slaThreshold) {
          // Escalate if not already high/critical
          if (incident.severity !== 'critical') {
            const newSeverity = incident.severity === 'high' ? 'critical' : 
                              incident.severity === 'medium' ? 'high' : 'medium';
            
            const { error: updateError } = await supabase
              .from("incidents")
              .update({ 
                severity: newSeverity,
                escalated_at: now.toISOString(),
                notes: `${incident.notes || ''}\n[AUTO] Escalated due to SLA breach (${Math.round(ageMinutes)} min > ${slaThreshold} min threshold)`
              })
              .eq("id", incident.id);

            if (updateError) {
              result.errors.push(`Failed to escalate ${incident.id}: ${updateError.message}`);
            } else {
              result.escalated.push(incident.id);
              
              // Create escalation review item
              await supabase.from("review_queue").insert({
                title: `SLA Breach: ${incident.title}`,
                review_type: 'escalation',
                severity: newSeverity,
                status: 'pending',
                context: {
                  incident_id: incident.id,
                  original_severity: incident.severity,
                  age_minutes: Math.round(ageMinutes),
                  sla_threshold: slaThreshold,
                },
              });
            }
          }
        }
        
        // Auto-close stale low-severity incidents
        if (action === 'auto_close') {
          const maxAgeDays = body.max_age_days || 7;
          const ageDays = ageMinutes / (60 * 24);
          
          if (ageDays > maxAgeDays && (incident.severity === 'low' || incident.severity === 'info')) {
            const { error: closeError } = await supabase
              .from("incidents")
              .update({
                status: 'resolved',
                resolved_at: now.toISOString(),
                resolution_notes: `[AUTO] Closed due to age (${Math.round(ageDays)} days) with no activity`,
              })
              .eq("id", incident.id);

            if (closeError) {
              result.errors.push(`Failed to auto-close ${incident.id}: ${closeError.message}`);
            } else {
              result.auto_closed.push(incident.id);
            }
          }
        }
      }
    }

    if (action === 'assign_rca') {
      // Fetch high/critical resolved incidents without RCA
      const { data: incidents, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("status", "resolved")
        .is("rca_template_id", null)
        .in("severity", ["critical", "high"])
        .limit(50);

      if (error) {
        console.error("Fetch resolved incidents error:", error);
      } else {
        for (const incident of incidents || []) {
          // Find matching RCA template
          const { data: template } = await supabase
            .from("rca_templates")
            .select("id")
            .eq("incident_type", incident.incident_type)
            .single();

          if (template) {
            const { error: assignError } = await supabase
              .from("incidents")
              .update({ 
                rca_template_id: template.id,
                follow_up_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              })
              .eq("id", incident.id);

            if (assignError) {
              result.errors.push(`Failed to assign RCA to ${incident.id}: ${assignError.message}`);
            } else {
              result.rca_assigned.push(incident.id);
            }
          }
        }
      }
    }

    if (action === 'bulk_resolve' && body.incident_ids?.length) {
      const reason = body.resolution_reason || 'Bulk resolved by administrator';
      const now = new Date().toISOString();

      for (const incidentId of body.incident_ids) {
        const { error: resolveError } = await supabase
          .from("incidents")
          .update({
            status: 'resolved',
            resolved_at: now,
            resolution_notes: reason,
          })
          .eq("id", incidentId);

        if (resolveError) {
          result.errors.push(`Failed to resolve ${incidentId}: ${resolveError.message}`);
        } else {
          result.bulk_resolved.push(incidentId);
        }
      }
    }

    // Calculate summary statistics
    const stats = {
      total_escalated: result.escalated.length,
      total_auto_closed: result.auto_closed.length,
      total_rca_assigned: result.rca_assigned.length,
      total_bulk_resolved: result.bulk_resolved.length,
      total_errors: result.errors.length,
    };

    console.log(`Incident lifecycle completed: ${JSON.stringify(stats)}`);

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result,
        statistics: stats,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Incident lifecycle error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Lifecycle processing failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
