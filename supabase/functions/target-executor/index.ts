 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
     return { success: false, error: `HuggingFace API error (${response.status}): ${errorText.substring(0, 200)}` };
   }
 
   const result = await response.json();
   const text = Array.isArray(result) ? result[0]?.generated_text || '' : result.generated_text || '';
   return { success: true, response: text };
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
     return { success: false, error: `Lovable AI error (${response.status}): ${errorText.substring(0, 200)}` };
   }
 
   const result = await response.json();
   return { success: true, response: result.choices?.[0]?.message?.content || '' };
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
     console.log(`[target-executor] ${correlationId} Executing against: ${config.name} (${config.provider})`);
 
     let result: { success: boolean; response?: string; error?: string };
     const provider = config.provider?.toLowerCase() || 'lovable';
     const model = config.model_name || '';
     const apiKey = config.api_token_encrypted || '';
     const endpoint = config.endpoint || '';
     const customHeaders = config.api_headers || {};
 
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
           result = await executeCustom(apiKey, endpoint, messages, maxTokens, temperature, customHeaders);
         } else {
           result = await executeLovable(messages, maxTokens);
         }
         break;
     }
 
     const latencyMs = Date.now() - startTime;
     console.log(`[target-executor] ${correlationId} Completed in ${latencyMs}ms, success: ${result.success}`);
 
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