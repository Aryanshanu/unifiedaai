import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/auth-helper.ts";

/**
 * gateway-route: Unified LLM routing edge function
 * Routes requests to the appropriate provider adapter
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { provider = 'lovable', model, messages, temperature = 0.7, max_tokens = 1000, system_id } = body;

    // Provider → real endpoint mapping
    const PROVIDER_MAP: Record<string, { url: string; authHeader: string; envKey: string }> = {
      lovable:          { url: "https://ai.gateway.lovable.dev/v1/chat/completions",          authHeader: "Authorization", envKey: "LOVABLE_API_KEY" },
      internal_cluster: { url: "https://ai.gateway.lovable.dev/v1/chat/completions",          authHeader: "Authorization", envKey: "LOVABLE_API_KEY" },
      openai:           { url: "https://api.openai.com/v1/chat/completions",                  authHeader: "Authorization", envKey: "OPENAI_API_KEY" },
      anthropic:        { url: "https://api.anthropic.com/v1/messages",                       authHeader: "x-api-key",     envKey: "ANTHROPIC_API_KEY" },
      gemini:           { url: "https://generativelanguage.googleapis.com/v1beta/models",     authHeader: "Authorization", envKey: "GOOGLE_API_KEY" },
    };

    const config = PROVIDER_MAP[provider] || PROVIDER_MAP['lovable'];
    const apiKey = Deno.env.get(config.envKey) || Deno.env.get("LOVABLE_API_KEY") || "";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: { code: "NO_API_KEY", message: `No API key configured for provider: ${provider}` } }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const startTime = Date.now();
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [config.authHeader]: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: model || "gpt-4o-mini", messages, temperature, max_tokens }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: { code: "PROVIDER_ERROR", message: err } }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    const latency_ms = Date.now() - startTime;
    const content = data.choices?.[0]?.message?.content || data.content?.[0]?.text || "";

    return new Response(JSON.stringify({
      id: data.id || `gateway-${Date.now()}`,
      provider,
      model: data.model || model,
      content,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      latency_ms,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: String(error) } }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
