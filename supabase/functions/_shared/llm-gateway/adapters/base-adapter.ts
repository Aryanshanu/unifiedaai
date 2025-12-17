// Base adapter with shared functionality
import { 
  UnifiedRequest, 
  UnifiedResponse, 
  UnifiedError, 
  ProviderAdapter, 
  ProviderConfig,
  LLMProvider,
  LLMErrorCode 
} from '../types.ts';

export abstract class BaseAdapter implements ProviderAdapter {
  abstract name: LLMProvider;
  abstract generate(request: UnifiedRequest, config: ProviderConfig): Promise<UnifiedResponse>;
  abstract getDefaultModel(): string;
  abstract getSupportedModels(): string[];

  validateConfig(config: ProviderConfig): boolean {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false;
    }
    return true;
  }

  protected generateRequestId(): string {
    return `llm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  protected normalizeError(
    error: unknown, 
    provider: LLMProvider,
    statusCode?: number
  ): UnifiedError {
    const message = error instanceof Error ? error.message : String(error);
    
    // Map common HTTP status codes to error codes
    let code: LLMErrorCode = 'UNKNOWN_ERROR';
    let retryable = false;

    if (statusCode) {
      switch (statusCode) {
        case 401:
        case 403:
          code = 'INVALID_API_KEY';
          retryable = false;
          break;
        case 404:
          code = 'MODEL_NOT_FOUND';
          retryable = false;
          break;
        case 429:
          code = 'RATE_LIMITED';
          retryable = true;
          break;
        case 400:
          code = 'INVALID_REQUEST';
          retryable = false;
          break;
        case 402:
          code = 'INSUFFICIENT_QUOTA';
          retryable = false;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          code = 'PROVIDER_ERROR';
          retryable = true;
          break;
      }
    }

    // Check message patterns for more specific errors
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      code = 'PROVIDER_TIMEOUT';
      retryable = true;
    } else if (lowerMessage.includes('content') && lowerMessage.includes('filter')) {
      code = 'CONTENT_FILTERED';
      retryable = false;
    } else if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      code = 'NETWORK_ERROR';
      retryable = true;
    }

    return {
      code,
      provider,
      message,
      status_code: statusCode,
      retryable,
      details: error
    };
  }

  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
