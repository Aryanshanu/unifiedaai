import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LogDecisionRequest {
  modelId: string;
  modelVersion: string;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  decisionValue: string;
  confidence?: number;
  context?: Record<string, unknown>;
  decisionRef?: string;
}

/**
 * Computes SHA-256 hash of an object (for input/output hashing - no raw PII stored)
 */
async function hashObject(obj: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(obj));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a unique decision reference ID
 */
function generateDecisionRef(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `DEC-${timestamp}-${random}`.toUpperCase();
}

serve(async (req) => {
  console.log("=== LOG-DECISION CALLED ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: LogDecisionRequest = await req.json();
    const {
      modelId,
      modelVersion,
      inputData,
      outputData,
      decisionValue,
      confidence,
      context,
      decisionRef,
    } = body;

    // Validate required fields
    if (!modelId || !modelVersion || !inputData || !outputData || !decisionValue) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["modelId", "modelVersion", "inputData", "outputData", "decisionValue"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify model exists
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select("id, name, version")
      .eq("id", modelId)
      .single();

    if (modelError || !model) {
      return new Response(
        JSON.stringify({ error: "Model not found", modelId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash input/output for privacy (no raw PII stored)
    const inputHash = await hashObject(inputData);
    const outputHash = await hashObject(outputData);

    // Generate decision reference if not provided
    const finalDecisionRef = decisionRef || generateDecisionRef();

    // Insert decision into ledger (hash chain computed by trigger)
    const { data: decision, error: insertError } = await supabase
      .from("decision_ledger")
      .insert({
        decision_ref: finalDecisionRef,
        model_id: modelId,
        model_version: modelVersion,
        input_hash: inputHash,
        output_hash: outputHash,
        confidence: confidence ?? null,
        decision_value: decisionValue,
        decision_timestamp: new Date().toISOString(),
        context: context || {},
        // record_hash and previous_hash computed by trigger
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert decision:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to log decision",
          details: insertError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const latencyMs = Date.now() - startTime;
    console.log(`Decision logged: ${finalDecisionRef} in ${latencyMs}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        decisionId: decision.id,
        decisionRef: finalDecisionRef,
        recordHash: decision.record_hash,
        previousHash: decision.previous_hash,
        inputHash,
        outputHash,
        latencyMs,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("log-decision error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
