// Unified LLM Gateway Types
// All providers normalize to these interfaces

export interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface UnifiedRequest {
  provider: LLMProvider;
  model: string;
  messages: UnifiedMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface UnifiedResponse {
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
  raw_response?: unknown;
}

export interface UnifiedError {
  code: LLMErrorCode;
  provider: LLMProvider;
  message: string;
  status_code?: number;
  retryable: boolean;
  details?: unknown;
}

export type LLMProvider = 
  | 'lovable'      // Lovable AI Gateway (default)
  | 'openai'       // OpenAI ChatGPT
  | 'gemini'       // Google Gemini
  | 'huggingface'  // HuggingFace Inference
  | 'perplexity'   // Perplexity AI
  | 'anthropic'    // Anthropic Claude
  | 'openrouter';  // OpenRouter

export type LLMErrorCode =
  | 'PROVIDER_TIMEOUT'
  | 'RATE_LIMITED'
  | 'INVALID_API_KEY'
  | 'MODEL_NOT_FOUND'
  | 'CONTENT_FILTERED'
  | 'INSUFFICIENT_QUOTA'
  | 'PROVIDER_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_REQUEST'
  | 'UNKNOWN_ERROR';

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ProviderAdapter {
  name: LLMProvider;
  generate(request: UnifiedRequest, config: ProviderConfig): Promise<UnifiedResponse>;
  validateConfig(config: ProviderConfig): boolean;
  getDefaultModel(): string;
  getSupportedModels(): string[];
}

// Rate limit configuration
export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute?: number;
  burstLimit?: number;
}

// Logging structure
export interface LLMRequestLog {
  request_id: string;
  timestamp: string;
  provider: LLMProvider;
  model: string;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  status: 'success' | 'error';
  error_code?: LLMErrorCode;
  user_id?: string;
  system_id?: string;
}
