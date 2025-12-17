// LLM Gateway Client Hook
// Never call provider APIs directly - always use this gateway

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type LLMProvider = 
  | 'lovable'
  | 'openai'
  | 'gemini'
  | 'huggingface'
  | 'perplexity'
  | 'anthropic'
  | 'openrouter';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  provider?: LLMProvider;
  model?: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  system_id?: string;
}

export interface LLMResponse {
  id: string;
  provider: LLMProvider;
  model: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
}

export interface LLMError {
  code: string;
  provider?: string;
  message: string;
  retryable?: boolean;
}

interface UseLLMGatewayReturn {
  generate: (request: LLMRequest) => Promise<LLMResponse | null>;
  isLoading: boolean;
  error: LLMError | null;
  lastResponse: LLMResponse | null;
  clearError: () => void;
}

export function useLLMGateway(): UseLLMGatewayReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LLMError | null>(null);
  const [lastResponse, setLastResponse] = useState<LLMResponse | null>(null);
  const { toast } = useToast();

  const generate = useCallback(async (request: LLMRequest): Promise<LLMResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[LLM-Gateway-Client] Calling gateway', {
        provider: request.provider || 'lovable',
        model: request.model,
        messageCount: request.messages.length
      });

      const { data, error: invokeError } = await supabase.functions.invoke('llm-generate', {
        body: {
          provider: request.provider || 'lovable',
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          system_id: request.system_id
        }
      });

      if (invokeError) {
        console.error('[LLM-Gateway-Client] Invoke error:', invokeError);
        const err: LLMError = {
          code: 'NETWORK_ERROR',
          message: invokeError.message || 'Failed to connect to LLM gateway'
        };
        setError(err);
        toast({
          title: 'AI Request Failed',
          description: err.message,
          variant: 'destructive'
        });
        return null;
      }

      // Check for error response
      if (data?.error) {
        console.error('[LLM-Gateway-Client] Gateway error:', data.error);
        const err: LLMError = {
          code: data.error.code || 'UNKNOWN_ERROR',
          provider: data.error.provider,
          message: data.error.message || 'Unknown error',
          retryable: data.error.retryable
        };
        setError(err);

        // User-friendly error messages
        const errorMessages: Record<string, string> = {
          'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
          'INVALID_API_KEY': 'API key is invalid or not configured.',
          'INSUFFICIENT_QUOTA': 'API quota exceeded. Please check your billing.',
          'PROVIDER_TIMEOUT': 'Request timed out. Please try again.',
          'MODEL_NOT_FOUND': 'The specified model was not found.',
          'CONTENT_FILTERED': 'Content was filtered by safety systems.'
        };

        toast({
          title: 'AI Request Failed',
          description: errorMessages[err.code] || err.message,
          variant: 'destructive'
        });
        return null;
      }

      const response: LLMResponse = {
        id: data.id,
        provider: data.provider,
        model: data.model,
        content: data.content,
        usage: data.usage,
        latency_ms: data.latency_ms
      };

      console.log('[LLM-Gateway-Client] Success:', {
        provider: response.provider,
        model: response.model,
        tokens: response.usage.total_tokens,
        latency: response.latency_ms
      });

      setLastResponse(response);
      return response;

    } catch (err) {
      console.error('[LLM-Gateway-Client] Unexpected error:', err);
      const error: LLMError = {
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'An unexpected error occurred'
      };
      setError(error);
      toast({
        title: 'AI Request Failed',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generate,
    isLoading,
    error,
    lastResponse,
    clearError
  };
}

// Supported models by provider
export const SUPPORTED_MODELS: Record<LLMProvider, string[]> = {
  lovable: [
    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',
    'google/gemini-2.5-pro',
    'google/gemini-3-pro-preview',
    'openai/gpt-5',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano'
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ],
  gemini: [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ],
  huggingface: [
    'meta-llama/Llama-3.2-3B-Instruct',
    'mistralai/Mistral-7B-Instruct-v0.3',
    'microsoft/Phi-3-mini-4k-instruct'
  ],
  perplexity: [
    'sonar',
    'sonar-pro',
    'sonar-reasoning'
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229'
  ],
  openrouter: [
    'openai/gpt-4o',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-2.0-flash-001'
  ]
};

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  lovable: 'google/gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  huggingface: 'meta-llama/Llama-3.2-3B-Instruct',
  perplexity: 'sonar',
  anthropic: 'claude-3-5-sonnet-20241022',
  openrouter: 'openai/gpt-4o-mini'
};
