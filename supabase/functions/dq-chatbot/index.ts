import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  context: string;
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface ChatResponse {
  response: string;
  error?: string;
  error_code?: 'HF_AUTH_INVALID' | 'HF_FORBIDDEN_MODEL' | 'HF_MODEL_LOADING' | 'HF_RATE_LIMITED' | 'HF_UNKNOWN' | 'NO_API_KEY';
  warnings?: string[];
}

// Retry helper with exponential backoff
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries: number = 2,
  baseDelayMs: number = 800
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Retry on 503 (model loading)
      if (response.status === 503) {
        const text = await response.text();
        if (text.includes("loading") && attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          console.log(`[DQ-Chatbot] Model loading, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // Return original response if not loading or out of retries
        return new Response(text, { status: response.status, headers: response.headers });
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[DQ-Chatbot] Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  throw lastError || new Error("Request failed after retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, config } = await req.json() as ChatRequest;
    
    // Get API key - first try user-scoped key from database, then fall back to env
    let HF_API_KEY: string | undefined;
    let keySource = 'none';
    
    // Try to get user's API key from database
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } }
        });
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: keyRow } = await supabase
            .from("user_provider_keys")
            .select("api_key_encrypted")
            .eq("user_id", user.id)
            .eq("provider", "huggingface")
            .eq("is_active", true)
            .maybeSingle();
          
          if (keyRow?.api_key_encrypted) {
            HF_API_KEY = keyRow.api_key_encrypted;
            keySource = 'user_db';
            console.log("[DQ-Chatbot] Using user's HuggingFace key from database");
          }
        }
      } catch (dbError) {
        console.warn("[DQ-Chatbot] Could not fetch user key from DB:", dbError);
      }
    }
    
    // Fall back to environment secret
    if (!HF_API_KEY) {
      HF_API_KEY = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
      if (HF_API_KEY) {
        keySource = 'env';
        console.log("[DQ-Chatbot] Using HuggingFace key from environment");
      }
    }
    
    if (!HF_API_KEY) {
      console.error("[DQ-Chatbot] No HuggingFace API key available");
      const response: ChatResponse = { 
        response: "No HuggingFace API key configured. Please add your API key in Models → HuggingFace Settings, or contact your administrator to configure the system key.",
        error_code: 'NO_API_KEY'
      };
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get model from config or use default
    const model = config?.model || 'meta-llama/Llama-3.1-8B-Instruct';
    const temperature = config?.temperature ?? 0.7;
    const maxTokens = config?.maxTokens ?? 1024;

    // Build system prompt with context
    const systemPrompt = `You are an expert Data Quality Assistant for the Fractal RAI-OS platform. You help users understand and fix data quality issues.

CURRENT DATA QUALITY CONTEXT:
${context}

INSTRUCTIONS:
- Answer questions about data quality issues, profiling results, rules, and incidents
- Provide specific, actionable recommendations based on the context
- Reference specific columns, rules, and metrics when relevant
- Be concise but thorough
- If asked about fixes, provide step-by-step guidance
- Highlight critical issues that need immediate attention
- Explain technical concepts in accessible language

Respond in a helpful, professional manner. Focus on the specific data and issues in the context provided.`;

    // Format messages for HuggingFace
    const formattedPrompt = formatForLlama(systemPrompt, messages);

    console.log(`[DQ-Chatbot] Calling HuggingFace API with model=${model}, keySource=${keySource}`);

    // Call HuggingFace Inference API with Llama model (using router endpoint)
    const response = await fetchWithRetry(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: formattedPrompt,
          parameters: {
            max_new_tokens: maxTokens,
            temperature: temperature,
            return_full_text: false,
            do_sample: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[DQ-Chatbot] HuggingFace error:", response.status, errorText);
      
      let errorCode: ChatResponse['error_code'] = 'HF_UNKNOWN';
      let userMessage = "I encountered an error processing your request. Please try again.";
      
      if (response.status === 401) {
        errorCode = 'HF_AUTH_INVALID';
        userMessage = "Your HuggingFace API token is invalid or expired. Please update it in Models → HuggingFace Settings.";
      } else if (response.status === 403) {
        errorCode = 'HF_FORBIDDEN_MODEL';
        userMessage = `You don't have access to the model "${model}". Please select a different model in HuggingFace Settings or check your API token permissions.`;
      } else if (response.status === 429) {
        errorCode = 'HF_RATE_LIMITED';
        userMessage = "HuggingFace API rate limit reached. Please wait a moment and try again.";
      } else if (response.status === 503 && errorText.includes("loading")) {
        errorCode = 'HF_MODEL_LOADING';
        userMessage = "The AI model is warming up. Please try again in a few seconds.";
      }

      const chatResponse: ChatResponse = { 
        response: userMessage,
        error: `HuggingFace API error: ${response.status}`,
        error_code: errorCode
      };
      
      return new Response(
        JSON.stringify(chatResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract response text
    let responseText = "";
    if (Array.isArray(data)) {
      responseText = data[0]?.generated_text || "";
    } else if (typeof data === "object") {
      responseText = data.generated_text || data[0]?.generated_text || "";
    }

    // Clean up response
    responseText = responseText.trim();
    
    // Remove any input prompt that might be included
    if (responseText.includes("<|assistant|>")) {
      responseText = responseText.split("<|assistant|>").pop()?.trim() || responseText;
    }

    console.log("[DQ-Chatbot] Response generated successfully");

    const chatResponse: ChatResponse = { response: responseText };
    
    return new Response(
      JSON.stringify(chatResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[DQ-Chatbot] Error:", error);
    const chatResponse: ChatResponse = { 
      error: error instanceof Error ? error.message : "Unknown error",
      response: "I encountered an error processing your request. Please try again.",
      error_code: 'HF_UNKNOWN'
    };
    return new Response(
      JSON.stringify(chatResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatForLlama(systemPrompt: string, messages: Message[]): string {
  let formatted = `<|system|>\n${systemPrompt}</s>\n`;
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      formatted += `<|user|>\n${msg.content}</s>\n`;
    } else if (msg.role === 'assistant') {
      formatted += `<|assistant|>\n${msg.content}</s>\n`;
    }
  }
  
  formatted += '<|assistant|>\n';
  return formatted;
}
