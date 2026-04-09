// LLM Gateway Edge Function
// Single endpoint for AI generation: POST /llm-generate
// Simplified to use Claude directly via shared helper

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { validateSession, requireAuth, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";
import { validateLLMGenerateInput, validationErrorResponse } from "../_shared/input-validation.ts";
import { callClaude, claudeErrorResponse, CLAUDE_DEFAULT, CLAUDE_FAST, ClaudeError } from "../_shared/claude.ts";

// Rate limiting constants
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Database-backed rate limiting
async function checkRateLimitDB(
  userId: string,
  serviceClient: any
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  try {
    const { count, error } = await serviceClient
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', `user:${userId}`)
      .gte('window_start', windowStart);

    if (error) {
      console.error('[llm-generate] Rate limit check error:', error);
      return { allowed: true, remaining: RATE_LIMIT_REQUESTS };
    }

    const currentCount = count || 0;

    if (currentCount >= RATE_LIMIT_REQUESTS) {
      return { allowed: false, remaining: 0 };
    }

    // Insert new rate limit entry
    await serviceClient.from('rate_limits').insert({
      identifier: `user:${userId}`,
      window_start: new Date().toISOString(),
      window_ms: RATE_LIMIT_WINDOW_MS
    });

    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - currentCount - 1 };
  } catch (error) {
    console.error('[llm-generate] Rate limiting error:', error);
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use auth-helper for authentication
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);

    if (authError) {
      return authError;
    }

    const { user } = authResult;
    const serviceClient = getServiceClient();

    // Database-backed rate limiting
    const rateCheck = await checkRateLimitDB(user!.id, serviceClient);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: { code: "RATE_LIMITED", message: "Too many requests" },
          retry_after: 60
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "60"
          }
        }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const validation = validateLLMGenerateInput(body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!, corsHeaders);
    }

    const {
      messages,
      temperature = 0.7,
      max_tokens = 1024,
      system_id
    } = validation.data!;

    // Choose model: use CLAUDE_FAST for simple tasks, CLAUDE_DEFAULT for complex
    const model = CLAUDE_DEFAULT;

    console.log(`[LLM-Gateway] Claude request, model=${model}`);

    const start = Date.now();

    const claudeMessages = messages.map((m: any) => ({
      role: (m.role === "system" || m.role === "user" || m.role === "assistant")
        ? m.role as "system" | "user" | "assistant"
        : "user" as const,
      content: m.content,
    }));

    const content = await callClaude(claudeMessages, {
      model,
      maxTokens: max_tokens,
      temperature,
    });

    const latency_ms = Date.now() - start;

    const result = {
      provider: "anthropic",
      model,
      content,
      usage: null,
      latency_ms,
    };

    // Log request using service client
    try {
      await serviceClient.from("request_logs").insert({
        system_id: system_id || "00000000-0000-0000-0000-000000000000",
        user_id: user!.id,
        request_body: { provider: "anthropic", model, message_count: messages.length },
        response_body: { content_length: content?.length },
        latency_ms,
        status_code: 200,
        decision: "allow",
      });
    } catch (e) {
      console.error("Failed to log request:", e);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[LLM-Gateway] Error:", error);

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

    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: { code: "PROVIDER_ERROR", message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
