import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/auth-helper.ts";
import { callClaude, claudeErrorResponse, CLAUDE_DEFAULT, CLAUDE_FAST, ClaudeError } from "../_shared/claude.ts";

/**
 * gateway-route: Unified LLM routing edge function
 * Simplified to use Claude directly via the shared helper.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, temperature = 0.7, max_tokens = 1000, system_id } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: { code: "MISSING_MESSAGES", message: "messages array is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();

    const claudeMessages = messages.map((m: any) => ({
      role: (m.role === "system" || m.role === "user" || m.role === "assistant")
        ? m.role as "system" | "user" | "assistant"
        : "user" as const,
      content: m.content,
    }));

    const content = await callClaude(claudeMessages, {
      model: CLAUDE_DEFAULT,
      maxTokens: max_tokens,
      temperature,
    });

    const latency_ms = Date.now() - startTime;

    return new Response(JSON.stringify({
      id: `gateway-${Date.now()}`,
      provider: "anthropic",
      model: CLAUDE_DEFAULT,
      content,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      latency_ms,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    if (error instanceof ClaudeError) {
      const errResp = claudeErrorResponse(error);
      let status = 500;
      if (error.code === "RATE_LIMITED") status = 429;
      else if (error.code === "AUTH_ERROR" || error.code === "INVALID_KEY") status = 401;

      return new Response(
        JSON.stringify({ error: { code: errResp.error_code, message: errResp.error_message } }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: String(error) } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
