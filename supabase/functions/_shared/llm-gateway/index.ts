// LLM Gateway - Unified interface for multiple AI providers
// Never expose provider APIs directly to frontend - always route through this gateway

import { 
  UnifiedRequest, 
  UnifiedResponse, 
  UnifiedError,
  LLMProvider,
  ProviderConfig,
  ProviderAdapter,
  LLMRequestLog
} from './types.ts';

import { LovableAdapter } from './adapters/lovable-adapter.ts';
import { OpenAIAdapter } from './adapters/openai-adapter.ts';
import { GeminiAdapter } from './adapters/gemini-adapter.ts';
import { HuggingFaceAdapter } from './adapters/huggingface-adapter.ts';
import { PerplexityAdapter } from './adapters/perplexity-adapter.ts';
import { OpenRouterAdapter } from './adapters/openrouter-adapter.ts';
import { AnthropicAdapter } from './adapters/anthropic-adapter.ts';

// Re-export types
export * from './types.ts';

// Adapter registry
const adapters = new Map<LLMProvider, ProviderAdapter>();
adapters.set('lovable', new LovableAdapter());
adapters.set('openai', new OpenAIAdapter());
adapters.set('gemini', new GeminiAdapter());
adapters.set('huggingface', new HuggingFaceAdapter());
adapters.set('perplexity', new PerplexityAdapter());
adapters.set('openrouter', new OpenRouterAdapter());
adapters.set('anthropic', new AnthropicAdapter());

/**
 * Get provider adapter by name
 */
export function getAdapter(provider: LLMProvider): ProviderAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`Unsupported provider: ${provider}. Supported: ${Array.from(adapters.keys()).join(', ')}`);
  }
  return adapter;
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): LLMProvider[] {
  return Array.from(adapters.keys());
}

/**
 * Get supported models for a provider
 */
export function getSupportedModels(provider: LLMProvider): string[] {
  const adapter = getAdapter(provider);
  return adapter.getSupportedModels();
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  const adapter = getAdapter(provider);
  return adapter.getDefaultModel();
}

/**
 * Main gateway function - routes request to appropriate provider
 */
export async function generateCompletion(
  request: UnifiedRequest,
  config: ProviderConfig
): Promise<UnifiedResponse> {
  const adapter = getAdapter(request.provider);
  
  console.log(`[LLM-Gateway] Routing request to ${request.provider} adapter`);
  
  // Validate config
  if (!adapter.validateConfig(config)) {
    throw {
      code: 'INVALID_API_KEY',
      provider: request.provider,
      message: `Invalid configuration for ${request.provider}`,
      retryable: false
    } as UnifiedError;
  }
  
  return adapter.generate(request, config);
}

/**
 * Generate with automatic fallback to secondary provider
 */
export async function generateWithFallback(
  request: UnifiedRequest,
  primaryConfig: ProviderConfig,
  fallbackProvider: LLMProvider,
  fallbackConfig: ProviderConfig
): Promise<UnifiedResponse> {
  try {
    return await generateCompletion(request, primaryConfig);
  } catch (error) {
    const unifiedError = error as UnifiedError;
    
    // Only fallback on retryable errors
    if (unifiedError.retryable) {
      console.log(`[LLM-Gateway] Primary provider ${request.provider} failed, falling back to ${fallbackProvider}`);
      
      const fallbackRequest: UnifiedRequest = {
        ...request,
        provider: fallbackProvider,
        model: getDefaultModel(fallbackProvider)
      };
      
      return generateCompletion(fallbackRequest, fallbackConfig);
    }
    
    throw error;
  }
}

/**
 * Format error for client response
 */
export function formatErrorResponse(error: UnifiedError): {
  error: {
    code: string;
    provider: string;
    message: string;
    retryable: boolean;
  }
} {
  return {
    error: {
      code: error.code,
      provider: error.provider,
      message: error.message,
      retryable: error.retryable
    }
  };
}

/**
 * Create a request log entry
 */
export function createRequestLog(
  response: UnifiedResponse | null,
  error: UnifiedError | null,
  userId?: string,
  systemId?: string
): LLMRequestLog {
  if (response) {
    return {
      request_id: response.id,
      timestamp: new Date().toISOString(),
      provider: response.provider,
      model: response.model,
      latency_ms: response.latency_ms,
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      status: 'success',
      user_id: userId,
      system_id: systemId
    };
  }
  
  return {
    request_id: `error-${Date.now()}`,
    timestamp: new Date().toISOString(),
    provider: error?.provider || 'lovable',
    model: 'unknown',
    latency_ms: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    status: 'error',
    error_code: error?.code,
    user_id: userId,
    system_id: systemId
  };
}

/**
 * Detect provider from endpoint URL
 */
export function detectProviderFromEndpoint(endpoint: string): LLMProvider | null {
  const url = endpoint.toLowerCase();
  
  if (url.includes('openai.com')) return 'openai';
  if (url.includes('anthropic.com')) return 'anthropic';
  if (url.includes('generativelanguage.googleapis.com')) return 'gemini';
  if (url.includes('huggingface.co') || url.includes('api-inference.huggingface.co')) return 'huggingface';
  if (url.includes('perplexity.ai')) return 'perplexity';
  if (url.includes('openrouter.ai')) return 'openrouter';
  if (url.includes('ai.gateway.lovable.dev')) return 'lovable';
  
  return null;
}

/**
 * Detect provider from API key prefix
 */
export function detectProviderFromApiKey(apiKey: string): LLMProvider | null {
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-or-')) return 'openrouter';
  if (apiKey.startsWith('hf_')) return 'huggingface';
  if (apiKey.startsWith('pplx-')) return 'perplexity';
  if (apiKey.startsWith('sk-') && apiKey.length >= 40) return 'openai';
  
  return null;
}
