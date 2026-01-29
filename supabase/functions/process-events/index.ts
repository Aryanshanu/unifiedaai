import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  batch_size?: number;
}

interface EventRow {
  id: string;
  event_type: string;
  source_system_id: string | null;
  source_model_id: string | null;
  severity: string;
  payload: Record<string, unknown>;
  correlation_id: string | null;
  created_at: string;
}

interface AlertResult {
  id: string;
  severity: string;
  title: string;
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

    const body: ProcessRequest = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 100;

    // Fetch unprocessed events
    const { data: events, error: fetchError } = await supabase
      .from("events_raw")
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch events" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed_count: 0, 
          alerts_created: 0,
          message: "No unprocessed events found" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${events.length} events`);

    // Group events by correlation_id for compound alert detection
    const correlatedGroups = new Map<string, EventRow[]>();
    const uncorrelatedEvents: EventRow[] = [];

    for (const event of events as EventRow[]) {
      if (event.correlation_id) {
        const group = correlatedGroups.get(event.correlation_id) || [];
        group.push(event);
        correlatedGroups.set(event.correlation_id, group);
      } else {
        uncorrelatedEvents.push(event);
      }
    }

    const alertsCreated: AlertResult[] = [];
    const processedEventIds: string[] = [];

    // Process uncorrelated events individually
    for (const event of uncorrelatedEvents) {
      const alert = await processEvent(supabase, event);
      if (alert) {
        alertsCreated.push(alert);
      }
      processedEventIds.push(event.id);
    }

    // Process correlated event groups (compound alerts)
    for (const [correlationId, eventGroup] of correlatedGroups) {
      const alert = await processCorrelatedEvents(supabase, correlationId, eventGroup);
      if (alert) {
        alertsCreated.push(alert);
      }
      processedEventIds.push(...eventGroup.map(e => e.id));
    }

    // Mark events as processed
    if (processedEventIds.length > 0) {
      const { error: updateError } = await supabase
        .from("events_raw")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .in("id", processedEventIds);

      if (updateError) {
        console.error("Failed to mark events as processed:", updateError);
      }
    }

    console.log(`Created ${alertsCreated.length} alerts from ${processedEventIds.length} events`);

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: processedEventIds.length,
        alerts_created: alertsCreated.length,
        alerts: alertsCreated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Process events error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// deno-lint-ignore no-explicit-any
async function processEvent(
  supabase: SupabaseClient<any, any, any>,
  event: EventRow
): Promise<AlertResult | null> {
  // Determine if event should trigger an alert based on severity/thresholds
  const shouldAlert = shouldCreateAlert(event);
  
  if (!shouldAlert) {
    return null;
  }

  const incidentTitle = generateIncidentTitle(event);
  const incidentDescription = generateIncidentDescription(event);
  const mappedSeverity = mapSeverity(event.severity);

  // Check for duplicate incidents (deduplication)
  const signature = generateSignature(event);
  const { data: existingIncident } = await supabase
    .from("incidents")
    .select("id")
    .eq("failure_signature", signature)
    .eq("status", "open")
    .maybeSingle();

  if (existingIncident) {
    console.log(`Duplicate incident found, skipping: ${signature}`);
    return null;
  }

  // Create incident
  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      title: incidentTitle,
      description: incidentDescription,
      severity: mappedSeverity,
      status: "open",
      incident_type: mapEventTypeToIncidentType(event.event_type),
      model_id: event.source_model_id,
      system_id: event.source_system_id,
      failure_signature: signature,
      detected_at: event.created_at,
    })
    .select("id, severity, title")
    .single();

  if (error) {
    console.error("Failed to create incident:", error);
    return null;
  }

  // Auto-assign owner if available
  await autoAssignOwner(supabase, String(incident.id), event);

  return {
    id: String(incident.id),
    severity: String(incident.severity),
    title: String(incident.title),
  };
}

// deno-lint-ignore no-explicit-any
async function processCorrelatedEvents(
  supabase: SupabaseClient<any, any, any>,
  correlationId: string,
  events: EventRow[]
): Promise<AlertResult | null> {
  // For correlated events, create a compound alert
  const maxSeverity = getMaxSeverity(events);
  const eventTypes = [...new Set(events.map(e => e.event_type))];
  
  const title = `Compound Alert: ${eventTypes.join(" + ")} detected`;
  const description = `Multiple related issues detected (correlation: ${correlationId}):\n` +
    events.map(e => `- ${e.event_type}: ${JSON.stringify(e.payload).slice(0, 100)}`).join("\n");

  const signature = `compound:${correlationId}`;
  
  const { data: existingIncident } = await supabase
    .from("incidents")
    .select("id")
    .eq("failure_signature", signature)
    .eq("status", "open")
    .maybeSingle();

  if (existingIncident) {
    return null;
  }

  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      title,
      description,
      severity: mapSeverity(maxSeverity),
      status: "open",
      incident_type: "compound_alert",
      failure_signature: signature,
      detected_at: events[0].created_at,
    })
    .select("id, severity, title")
    .single();

  if (error) {
    console.error("Failed to create compound incident:", error);
    return null;
  }

  return {
    id: String(incident.id),
    severity: String(incident.severity),
    title: String(incident.title),
  };
}

function shouldCreateAlert(event: EventRow): boolean {
  // Create alerts for medium, high, or critical severity
  const alertSeverities = ['medium', 'high', 'critical'];
  return alertSeverities.includes(event.severity);
}

function generateIncidentTitle(event: EventRow): string {
  const typeLabels: Record<string, string> = {
    data_quality: "Data Quality Issue",
    model_perf: "Model Performance Degradation",
    fairness: "Fairness Disparity Detected",
    security: "Security Anomaly",
    compliance: "Compliance Violation",
  };
  
  const label = typeLabels[event.event_type] || "Unknown Event";
  const severity = event.severity.toUpperCase();
  
  return `[${severity}] ${label}`;
}

function generateIncidentDescription(event: EventRow): string {
  return `Event Type: ${event.event_type}\n` +
    `Severity: ${event.severity}\n` +
    `Detected: ${event.created_at}\n` +
    `Payload: ${JSON.stringify(event.payload, null, 2)}`;
}

function generateSignature(event: EventRow): string {
  const key = `${event.event_type}:${event.source_system_id || 'none'}:${event.source_model_id || 'none'}`;
  return key;
}

function mapEventTypeToIncidentType(eventType: string): string {
  const mapping: Record<string, string> = {
    data_quality: "data_quality",
    model_perf: "performance_degradation",
    fairness: "bias_detected",
    security: "security_breach",
    compliance: "policy_violation",
  };
  return mapping[eventType] || "unknown";
}

function mapSeverity(severity: string): string {
  // Map event severity to incident severity enum
  const mapping: Record<string, string> = {
    info: "low",
    low: "low",
    medium: "medium",
    high: "high",
    critical: "critical",
  };
  return mapping[severity] || "medium";
}

function getMaxSeverity(events: EventRow[]): string {
  const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
  let maxIndex = 0;
  
  for (const event of events) {
    const index = severityOrder.indexOf(event.severity);
    if (index > maxIndex) {
      maxIndex = index;
    }
  }
  
  return severityOrder[maxIndex];
}

// deno-lint-ignore no-explicit-any
async function autoAssignOwner(
  supabase: SupabaseClient<any, any, any>,
  incidentId: string,
  event: EventRow
): Promise<void> {
  try {
    // Look up owner from ownership table
    let ownerQuery = supabase.from("ownership").select("owner_user_id, escalation_email");
    
    if (event.source_system_id) {
      ownerQuery = ownerQuery.eq("entity_type", "system").eq("entity_id", event.source_system_id);
    } else if (event.source_model_id) {
      ownerQuery = ownerQuery.eq("entity_type", "model").eq("entity_id", event.source_model_id);
    } else {
      return;
    }

    const { data: ownership } = await ownerQuery.maybeSingle();

    if (ownership?.owner_user_id) {
      await supabase
        .from("incidents")
        .update({ assignee_id: ownership.owner_user_id })
        .eq("id", incidentId);
      
      console.log(`Auto-assigned incident ${incidentId} to owner ${ownership.owner_user_id}`);
    }
  } catch (error) {
    console.error("Failed to auto-assign owner:", error);
  }
}
