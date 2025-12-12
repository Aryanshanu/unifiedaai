// Endpoint and API Key validation utilities

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  normalizedEndpoint?: string;
  detectedProvider?: string;
}

// Provider-specific endpoint patterns
const ENDPOINT_PATTERNS = {
  openai: /^https:\/\/api\.openai\.com\//,
  anthropic: /^https:\/\/api\.anthropic\.com\//,
  huggingface_inference: /^https:\/\/api-inference\.huggingface\.co\/models\//,
  huggingface_page: /^https:\/\/huggingface\.co\/([^\/]+\/[^\/]+)/,
  openrouter: /^https:\/\/openrouter\.ai\/api\//,
  azure: /^https:\/\/[^\.]+\.openai\.azure\.com\//,
  google: /^https:\/\/generativelanguage\.googleapis\.com\//,
};

// API Key format patterns by provider
const API_KEY_PATTERNS: Record<string, { pattern: RegExp; description: string; minLength: number }> = {
  openai: {
    pattern: /^sk-[a-zA-Z0-9]{20,}$/,
    description: "OpenAI keys start with 'sk-' followed by alphanumeric characters",
    minLength: 40,
  },
  anthropic: {
    pattern: /^sk-ant-[a-zA-Z0-9-]{40,}$/,
    description: "Anthropic keys start with 'sk-ant-'",
    minLength: 50,
  },
  huggingface: {
    pattern: /^hf_[a-zA-Z0-9]{20,}$/,
    description: "HuggingFace tokens start with 'hf_'",
    minLength: 30,
  },
  openrouter: {
    pattern: /^sk-or-[a-zA-Z0-9-]{40,}$/,
    description: "OpenRouter keys start with 'sk-or-'",
    minLength: 50,
  },
  azure: {
    pattern: /^[a-f0-9]{32}$/i,
    description: "Azure keys are 32 character hexadecimal strings",
    minLength: 32,
  },
};

/**
 * Detect provider from endpoint URL
 */
export function detectProviderFromEndpoint(endpoint: string): string | null {
  if (!endpoint) return null;
  
  const normalized = endpoint.toLowerCase().trim();
  
  if (ENDPOINT_PATTERNS.openai.test(normalized)) return "OpenAI";
  if (ENDPOINT_PATTERNS.anthropic.test(normalized)) return "Anthropic";
  if (ENDPOINT_PATTERNS.huggingface_inference.test(endpoint)) return "Hugging Face";
  if (ENDPOINT_PATTERNS.huggingface_page.test(endpoint)) return "Hugging Face";
  if (ENDPOINT_PATTERNS.openrouter.test(normalized)) return "OpenRouter";
  if (ENDPOINT_PATTERNS.azure.test(endpoint)) return "Azure";
  if (ENDPOINT_PATTERNS.google.test(endpoint)) return "Google";
  
  return null;
}

/**
 * Validate and normalize endpoint URL
 */
export function validateEndpoint(endpoint: string, provider?: string): ValidationResult {
  if (!endpoint) {
    return { isValid: true }; // Empty is valid (optional field)
  }
  
  const trimmed = endpoint.trim();
  
  // Check if it's a valid URL
  try {
    new URL(trimmed);
  } catch {
    return {
      isValid: false,
      error: "Invalid URL format. Must start with https://",
    };
  }
  
  // Check for HTTPS
  if (!trimmed.startsWith("https://")) {
    return {
      isValid: false,
      error: "Endpoint must use HTTPS for security",
    };
  }
  
  // Check for common mistakes
  const hfPageMatch = trimmed.match(ENDPOINT_PATTERNS.huggingface_page);
  if (hfPageMatch) {
    const modelId = hfPageMatch[1];
    const correctedUrl = `https://api-inference.huggingface.co/models/${modelId}`;
    return {
      isValid: false,
      error: "This is a HuggingFace model page URL, not an API endpoint",
      warning: `Use the Inference API endpoint instead: ${correctedUrl}`,
      normalizedEndpoint: correctedUrl,
      detectedProvider: "Hugging Face",
    };
  }
  
  // Check OpenRouter format
  if (trimmed.includes("openrouter.ai") && !trimmed.includes("/api/v1/")) {
    return {
      isValid: false,
      error: "OpenRouter endpoints should use /api/v1/chat/completions",
      normalizedEndpoint: "https://openrouter.ai/api/v1/chat/completions",
      detectedProvider: "OpenRouter",
    };
  }
  
  // Detect provider from URL if not specified
  const detectedProvider = detectProviderFromEndpoint(trimmed);
  
  return {
    isValid: true,
    detectedProvider: detectedProvider || provider || undefined,
  };
}

/**
 * Validate API key format based on provider
 */
export function validateApiKey(apiKey: string, provider?: string): ValidationResult {
  if (!apiKey) {
    return { isValid: true }; // Empty is valid (optional field)
  }
  
  const trimmed = apiKey.trim();
  
  // Minimum length check
  if (trimmed.length < 20) {
    return {
      isValid: false,
      error: "API key appears too short. Most API keys are at least 30 characters.",
    };
  }
  
  // Provider-specific validation
  if (provider) {
    const providerKey = provider.toLowerCase().replace(/\s+/g, "");
    const pattern = API_KEY_PATTERNS[providerKey];
    
    if (pattern) {
      if (trimmed.length < pattern.minLength) {
        return {
          isValid: false,
          error: `${provider} keys should be at least ${pattern.minLength} characters`,
        };
      }
      
      if (!pattern.pattern.test(trimmed)) {
        return {
          isValid: false,
          error: pattern.description,
          warning: `Expected format for ${provider}: ${pattern.description}`,
        };
      }
    }
  } else {
    // Try to auto-detect provider from key format
    if (trimmed.startsWith("sk-ant-")) {
      return { isValid: true, detectedProvider: "Anthropic" };
    }
    if (trimmed.startsWith("sk-or-")) {
      return { isValid: true, detectedProvider: "OpenRouter" };
    }
    if (trimmed.startsWith("hf_")) {
      return { isValid: true, detectedProvider: "Hugging Face" };
    }
    if (trimmed.startsWith("sk-") && trimmed.length >= 40) {
      return { isValid: true, detectedProvider: "OpenAI" };
    }
  }
  
  return { isValid: true };
}

/**
 * Get helpful hint for endpoint format based on provider
 */
export function getEndpointHint(provider: string): string {
  const hints: Record<string, string> = {
    "OpenAI": "https://api.openai.com/v1/chat/completions",
    "Anthropic": "https://api.anthropic.com/v1/messages",
    "Hugging Face": "https://api-inference.huggingface.co/models/{model-id}",
    "OpenRouter": "https://openrouter.ai/api/v1/chat/completions",
    "Azure": "https://{resource}.openai.azure.com/openai/deployments/{deployment}/...",
    "Google": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
  };
  
  return hints[provider] || "https://api.example.com/v1/model";
}

/**
 * Get helpful hint for API key format based on provider
 */
export function getApiKeyHint(provider: string): string {
  const hints: Record<string, string> = {
    "OpenAI": "sk-...",
    "Anthropic": "sk-ant-...",
    "Hugging Face": "hf_...",
    "OpenRouter": "sk-or-...",
    "Azure": "32-character hex string",
    "Google": "AIza...",
  };
  
  return hints[provider] || "Your API key or token";
}
