import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  total_events?: number;
  batch_size?: number;
  include_correlations?: boolean;
}

interface EventPayload {
  event_type: string;
  severity: string;
  payload: Record<string, unknown>;
  source_system_id?: string;
  source_model_id?: string;
  correlation_id?: string;
}

// Event type distributions (as percentages)
const EVENT_TYPE_DISTRIBUTION = {
  data_quality: 0.45,
  model_perf: 0.20,
  fairness: 0.15,
  security: 0.12,
  compliance: 0.08,
};

// Severity distributions (as percentages) - adjusted to generate more alerts
// Increased medium+ to ensure incidents are created
const SEVERITY_DISTRIBUTION = {
  critical: 0.10,
  high: 0.25,
  medium: 0.35,
  low: 0.20,
  info: 0.10,
};

function selectFromDistribution(distribution: Record<string, number>): string {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [key, prob] of Object.entries(distribution)) {
    cumulative += prob;
    if (rand <= cumulative) {
      return key;
    }
  }
  
  return Object.keys(distribution)[0];
}

function generatePayloadForType(eventType: string): Record<string, unknown> {
  const timestamp = new Date().toISOString();
  
  switch (eventType) {
    case 'data_quality':
      return {
        dimension: ['completeness', 'validity', 'uniqueness', 'freshness', 'consistency', 'accuracy'][Math.floor(Math.random() * 6)],
        score: Math.random() * 0.4 + 0.5, // 0.5-0.9 range
        threshold: 0.85,
        affected_rows: Math.floor(Math.random() * 10000),
        dataset_name: `dataset_${Math.floor(Math.random() * 100)}`,
        detected_at: timestamp,
      };
    
    case 'model_perf':
      return {
        metric: ['accuracy', 'precision', 'recall', 'f1_score', 'latency_ms'][Math.floor(Math.random() * 5)],
        current_value: Math.random() * 0.3 + 0.6,
        baseline_value: 0.85,
        degradation_pct: Math.random() * 20,
        model_version: `v${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
        detected_at: timestamp,
      };
    
    case 'fairness':
      return {
        metric: ['demographic_parity', 'equalized_odds', 'equal_opportunity'][Math.floor(Math.random() * 3)],
        protected_attribute: ['gender', 'age_group', 'ethnicity', 'region'][Math.floor(Math.random() * 4)],
        disparity_score: Math.random() * 0.3,
        threshold: 0.1,
        affected_predictions: Math.floor(Math.random() * 5000),
        detected_at: timestamp,
      };
    
    case 'security':
      return {
        threat_type: ['injection_attempt', 'rate_limit_breach', 'unauthorized_access', 'data_exfiltration'][Math.floor(Math.random() * 4)],
        source_ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        request_count: Math.floor(Math.random() * 1000),
        blocked: Math.random() > 0.3,
        detected_at: timestamp,
      };
    
    case 'compliance':
      return {
        regulation: ['GDPR', 'EU_AI_ACT', 'CCPA', 'HIPAA'][Math.floor(Math.random() * 4)],
        article: `Article ${Math.floor(Math.random() * 50)}`,
        violation_type: ['data_retention', 'consent_missing', 'audit_gap', 'documentation'][Math.floor(Math.random() * 4)],
        risk_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        detected_at: timestamp,
      };
    
    default:
      return { detected_at: timestamp };
  }
}

function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    const body: GenerateRequest = await req.json().catch(() => ({}));
    const totalEvents = Math.min(body.total_events || 1000, 10000);
    const batchSize = Math.min(body.batch_size || 100, 500);
    const includeCorrelations = body.include_correlations ?? true;

    console.log(`Generating ${totalEvents} synthetic events in batches of ${batchSize}`);

    // Fetch available systems and models for realistic references
    const { data: systems } = await supabase.from("systems").select("id").limit(10);
    const { data: models } = await supabase.from("models").select("id").limit(10);
    
    const systemIds = systems?.map(s => s.id) || [];
    const modelIds = models?.map(m => m.id) || [];

    let generatedCount = 0;
    let errorCount = 0;
    const eventTypeCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};

    // Generate correlation groups (10% of events are correlated)
    const correlationGroups: string[] = [];
    if (includeCorrelations) {
      const numCorrelations = Math.floor(totalEvents * 0.1 / 3); // ~10% in groups of ~3
      for (let i = 0; i < numCorrelations; i++) {
        correlationGroups.push(generateCorrelationId());
      }
    }

    // Process in batches
    for (let offset = 0; offset < totalEvents; offset += batchSize) {
      const currentBatchSize = Math.min(batchSize, totalEvents - offset);
      const events: EventPayload[] = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const eventType = selectFromDistribution(EVENT_TYPE_DISTRIBUTION);
        const severity = selectFromDistribution(SEVERITY_DISTRIBUTION);
        
        // Track counts
        eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1;
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;

        // Randomly assign to system or model
        const event: EventPayload = {
          event_type: eventType,
          severity,
          payload: generatePayloadForType(eventType),
        };

        // 50% chance to have a source system
        if (systemIds.length > 0 && Math.random() > 0.5) {
          event.source_system_id = systemIds[Math.floor(Math.random() * systemIds.length)];
        }

        // 40% chance to have a source model
        if (modelIds.length > 0 && Math.random() > 0.6) {
          event.source_model_id = modelIds[Math.floor(Math.random() * modelIds.length)];
        }

        // 10% chance to be part of a correlation group
        if (correlationGroups.length > 0 && Math.random() > 0.9) {
          event.correlation_id = correlationGroups[Math.floor(Math.random() * correlationGroups.length)];
        }

        events.push(event);
      }

      // Insert batch
      const { error } = await supabase.from("events_raw").insert(events);

      if (error) {
        console.error(`Batch insert error at offset ${offset}:`, error);
        errorCount += currentBatchSize;
      } else {
        generatedCount += currentBatchSize;
      }

      // Small delay between batches to avoid overwhelming
      if (offset + batchSize < totalEvents) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Trigger event processing if we generated events
    if (generatedCount > 0) {
      const { error: processError } = await supabase.functions.invoke("process-events", {
        body: { batch_size: Math.min(generatedCount, 500) },
      });
      
      if (processError) {
        console.warn("Event processing trigger failed:", processError);
      }
    }

    console.log(`Generated ${generatedCount} events, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        total_generated: generatedCount,
        total_errors: errorCount,
        event_type_distribution: eventTypeCounts,
        severity_distribution: severityCounts,
        correlation_groups_created: correlationGroups.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate synthetic events error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate events" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
