import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Real-time PII detection using pattern matching (Presidio-inspired)
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

// Toxicity keywords for real-time blocking
const TOXICITY_KEYWORDS = [
  "kill yourself", "harm myself", "suicide", "self-harm",
  "how to make a bomb", "synthesize drugs", "child exploitation",
  "hate speech", "racial slur", "violent threat"
];

interface TokenScanResult {
  hasPII: boolean;
  hasToxicity: boolean;
  piiTypes: string[];
  toxicityMatches: string[];
  score: number;
}

function scanTokenChunk(text: string): TokenScanResult {
  const piiTypes: string[] = [];
  const toxicityMatches: string[] = [];
  
  // Check PII patterns
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(text)) {
      piiTypes.push(type);
    }
  }
  
  // Check toxicity
  const lowerText = text.toLowerCase();
  for (const keyword of TOXICITY_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      toxicityMatches.push(keyword);
    }
  }
  
  const hasPII = piiTypes.length > 0;
  const hasToxicity = toxicityMatches.length > 0;
  const score = (hasPII ? 0.5 : 0) + (hasToxicity ? 0.5 : 0);
  
  return { hasPII, hasToxicity, piiTypes, toxicityMatches, score };
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
        
        // Pre-scan user input
        const inputScan = scanTokenChunk(userMessage);
        if (inputScan.score > 0.7) {
          socket.send(JSON.stringify({
            type: "response.blocked",
            reason: "Input blocked by safety policy",
            details: {
              pii: inputScan.piiTypes,
              toxicity: inputScan.toxicityMatches
            }
          }));
          
          // Log the blocked request
          await supabase.from("request_logs").insert({
            system_id: systemId,
            request_body: { messages },
            response_body: { blocked: true, reason: "input_blocked" },
            status_code: 451,
            latency_ms: Date.now() - startTime,
            decision: "BLOCK",
            engine_scores: { input_scan: inputScan }
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
                
                // REAL-TIME TOKEN SCANNING
                const tokenScan = scanTokenChunk(accumulatedText);
                
                if (tokenScan.score > 0.7 && blockedAtToken === null) {
                  blockedAtToken = tokenCount;
                  
                  socket.send(JSON.stringify({
                    type: "response.blocked",
                    blockedAtToken,
                    reason: "Output blocked by safety policy",
                    details: {
                      pii: tokenScan.piiTypes,
                      toxicity: tokenScan.toxicityMatches
                    }
                  }));
                  
                  // Create HITL review item for blocked response
                  await supabase.from("review_queue").insert({
                    title: `Token Stream Blocked at position ${blockedAtToken}`,
                    description: `Real-time safety block triggered. PII: ${tokenScan.piiTypes.join(", ")}. Toxicity: ${tokenScan.toxicityMatches.join(", ")}`,
                    review_type: "realtime_block",
                    severity: tokenScan.hasToxicity ? "critical" : "high",
                    status: "pending",
                    context: {
                      system_id: systemId,
                      blocked_at_token: blockedAtToken,
                      scan_result: tokenScan,
                      partial_text: accumulatedText.substring(0, 500)
                    },
                    sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
                  });
                  
                  // Create incident for critical blocks
                  if (tokenScan.hasToxicity) {
                    await supabase.from("incidents").insert({
                      title: `Real-time Toxicity Block at token ${blockedAtToken}`,
                      description: `Streaming response blocked due to detected harmful content: ${tokenScan.toxicityMatches.join(", ")}`,
                      incident_type: "realtime_toxicity",
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
                      partial_text: accumulatedText.substring(0, 200)
                    },
                    status_code: 451,
                    latency_ms: Date.now() - startTime,
                    decision: "BLOCK",
                    engine_scores: { 
                      realtime_scan: tokenScan,
                      blocked_at_token: blockedAtToken
                    }
                  });
                  
                  reader.cancel();
                  break;
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
              realtime_scan: scanTokenChunk(accumulatedText),
              total_tokens: tokenCount
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
