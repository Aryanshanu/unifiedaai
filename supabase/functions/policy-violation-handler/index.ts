import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PolicyViolation {
  incident_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  incident_type: string;
  title: string;
  description: string;
}

interface EscalationResult {
  hitl_created: boolean;
  notification_sent: boolean;
  escalation_level: 'log' | 'hitl' | 'hitl_notify';
}

async function determineEscalationLevel(
  supabase: any,
  violation: PolicyViolation
): Promise<'log' | 'hitl' | 'hitl_notify'> {
  // Check policy rules for this incident type
  const { data: policies } = await supabase
    .from('policies')
    .select('*')
    .eq('status', 'active')
    .or(`incident_types.cs.{${violation.incident_type}},incident_types.is.null`);

  // Default escalation based on severity
  switch (violation.severity) {
    case 'critical':
      return 'hitl_notify';
    case 'high':
      return 'hitl';
    case 'medium':
    case 'low':
    default:
      return 'log';
  }
}

async function createHITLEntry(supabase: any, violation: PolicyViolation): Promise<string | null> {
  const slaHours = violation.severity === 'critical' ? 2 : violation.severity === 'high' ? 8 : 24;
  
  const { data, error } = await supabase
    .from('review_queue')
    .insert({
      title: `[AUTO] ${violation.title}`,
      description: violation.description,
      review_type: 'policy_violation',
      severity: violation.severity,
      status: 'pending',
      context: {
        incident_id: violation.incident_id,
        incident_type: violation.incident_type,
        auto_escalated: true,
        escalated_at: new Date().toISOString(),
      },
      sla_deadline: new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[policy-violation-handler] Error creating HITL entry:', error);
    return null;
  }

  return data?.id || null;
}

async function sendNotification(supabase: any, violation: PolicyViolation): Promise<boolean> {
  try {
    // Create a notification record
    const { error } = await supabase
      .from('notification_channels')
      .select('id')
      .eq('is_active', true)
      .limit(1);

    // Log the notification attempt
    console.log(`[policy-violation-handler] Notification triggered for ${violation.severity} incident: ${violation.title}`);
    
    // In production, this would integrate with email/Slack/etc.
    // For now, we just log it
    return true;
  } catch (error) {
    console.error('[policy-violation-handler] Notification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { incident_id, severity, incident_type, title, description } = await req.json();

    if (!incident_id) {
      return new Response(
        JSON.stringify({ error: "incident_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[policy-violation-handler] Processing incident ${incident_id} (${severity})`);

    const violation: PolicyViolation = {
      incident_id,
      severity: severity || 'medium',
      incident_type: incident_type || 'unknown',
      title: title || 'Policy Violation',
      description: description || '',
    };

    // Determine escalation level
    const escalationLevel = await determineEscalationLevel(supabase, violation);
    console.log(`[policy-violation-handler] Escalation level: ${escalationLevel}`);

    const result: EscalationResult = {
      hitl_created: false,
      notification_sent: false,
      escalation_level: escalationLevel,
    };

    // Execute escalation based on level
    if (escalationLevel === 'hitl' || escalationLevel === 'hitl_notify') {
      const hitlId = await createHITLEntry(supabase, violation);
      result.hitl_created = !!hitlId;

      // Update incident with HITL link
      if (hitlId) {
        await supabase
          .from('incidents')
          .update({ 
            escalation_status: 'escalated',
            hitl_review_id: hitlId 
          })
          .eq('id', incident_id);
      }
    }

    if (escalationLevel === 'hitl_notify') {
      result.notification_sent = await sendNotification(supabase, violation);
    }

    // Log the escalation in audit
    await supabase.from('admin_audit_log').insert({
      action_type: 'ESCALATION',
      table_name: 'incidents',
      record_id: incident_id,
      change_summary: `Auto-escalated ${severity} incident: ${escalationLevel}`,
    });

    console.log(`[policy-violation-handler] Completed: ${JSON.stringify(result)}`);

    return new Response(
      JSON.stringify({
        success: true,
        incident_id,
        ...result,
        message: `Incident processed with ${escalationLevel} escalation`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[policy-violation-handler] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
