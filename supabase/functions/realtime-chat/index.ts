import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HuggingFace Models for real-time scanning
const HF_TOXICITY_MODEL = "ml6team/toxic-comment-classification";
const HF_PRIVACY_MODEL = "obi/deid_roberta_i2b2";

interface TokenScanResult {
  hasPII: boolean;
  hasToxicity: boolean;
  piiEntities: string[];
  toxicityScore: number;
  privacyScore: number;
  modelsUsed: string[];
  latencyMs: number;
}

// Call HuggingFace toxicity model
async function callToxicityModel(text: string, hfToken: string): Promise<{ score: number; raw: any }> {
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_TOXICITY_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      console.warn(`[realtime-chat] Toxicity model returned ${response.status}`);
      return { score: 0, raw: null };
    }

    const output = await response.json();
    
    // Parse ml6team output format
    let maxScore = 0;
    if (Array.isArray(output)) {
      const labels = Array.isArray(output[0]) ? output[0] : output;
      for (const item of labels) {
        if (item.label?.toLowerCase().includes("toxic") && item.score > maxScore) {
          maxScore = item.score;
        }
      }
    }

    return { score: maxScore, raw: output };
  } catch (error) {
    console.error("[realtime-chat] Toxicity model error:", error);
    return { score: 0, raw: null };
  }
}

// Call HuggingFace PII model
async function callPrivacyModel(text: string, hfToken: string): Promise<{ entities: string[]; raw: any }> {
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_PRIVACY_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      console.warn(`[realtime-chat] Privacy model returned ${response.status}`);
      return { entities: [], raw: null };
    }

    const output = await response.json();
    
    // Parse NER output
    const entities: string[] = [];
    if (Array.isArray(output)) {
      for (const entity of output) {
        if (entity.score >= 0.5 && entity.entity_group) {
          entities.push(entity.entity_group);
        }
      }
    }

    return { entities: [...new Set(entities)], raw: output };
  } catch (error) {
    console.error("[realtime-chat] Privacy model error:", error);
    return { entities: [], raw: null };
  }
}

// Parallel HuggingFace model scanning
async function scanWithHFModels(text: string, hfToken: string | null): Promise<TokenScanResult> {
  const startTime = Date.now();
  const modelsUsed: string[] = [];

  // If no HF token, fall back to basic regex
  if (!hfToken) {
    console.log("[realtime-chat] No HF token, using fallback regex scanning");
    return fallbackRegexScan(text);
  }

  // Parallel model calls
  const [toxicityResult, privacyResult] = await Promise.all([
    callToxicityModel(text, hfToken),
    callPrivacyModel(text, hfToken),
  ]);

  if (toxicityResult.raw) modelsUsed.push(HF_TOXICITY_MODEL);
  if (privacyResult.raw) modelsUsed.push(HF_PRIVACY_MODEL);

  const hasToxicity = toxicityResult.score >= 0.5;
  const hasPII = privacyResult.entities.length > 0;

  return {
    hasPII,
    hasToxicity,
    piiEntities: privacyResult.entities,
    toxicityScore: toxicityResult.score,
    privacyScore: hasPII ? 0.8 : 0,
    modelsUsed,
    latencyMs: Date.now() - startTime,
  };
}

// Fallback regex-based scanning (when HF token unavailable)
function fallbackRegexScan(text: string): TokenScanResult {
  const PII_PATTERNS = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    creditCard: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
  };

  const TOXICITY_KEYWORDS = [
    "kill yourself", "harm myself", "suicide", "self-harm",
    "how to make a bomb", "synthesize drugs",
  ];

  const piiEntities: string[] = [];
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(text)) piiEntities.push(type);
  }

  let toxicityScore = 0;
  const lowerText = text.toLowerCase();
  for (const keyword of TOXICITY_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      toxicityScore = 0.9;
      break;
    }
  }

  return {
    hasPII: piiEntities.length > 0,
    hasToxicity: toxicityScore >= 0.5,
    piiEntities,
    toxicityScore,
    privacyScore: piiEntities.length > 0 ? 0.8 : 0,
    modelsUsed: ["regex-fallback"],
    latencyMs: 1,
  };
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if this is a WebSocket upgrade request
  if (upgradeHeader.toLowerCase() !== "websocket") {
    // Handle as regular HTTP request for testing
    return new Response(
      JSON.stringify({ 
        error: "Expected WebSocket connection. Use ws:// protocol.",
        usage: "Connect via WebSocket with { systemId, messages } payload"
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let systemId: string | null = null;
  let tokenCount = 0;
  let blockedAtToken: number | null = null;
  let accumulatedText = "";
  let startTime = Date.now();

  socket.onopen = () => {
    console.log("WebSocket connection opened");
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === "session.init") {
        systemId = data.systemId;
        tokenCount = 0;
        blockedAtToken = null;
        accumulatedText = "";
        startTime = Date.now();
        
        // Fetch system configuration
        const { data: system, error } = await supabase
          .from("systems")
          .select("*, projects(*)")
          .eq("id", systemId)
          .single();
          
        if (error || !system) {
          socket.send(JSON.stringify({ 
            type: "error", 
            message: "System not found" 
          }));
          return;
        }
        
        socket.send(JSON.stringify({ 
          type: "session.created",
          systemId,
          systemName: system.name
        }));
        
        return;
      }
      
      if (data.type === "message.send") {
        const messages = data.messages || [];
        const userMessage = messages.find((m: any) => m.role === "user")?.content || "";
        const hfToken = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN") || null;
        
        // Pre-scan user input with HuggingFace models
        console.log(`[realtime-chat] Scanning input with HF models...`);
        const inputScan = await scanWithHFModels(userMessage, hfToken);
        
        if (inputScan.hasToxicity || inputScan.hasPII) {
          socket.send(JSON.stringify({
            type: "response.blocked",
            reason: "Input blocked by HuggingFace safety models",
            details: {
              pii: inputScan.piiEntities,
              toxicity_score: inputScan.toxicityScore,
              models_used: inputScan.modelsUsed,
              scan_latency_ms: inputScan.latencyMs,
            }
          }));
          
          // Log the blocked request
          await supabase.from("request_logs").insert({
            system_id: systemId,
            request_body: { messages },
            response_body: { blocked: true, reason: "input_blocked_by_hf" },
            status_code: 451,
            latency_ms: Date.now() - startTime,
            decision: "BLOCK",
            engine_scores: { 
              input_scan: inputScan,
              models_used: inputScan.modelsUsed,
            }
          });
          
          return;
        }
        
        // Stream from AI gateway
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          socket.send(JSON.stringify({ 
            type: "error", 
            message: "AI API key not configured" 
          }));
          return;
        }
        
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: data.model || "google/gemini-2.5-flash",
            messages,
            stream: true,
          }),
        });
        
        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          socket.send(JSON.stringify({ 
            type: "error", 
            message: `AI Gateway error: ${aiResponse.status}`,
            details: errorText
          }));
          return;
        }
        
        const reader = aiResponse.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        
        socket.send(JSON.stringify({ type: "response.started" }));
        
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
            
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                tokenCount++;
                accumulatedText += content;
                
                // REAL-TIME TOKEN SCANNING with HuggingFace (every 50 tokens for efficiency)
                if (tokenCount % 50 === 0 && blockedAtToken === null) {
                  const tokenScan = await scanWithHFModels(accumulatedText, hfToken);
                  
                  if ((tokenScan.hasToxicity || tokenScan.hasPII) && blockedAtToken === null) {
                    blockedAtToken = tokenCount;
                    
                    socket.send(JSON.stringify({
                      type: "response.blocked",
                      blockedAtToken,
                      reason: "Output blocked by HuggingFace safety models",
                      details: {
                        pii: tokenScan.piiEntities,
                        toxicity_score: tokenScan.toxicityScore,
                        models_used: tokenScan.modelsUsed,
                        scan_latency_ms: tokenScan.latencyMs,
                      }
                    }));
                    
                    // Create HITL review item for blocked response
                    await supabase.from("review_queue").insert({
                      title: `Token Stream Blocked at position ${blockedAtToken}`,
                      description: `Real-time HuggingFace safety block. Models: ${tokenScan.modelsUsed.join(", ")}. PII: ${tokenScan.piiEntities.join(", ")}. Toxicity: ${Math.round(tokenScan.toxicityScore * 100)}%`,
                      review_type: "realtime_block_hf",
                      severity: tokenScan.hasToxicity ? "critical" : "high",
                      status: "pending",
                      context: {
                        system_id: systemId,
                        blocked_at_token: blockedAtToken,
                        scan_result: tokenScan,
                        partial_text: accumulatedText.substring(0, 500),
                        models_used: tokenScan.modelsUsed,
                      },
                      sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
                    });
                    
                    // Create incident for critical blocks
                    if (tokenScan.hasToxicity) {
                      await supabase.from("incidents").insert({
                        title: `Real-time HF Toxicity Block at token ${blockedAtToken}`,
                        description: `Streaming response blocked by ${HF_TOXICITY_MODEL}. Toxicity score: ${Math.round(tokenScan.toxicityScore * 100)}%`,
                        incident_type: "realtime_toxicity_hf",
                        severity: "critical",
                        status: "open"
                      });
                    }
                    
                    // Log blocked request
                    await supabase.from("request_logs").insert({
                      system_id: systemId,
                      request_body: { messages },
                      response_body: { 
                        blocked: true, 
                        blocked_at_token: blockedAtToken,
                        partial_text: accumulatedText.substring(0, 200),
                        models_used: tokenScan.modelsUsed,
                      },
                      status_code: 451,
                      latency_ms: Date.now() - startTime,
                      decision: "BLOCK",
                      engine_scores: { 
                        realtime_scan: tokenScan,
                        blocked_at_token: blockedAtToken,
                        models_used: tokenScan.modelsUsed,
                      }
                    });
                    
                    reader.cancel();
                    break;
                  }
                }
                
                // Send token to client
                socket.send(JSON.stringify({
                  type: "response.delta",
                  token: content,
                  tokenIndex: tokenCount
                }));
              }
            } catch {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
        
        if (blockedAtToken === null) {
          // Response completed successfully
          socket.send(JSON.stringify({ 
            type: "response.done",
            totalTokens: tokenCount
          }));
          
          // Log successful request
          await supabase.from("request_logs").insert({
            system_id: systemId,
            request_body: { messages },
            response_body: { 
              message: accumulatedText.substring(0, 500),
              total_tokens: tokenCount
            },
            status_code: 200,
            latency_ms: Date.now() - startTime,
            decision: "ALLOW",
            engine_scores: { 
              total_tokens: tokenCount,
              models_available: hfToken ? [HF_TOXICITY_MODEL, HF_PRIVACY_MODEL] : ["regex-fallback"],
            }
          });
        }
      }
      
    } catch (error) {
      console.error("WebSocket message error:", error);
      socket.send(JSON.stringify({ 
        type: "error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }));
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return response;
});
