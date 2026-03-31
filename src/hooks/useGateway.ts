// Gateway Client Hook
// Never call provider APIs directly - always use this gateway

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type GatewayProvider = 
  | 'internal_cluster'
  | 'external_node'
  | 'distributed_inference'
  | 'gateway_router'
  | 'enterprise_edge'
  | 'cloud_compute';

export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GatewayRequest {
  provider?: GatewayProvider;
  model?: string;
  messages: GatewayMessage[];
  temperature?: number;
  max_tokens?: number;
  system_id?: string;
}

export interface GatewayResponse {
  id: string;
  provider: GatewayProvider;
  model: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
}

export interface GatewayError {
  code: string;
  provider?: string;
  message: string;
  retryable?: boolean;
}

interface UseGatewayReturn {
  generate: (request: GatewayRequest) => Promise<GatewayResponse | null>;
  isLoading: boolean;
  error: GatewayError | null;
  lastResponse: GatewayResponse | null;
  clearError: () => void;
}

export function useGateway(): UseGatewayReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GatewayError | null>(null);
  const [lastResponse, setLastResponse] = useState<GatewayResponse | null>(null);
  const { toast } = useToast();

  const generate = useCallback(async (request: GatewayRequest): Promise<GatewayResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[Gateway-Client] Calling gateway', {
        provider: request.provider || 'internal_cluster',
        model: request.model,
        messageCount: request.messages.length
      });

      const { data, error: invokeError } = await supabase.functions.invoke('gateway-route', {
        body: {
          provider: request.provider || 'internal_cluster',
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          system_id: request.system_id
        }
      });

      if (invokeError) {
        console.error('[Gateway-Client] Invoke error:', invokeError);
        const err: GatewayError = {
          code: 'NETWORK_ERROR',
          message: invokeError.message || 'Failed to connect to gateway'
        };
        setError(err);
        toast({
          title: 'Request Failed',
          description: err.message,
          variant: 'destructive'
        });
        return null;
      }

      // Check for error response
      if (data?.error) {
        console.error('[Gateway-Client] Gateway error:', data.error);
        const err: GatewayError = {
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
          'MODEL_NOT_FOUND': 'The specified resource was not found.',
          'CONTENT_FILTERED': 'Content was filtered by safety systems.'
        };

        toast({
          title: 'Request Failed',
          description: errorMessages[err.code] || err.message,
          variant: 'destructive'
        });
        return null;
      }

      const response: GatewayResponse = {
        id: data.id,
        provider: data.provider,
        model: data.model,
        content: data.content,
        usage: data.usage,
        latency_ms: data.latency_ms
      };

      console.log('[Gateway-Client] Success:', {
        provider: response.provider,
        model: response.model,
        tokens: response.usage.total_tokens,
        latency: response.latency_ms
      });

      setLastResponse(response);
      return response;

    } catch (err) {
      console.error('[Gateway-Client] Unexpected error:', err);
      const error: GatewayError = {
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'An unexpected error occurred'
      };
      setError(error);
      toast({
        title: 'Request Failed',
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

// Supported instances by architecture
export const SUPPORTED_MODELS: Record<GatewayProvider, string[]> = {
  internal_cluster: [
    'cluster-core-v2',
    'cluster-fast-v1',
    'cluster-analytical-v3'
  ],
  external_node: [
    'external-compute-alpha',
    'external-compute-beta'
  ],
  distributed_inference: [
    'grid-node-1',
    'grid-node-2'
  ],
  gateway_router: [
    'router-core',
    'router-edge'
  ],
  enterprise_edge: [
    'edge-instance-a',
    'edge-instance-b'
  ],
  cloud_compute: [
    'cloud-analytical',
    'cloud-storage'
  ]
};

export const DEFAULT_MODELS: Record<GatewayProvider, string> = {
  internal_cluster: 'cluster-core-v2',
  external_node: 'external-compute-alpha',
  distributed_inference: 'grid-node-1',
  gateway_router: 'router-core',
  enterprise_edge: 'edge-instance-a',
  cloud_compute: 'cloud-analytical'
};
