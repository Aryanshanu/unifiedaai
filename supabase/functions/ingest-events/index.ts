import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RawEvent {
  event_type: 'data_quality' | 'model_perf' | 'fairness' | 'security' | 'compliance';
  source_system_id?: string;
  source_model_id?: string;
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  payload: Record<string, unknown>;
  correlation_id?: string;
}

interface IngestRequest {
  events: RawEvent[];
  trigger_processing?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get auth header for user context
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const body: IngestRequest = await req.json();
    const { events, trigger_processing = false } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ error: "Events array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate event types
    const validTypes = ['data_quality', 'model_perf', 'fairness', 'security', 'compliance'];
    const validSeverities = ['info', 'low', 'medium', 'high', 'critical'];

    const validatedEvents = events.map((event, index) => {
      if (!validTypes.includes(event.event_type)) {
        throw new Error(`Invalid event_type at index ${index}: ${event.event_type}`);
      }
      if (event.severity && !validSeverities.includes(event.severity)) {
        throw new Error(`Invalid severity at index ${index}: ${event.severity}`);
      }
      if (!event.payload || typeof event.payload !== 'object') {
        throw new Error(`Invalid payload at index ${index}`);
      }

      return {
        event_type: event.event_type,
        source_system_id: event.source_system_id || null,
        source_model_id: event.source_model_id || null,
        severity: event.severity || 'info',
        payload: event.payload,
        correlation_id: event.correlation_id || null,
        processed: false,
      };
    });

    // Batch insert events
    const { data: insertedEvents, error: insertError } = await supabase
      .from("events_raw")
      .insert(validatedEvents)
      .select("id, event_type, severity");

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to insert events", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Ingested ${insertedEvents?.length || 0} events`);

    // Optionally trigger processing
    let processingTriggered = false;
    if (trigger_processing && insertedEvents && insertedEvents.length > 0) {
      try {
        const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authHeader ? { Authorization: authHeader } : {}),
            apikey: supabaseKey,
          },
          body: JSON.stringify({ batch_size: 100 }),
        });
        
        if (processResponse.ok) {
          processingTriggered = true;
          console.log("Processing triggered successfully");
        }
      } catch (processError) {
        console.error("Failed to trigger processing:", processError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ingested_count: insertedEvents?.length || 0,
        events: insertedEvents,
        processing_triggered: processingTriggered,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Ingest events error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
