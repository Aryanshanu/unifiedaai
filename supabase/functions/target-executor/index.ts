import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================================
// TYPES
// ============================================================================

interface ExecutionRequest {
  systemId: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

interface ExecutionResponse {
  success: boolean;
  response?: string;
  error?: string;
  errorCode?: string;
  metadata?: {
    provider: string;
    model: string;
    latency_ms: number;
  };
}

interface SystemConfig {
  id: string;
  name: string;
  provider: string;
  model_name: string | null;
  endpoint: string | null;
  api_token_encrypted: string | null;
  api_headers: Record<string, string> | null;
}

// ============================================================================
// PROVIDER EXECUTORS
// ============================================================================

async function executeOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number,
  baseUrl?: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  const url = baseUrl || 'https://api.openai.com/v1/chat/completions';
  
  console.log(`[target-executor][OpenAI] Calling ${url} with model ${model}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[target-executor][OpenAI] Error: ${response.status} - ${errorText.substring(0, 300)}`);
    return { success: false, error: `OpenAI API error (${response.status}): ${errorText.substring(0, 200)}` };
  }

  const result = await response.json();
  return { success: true, response: result.choices?.[0]?.message?.content || '' };
}

async function executeAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<{ success: boolean; response?: string; error?: string }> {
  // Convert to Anthropic format - extract system message
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  console.log(`[target-executor][Anthropic] Calling with model ${model}`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage?.content || '',
      messages: userMessages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[target-executor][Anthropic] Error: ${response.status} - ${errorText.substring(0, 300)}`);
    return { success: false, error: `Anthropic API error (${response.status}): ${errorText.substring(0, 200)}` };
  }

  const result = await response.json();
  const content = result.content?.[0]?.type === 'text' ? result.content[0].text : '';
  return { success: true, response: content };
}

async function executeAzure(
  apiKey: string,
  endpoint: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<{ success: boolean; response?: string; error?: string }> {
  // Azure OpenAI endpoint format: https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01
  const url = endpoint.includes('chat/completions') 
    ? endpoint 
    : `${endpoint}/openai/deployments/${model}/chat/completions?api-version=2024-02-01`;

  console.log(`[target-executor][Azure] Calling ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[target-executor][Azure] Error: ${response.status} - ${errorText.substring(0, 300)}`);
    return { success: false, error: `Azure OpenAI error (${response.status}): ${errorText.substring(0, 200)}` };
  }

  const result = await response.json();
  return { success: true, response: result.choices?.[0]?.message?.content || '' };
}

async function executeGoogle(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<{ success: boolean; response?: string; error?: string }> {
  const modelId = model || 'gemini-pro';
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;

  console.log(`[target-executor][Google] Calling with model ${modelId}`);

  // Convert to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[target-executor][Google] Error: ${response.status} - ${errorText.substring(0, 300)}`);
    return { success: false, error: `Google AI error (${response.status}): ${errorText.substring(0, 200)}` };
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { success: true, response: text };
}

async function executeHuggingFace(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<{ success: boolean; response?: string; error?: string }> {
  const url = `https://api-inference.huggingface.co/models/${model}`;
  
  console.log(`[target-executor][HuggingFace] Calling with model ${model}`);

  // HuggingFace inference API format varies by model
  // For chat models, use conversational format
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: messages.map(m => m.content).join('\n'),
      parameters: {
        max_new_tokens: maxTokens,
        temperature,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[target-executor][HuggingFace] Error: ${response.status} - ${errorText.substring(0, 300)}`);
    return { success: false, error: `HuggingFace API error (${response.status}): ${errorText.substring(0, 200)}` };
  }

  const result = await response.json();
  const text = Array.isArray(result) ? result[0]?.generated_text || '' : result.generated_text || '';
  return { success: true, response: text };
}

// ============================================================================
// OPENROUTER PROVIDER (NEW)
// ============================================================================

async function executeOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<{ success: boolean; response?: string; error?: string }> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  console.log(`[target-executor][OpenRouter] Calling with model ${model}`);

  // Add timeout for long-running requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fractal-rai.lovable.app',
        'X-Title': 'Fractal RAI-OS Security Testing',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[target-executor][OpenRouter] Error: ${response.status} - ${errorText.substring(0, 300)}`);
      return { success: false, error: `OpenRouter API error (${response.status}): ${errorText.substring(0, 200)}` };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    console.log(`[target-executor][OpenRouter] Success, response length: ${content.length}`);
    return { success: true, response: content };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`[target-executor][OpenRouter] Request timed out after 55s`);
      return { success: false, error: 'OpenRouter request timed out. The model may be slow or unavailable.' };
    }
    console.error(`[target-executor][OpenRouter] Network error:`, err);
    return { success: false, error: `OpenRouter network error: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

async function executeCustom(
  apiKey: string,
  endpoint: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number,
  customHeaders?: Record<string, string>
): Promise<{ success: boolean; response?: string; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  console.log(`[target-executor][Custom] Calling ${endpoint}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[target-executor][Custom] Error: ${response.status} - ${errorText.substring(0, 300)}`);
    return { success: false, error: `Custom endpoint error (${response.status}): ${errorText.substring(0, 200)}` };
  }

  const result = await response.json();
  // Try to extract content from common response formats
  const content = result.choices?.[0]?.message?.content 
    || result.response 
    || result.content 
    || result.text 
    || result.output 
    || JSON.stringify(result);
  return { success: true, response: content };
}

async function executeLovable(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): Promise<{ success: boolean; response?: string; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return { success: false, error: 'LOVABLE_API_KEY not configured' };
  }

  console.log(`[target-executor][Lovable] Using built-in fallback`);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[target-executor][Lovable] Error: ${response.status} - ${errorText.substring(0, 300)}`);
    return { success: false, error: `Lovable AI error (${response.status}): ${errorText.substring(0, 200)}` };
  }

  const result = await response.json();
  return { success: true, response: result.choices?.[0]?.message?.content || '' };
}

// ============================================================================
// HELPER: Detect provider from endpoint URL
// ============================================================================

function detectProviderFromEndpoint(endpoint: string | null, currentProvider: string): string {
  if (!endpoint) return currentProvider;
  
  const endpointLower = endpoint.toLowerCase();
  
  // Auto-detect OpenRouter
  if (endpointLower.includes('openrouter.ai')) {
    console.log('[target-executor] Auto-detected OpenRouter from endpoint URL');
    return 'openrouter';
  }
  
  // Auto-detect other providers
  if (endpointLower.includes('api.openai.com')) {
    return 'openai';
  }
  if (endpointLower.includes('api.anthropic.com')) {
    return 'anthropic';
  }
  if (endpointLower.includes('generativelanguage.googleapis.com')) {
    return 'google';
  }
  if (endpointLower.includes('huggingface.co')) {
    return 'huggingface';
  }
  if (endpointLower.includes('openai.azure.com')) {
    return 'azure';
  }
  
  return currentProvider;
}

// ============================================================================
// HELPER: Extract model from endpoint URL for OpenRouter
// ============================================================================

function extractModelFromOpenRouterUrl(endpoint: string, modelName: string | null): string {
  // If model_name looks like a valid OpenRouter model ID (contains /), use it
  if (modelName && modelName.trim() && modelName.includes('/')) {
    return modelName;
  }
  
  // model_name is missing or invalid (e.g. "Gemma" instead of "google/gemma-3n-e4b-it")
  // Try to extract model from URL path like https://openrouter.ai/google/gemma-3n-e4b-it
  const urlMatch = endpoint.match(/openrouter\.ai\/([^/]+\/[^/?\s]+)/);
  if (urlMatch) {
    const extractedModel = urlMatch[1];
    console.log(`[target-executor] model_name "${modelName}" is not a valid OpenRouter ID, extracted from URL: ${extractedModel}`);
    return extractedModel;
  }
  
  // Default fallback
  console.warn(`[target-executor] Could not resolve OpenRouter model from name="${modelName}" or endpoint="${endpoint}", using fallback`);
  return 'openai/gpt-4o-mini';
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const correlationId = `te-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    const { systemId, messages, maxTokens = 1000, temperature = 0.7 }: ExecutionRequest = await req.json();

    if (!systemId) {
      return new Response(
        JSON.stringify({ success: false, error: 'systemId is required', errorCode: 'MISSING_SYSTEM_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'messages array is required', errorCode: 'MISSING_MESSAGES' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch system config with credentials (server-side only)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: system, error: systemError } = await supabase
      .from('systems')
      .select('id, name, provider, model_name, endpoint, api_token_encrypted, api_headers')
      .eq('id', systemId)
      .single();

    if (systemError || !system) {
      console.error(`[target-executor] ${correlationId} System not found:`, systemId, systemError);
      return new Response(
        JSON.stringify({ success: false, error: 'System not found', errorCode: 'SYSTEM_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = system as SystemConfig;
    console.log(`[target-executor] ${correlationId} Executing against: ${config.name} (provider: ${config.provider}, endpoint: ${config.endpoint?.substring(0, 50)}...)`);

    let result: { success: boolean; response?: string; error?: string };
    let provider = config.provider?.toLowerCase() || 'lovable';
    const apiKey = config.api_token_encrypted || '';
    const endpoint = config.endpoint || '';
    const customHeaders = config.api_headers || {};

    // Auto-detect provider from endpoint URL (handles "Custom" with OpenRouter URLs)
    provider = detectProviderFromEndpoint(endpoint, provider);

    // For OpenRouter, extract model from URL if not set in model_name
    let model = config.model_name || '';
    if (provider === 'openrouter') {
      model = extractModelFromOpenRouterUrl(endpoint, config.model_name);
    }

    console.log(`[target-executor] ${correlationId} Final provider: ${provider}, model: ${model}`);

    // Route to appropriate provider
    switch (provider) {
      case 'openai':
        result = await executeOpenAI(apiKey, model || 'gpt-4o-mini', messages, maxTokens, temperature, endpoint || undefined);
        break;
      case 'anthropic':
        result = await executeAnthropic(apiKey, model || 'claude-3-haiku-20240307', messages, maxTokens, temperature);
        break;
      case 'azure':
        result = await executeAzure(apiKey, endpoint, model, messages, maxTokens, temperature);
        break;
      case 'google':
      case 'gemini':
        result = await executeGoogle(apiKey, model || 'gemini-pro', messages, maxTokens, temperature);
        break;
      case 'huggingface':
        result = await executeHuggingFace(apiKey, model, messages, maxTokens, temperature);
        break;
      case 'openrouter':
        // OpenRouter requires API key
        if (!apiKey) {
          result = { success: false, error: 'OpenRouter requires an API key. Please configure api_token_encrypted for this system.' };
        } else {
          result = await executeOpenRouter(apiKey, model, messages, maxTokens, temperature);
        }
        break;
      case 'custom':
        if (!endpoint) {
          result = { success: false, error: 'Custom provider requires an endpoint URL' };
        } else {
          result = await executeCustom(apiKey, endpoint, messages, maxTokens, temperature, customHeaders);
        }
        break;
      case 'lovable':
      default:
        // Fallback to Lovable AI for testing or when no custom endpoint configured
        if (!apiKey && !endpoint) {
          console.log(`[target-executor] ${correlationId} No API key configured, using Lovable AI fallback`);
          result = await executeLovable(messages, maxTokens);
        } else if (endpoint) {
          // Check if it looks like OpenRouter
          const detectedProvider = detectProviderFromEndpoint(endpoint, 'custom');
          if (detectedProvider === 'openrouter') {
            const detectedModel = extractModelFromOpenRouterUrl(endpoint, config.model_name);
            result = await executeOpenRouter(apiKey, detectedModel, messages, maxTokens, temperature);
          } else {
            result = await executeCustom(apiKey, endpoint, messages, maxTokens, temperature, customHeaders);
          }
        } else {
          result = await executeLovable(messages, maxTokens);
        }
        break;
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[target-executor] ${correlationId} Completed in ${latencyMs}ms, success: ${result.success}, responseLen: ${result.response?.length || 0}`);

    const response: ExecutionResponse = {
      success: result.success,
      response: result.response,
      error: result.error,
      errorCode: result.success ? undefined : 'PROVIDER_ERROR',
      metadata: {
        provider: provider,
        model: model || 'default',
        latency_ms: latencyMs,
      },
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[target-executor] ${correlationId} Fatal error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        errorCode: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
