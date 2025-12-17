// LLM Gateway Edge Function
// Single endpoint for all AI providers: POST /llm-generate
// Never expose provider APIs directly - all requests route through this gateway

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  generateCompletion,
  formatErrorResponse,
  createRequestLog,
  detectProviderFromApiKey,
  getDefaultModel,
  getSupportedProviders,
  UnifiedRequest,
  UnifiedError,
  LLMProvider,
  ProviderConfig
} from "../_shared/llm-gateway/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: in-memory store (use Redis in production)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: userLimit.resetAt - now };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - userLimit.count, resetIn: userLimit.resetAt - now };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `llm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  console.log(`[LLM-Gateway] Request ${requestId}: Started`);

  try {
    // ========== AUTHENTICATION ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log(`[LLM-Gateway] Request ${requestId}: Missing authorization`);
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log(`[LLM-Gateway] Request ${requestId}: Auth failed - ${authError?.message}`);
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[LLM-Gateway] Request ${requestId}: User ${user.id} authenticated`);

    // ========== RATE LIMITING ==========
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      console.log(`[LLM-Gateway] Request ${requestId}: Rate limited user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: { 
            code: 'RATE_LIMITED', 
            message: 'Too many requests. Please try again later.',
            reset_in_ms: rateCheck.resetIn 
          } 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000))
          } 
        }
      );
    }

    // ========== PARSE REQUEST ==========
    const body = await req.json();
    const { 
      provider = 'lovable',
      model,
      messages,
      temperature,
      max_tokens,
      stream = false,
      system_id // Optional: for logging/attribution
    } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log(`[LLM-Gateway] Request ${requestId}: Invalid messages`);
      return new Response(
        JSON.stringify({ error: { code: 'INVALID_REQUEST', message: 'messages array is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate provider
    const supportedProviders = getSupportedProviders();
    if (!supportedProviders.includes(provider as LLMProvider)) {
      console.log(`[LLM-Gateway] Request ${requestId}: Unsupported provider ${provider}`);
      return new Response(
        JSON.stringify({ 
          error: { 
            code: 'INVALID_REQUEST', 
            message: `Unsupported provider: ${provider}. Supported: ${supportedProviders.join(', ')}` 
          } 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[LLM-Gateway] Request ${requestId}: provider=${provider}, model=${model || 'default'}, messages=${messages.length}`);

    // ========== GET API KEY ==========
    let apiKey: string;
    
    if (provider === 'lovable') {
      // Lovable AI uses built-in key
      apiKey = Deno.env.get('LOVABLE_API_KEY') || '';
      if (!apiKey) {
        console.error(`[LLM-Gateway] Request ${requestId}: LOVABLE_API_KEY not configured`);
        return new Response(
          JSON.stringify({ error: { code: 'PROVIDER_ERROR', message: 'Lovable AI not configured' } }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // For other providers, get key from system config or user settings
      const providerKeyMap: Record<string, string> = {
        'openai': 'OPENAI_API_KEY',
        'gemini': 'GEMINI_API_KEY',
        'anthropic': 'ANTHROPIC_API_KEY',
        'huggingface': 'HUGGINGFACE_API_KEY',
        'perplexity': 'PERPLEXITY_API_KEY',
        'openrouter': 'OPENROUTER_API_KEY'
      };
      
      const envKey = providerKeyMap[provider];
      apiKey = envKey ? (Deno.env.get(envKey) || '') : '';
      
      // If system_id provided, try to get API key from system config
      if (!apiKey && system_id) {
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const adminClient = createClient(supabaseUrl, serviceKey);
        
        // Check if user has access to this system
        const { data: system } = await adminClient
          .from('systems')
          .select('id, owner_id, api_token_encrypted, endpoint')
          .eq('id', system_id)
          .single();
        
        if (system) {
          // Verify authorization
          if (system.owner_id !== user.id) {
            const { data: roles } = await adminClient
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id);
            
            const hasAccess = roles?.some(r => ['admin', 'analyst'].includes(r.role));
            if (!hasAccess) {
              console.log(`[LLM-Gateway] Request ${requestId}: Unauthorized access to system ${system_id}`);
              return new Response(
                JSON.stringify({ error: { code: 'FORBIDDEN', message: 'You do not have access to this system' } }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
          
          apiKey = system.api_token_encrypted || '';
        }
      }
      
      if (!apiKey) {
        console.log(`[LLM-Gateway] Request ${requestId}: No API key for ${provider}`);
        return new Response(
          JSON.stringify({ 
            error: { 
              code: 'INVALID_API_KEY', 
              message: `API key not configured for ${provider}. Configure it in system settings or use 'lovable' provider.` 
            } 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========== BUILD REQUEST ==========
    const unifiedRequest: UnifiedRequest = {
      provider: provider as LLMProvider,
      model: model || getDefaultModel(provider as LLMProvider),
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
      })),
      temperature,
      max_tokens,
      stream
    };

    const config: ProviderConfig = {
      apiKey,
      timeout: 60000
    };

    // ========== CALL PROVIDER ==========
    console.log(`[LLM-Gateway] Request ${requestId}: Calling ${provider} with model ${unifiedRequest.model}`);
    
    const response = await generateCompletion(unifiedRequest, config);

    console.log(`[LLM-Gateway] Request ${requestId}: Success - latency=${response.latency_ms}ms, tokens=${response.usage.total_tokens}`);

    // ========== LOG REQUEST ==========
    try {
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(supabaseUrl, serviceKey);
      
      const { error: logError } = await adminClient.from('request_logs').insert({
        user_id: user.id,
        system_id: system_id || null,
        decision: 'ALLOW',
        status_code: 200,
        latency_ms: response.latency_ms,
        request_body: { 
          provider, 
          model: unifiedRequest.model, 
          message_count: messages.length 
        },
        response_body: { 
          tokens: response.usage,
          content_length: response.content.length 
        },
        engine_scores: null
      });
      
      if (logError) {
        console.error(`[LLM-Gateway] Request ${requestId}: Failed to log request - ${logError.message}`);
      }
    } catch (logErr) {
      console.error(`[LLM-Gateway] Request ${requestId}: Failed to log request - ${logErr}`);
    }

    // ========== RETURN RESPONSE ==========
    return new Response(
      JSON.stringify({
        id: response.id,
        provider: response.provider,
        model: response.model,
        content: response.content,
        usage: response.usage,
        latency_ms: response.latency_ms
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateCheck.remaining),
          'X-Request-Id': requestId
        } 
      }
    );

  } catch (error) {
    const unifiedError = error as UnifiedError;
    
    // Check if it's a structured error from the gateway
    if (unifiedError.code) {
      console.error(`[LLM-Gateway] Request ${requestId}: Provider error - ${unifiedError.code}: ${unifiedError.message}`);
      
      const statusMap: Record<string, number> = {
        'PROVIDER_TIMEOUT': 504,
        'RATE_LIMITED': 429,
        'INVALID_API_KEY': 401,
        'MODEL_NOT_FOUND': 404,
        'CONTENT_FILTERED': 400,
        'INSUFFICIENT_QUOTA': 402,
        'PROVIDER_ERROR': 502,
        'NETWORK_ERROR': 503,
        'INVALID_REQUEST': 400,
        'UNKNOWN_ERROR': 500
      };
      
      return new Response(
        JSON.stringify(formatErrorResponse(unifiedError)),
        { 
          status: statusMap[unifiedError.code] || 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generic error
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[LLM-Gateway] Request ${requestId}: Unexpected error - ${message}`);
    
    return new Response(
      JSON.stringify({ error: { code: 'UNKNOWN_ERROR', message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
