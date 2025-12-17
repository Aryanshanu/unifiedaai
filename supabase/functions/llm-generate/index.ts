// LLM Gateway Edge Function with Streaming Support
// Single endpoint for all AI providers: POST /llm-generate

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1 };
  }
  
  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - userLimit.count };
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  lovable: "https://ai.gateway.lovable.dev/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  perplexity: "https://api.perplexity.ai/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

const DEFAULT_MODELS: Record<string, string> = {
  lovable: "google/gemini-2.5-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  gemini: "gemini-1.5-flash",
  perplexity: "llama-3.1-sonar-small-128k-online",
  openrouter: "openai/gpt-4o-mini",
  huggingface: "mistralai/Mistral-7B-Instruct-v0.2",
};

async function getApiKey(
  provider: string,
  userId: string,
  systemId: string | null,
  supabase: any
): Promise<string | null> {
  // Check user's saved provider keys first
  const { data: userKey } = await supabase
    .from("user_provider_keys")
    .select("api_key_encrypted")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_active", true)
    .maybeSingle();

  if (userKey?.api_key_encrypted) {
    return userKey.api_key_encrypted;
  }

  // Check system config if system_id provided
  if (systemId) {
    const { data: system } = await supabase
      .from("systems")
      .select("api_token_encrypted, owner_id")
      .eq("id", systemId)
      .single();

    if (system?.api_token_encrypted && system.owner_id === userId) {
      return system.api_token_encrypted;
    }
  }

  // Fall back to environment variables
  const envKeyMap: Record<string, string> = {
    lovable: "LOVABLE_API_KEY",
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
    huggingface: "HUGGING_FACE_ACCESS_TOKEN",
    perplexity: "PERPLEXITY_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
  };

  const envKey = envKeyMap[provider];
  return envKey ? Deno.env.get(envKey) || null : null;
}

// OpenAI-compatible streaming
async function streamOpenAIFormat(
  endpoint: string,
  apiKey: string,
  body: any,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Provider error ${response.status}: ${errorText}`);
  }

  return new Response(response.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Anthropic streaming with conversion to OpenAI format
async function streamAnthropic(apiKey: string, body: any): Promise<Response> {
  const messages = body.messages.filter((m: any) => m.role !== "system");
  const systemMessage = body.messages.find((m: any) => m.role === "system");

  const anthropicBody: any = {
    model: body.model,
    max_tokens: body.max_tokens || 1024,
    messages: messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    stream: true,
  };

  if (systemMessage) {
    anthropicBody.system = systemMessage.content;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(anthropicBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${errorText}`);
  }

  // Transform Anthropic SSE to OpenAI format
  const reader = response.body?.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      if (!reader) {
        controller.close();
        return;
      }

      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                const openaiFormat = {
                  choices: [{
                    delta: { content: parsed.delta.text },
                    index: 0,
                  }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
              } else if (parsed.type === "message_stop") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Non-streaming generation
async function generateNonStreaming(
  provider: string,
  apiKey: string,
  body: any
): Promise<any> {
  const start = Date.now();

  if (provider === "anthropic") {
    const messages = body.messages.filter((m: any) => m.role !== "system");
    const systemMessage = body.messages.find((m: any) => m.role === "system");

    const anthropicBody: any = {
      model: body.model,
      max_tokens: body.max_tokens || 1024,
      messages: messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    };

    if (systemMessage) {
      anthropicBody.system = systemMessage.content;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      provider,
      model: body.model,
      content: data.content?.[0]?.text || "",
      usage: {
        prompt_tokens: data.usage?.input_tokens,
        completion_tokens: data.usage?.output_tokens,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      latency_ms: Date.now() - start,
    };
  }

  if (provider === "gemini") {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent?key=${apiKey}`;
    
    const geminiBody = {
      contents: body.messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: body.temperature,
        maxOutputTokens: body.max_tokens,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      provider,
      model: body.model,
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount,
        completion_tokens: data.usageMetadata?.candidatesTokenCount,
        total_tokens: data.usageMetadata?.totalTokenCount,
      },
      latency_ms: Date.now() - start,
    };
  }

  // OpenAI-compatible providers
  const endpoint = PROVIDER_ENDPOINTS[provider];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://fractal-rai.lovable.app";
    headers["X-Title"] = "Fractal RAI-OS";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider} error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return {
    provider,
    model: body.model,
    content: data.choices?.[0]?.message?.content || "",
    usage: data.usage,
    latency_ms: Date.now() - start,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Missing authorization" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: { code: "RATE_LIMITED", message: "Too many requests" } }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body = await req.json();
    const { 
      provider = "lovable", 
      model, 
      messages, 
      temperature = 0.7, 
      max_tokens = 1024, 
      stream = false,
      system_id 
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: { code: "INVALID_REQUEST", message: "messages array required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key
    const apiKey = await getApiKey(provider, user.id, system_id, supabase);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: { 
            code: "NO_API_KEY", 
            provider,
            message: `No API key for ${provider}. Configure it in Settings → LLM Providers.` 
          } 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestBody = {
      model: model || DEFAULT_MODELS[provider],
      messages,
      temperature,
      max_tokens,
    };

    console.log(`[LLM-Gateway] ${provider} request, stream=${stream}, model=${requestBody.model}`);

    // Handle streaming
    if (stream) {
      if (provider === "anthropic") {
        return await streamAnthropic(apiKey, requestBody);
      } else if (provider === "gemini") {
        // Gemini doesn't support SSE streaming the same way
        const result = await generateNonStreaming(provider, apiKey, requestBody);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const endpoint = PROVIDER_ENDPOINTS[provider];
        const extraHeaders: Record<string, string> = {};
        
        if (provider === "openrouter") {
          extraHeaders["HTTP-Referer"] = "https://fractal-rai.lovable.app";
          extraHeaders["X-Title"] = "Fractal RAI-OS";
        }
        
        return await streamOpenAIFormat(endpoint, apiKey, requestBody, extraHeaders);
      }
    }

    // Non-streaming
    const result = await generateNonStreaming(provider, apiKey, requestBody);

    // Log request
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey) {
      try {
        const adminClient = createClient(supabaseUrl, serviceKey);
        await adminClient.from("request_logs").insert({
          system_id: system_id || "00000000-0000-0000-0000-000000000000",
          user_id: user.id,
          request_body: { provider, model: requestBody.model, message_count: messages.length },
          response_body: { content_length: result.content?.length, usage: result.usage },
          latency_ms: result.latency_ms,
          status_code: 200,
          decision: "allow",
        });
      } catch (e) {
        console.error("Failed to log request:", e);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[LLM-Gateway] Error:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    let code = "PROVIDER_ERROR";
    let status = 500;

    if (message.includes("429")) {
      code = "RATE_LIMITED";
      status = 429;
    } else if (message.includes("401") || message.includes("403")) {
      code = "INVALID_API_KEY";
      status = 401;
    }

    return new Response(
      JSON.stringify({ error: { code, message } }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
