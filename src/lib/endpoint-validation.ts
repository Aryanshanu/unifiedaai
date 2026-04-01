// Endpoint and Validation utilities

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  normalizedEndpoint?: string;
  detectedProvider?: string;
}

// Infrastructure-specific endpoint patterns
const ENDPOINT_PATTERNS = {
  lovable: /^https:\/\/ai\.gateway\.lovable\.dev\//,
  external_node: /^https:\/\/external\.node\.net\//,
  distributed_inference: /^https:\/\/inference\.grid\.local\//,
  gateway_router: /^https:\/\/gateway\.router\.net\//,
  enterprise_edge: /^https:\/\/[^.]+\.edge\.enterprise\.local\//,
  cloud_compute: /^https:\/\/compute\.cloud\.local\//,
};

// API Key format patterns by cluster
const API_KEY_PATTERNS: Record<string, { pattern: RegExp; description: string; minLength: number }> = {
  lovable: {
    pattern: /^key-int-[a-zA-Z0-9]{20,}$/,
    description: "Internal keys start with 'key-int-' followed by alphanumeric characters",
    minLength: 28,
  },
  external_node: {
    pattern: /^key-ext-[a-zA-Z0-9-]{40,}$/,
    description: "External keys start with 'key-ext-'",
    minLength: 48,
  },
  distributed_inference: {
    pattern: /^grid_[a-zA-Z0-9]{20,}$/,
    description: "Grid tokens start with 'grid_'",
    minLength: 25,
  },
  gateway_router: {
    pattern: /^gw-rt-[a-zA-Z0-9-]{40,}$/,
    description: "Router keys start with 'gw-rt-'",
    minLength: 46,
  },
  enterprise_edge: {
    pattern: /^[a-f0-9]{32}$/i,
    description: "Edge keys are 32 character hexadecimal strings",
    minLength: 32,
  },
};

/**
 * Detect architecture from endpoint URL
 */
export function detectProviderFromEndpoint(endpoint: string): string | null {
  if (!endpoint) return null;
  
  const normalized = endpoint.toLowerCase().trim();
  
  if (ENDPOINT_PATTERNS.lovable?.test(normalized)) return "Lovable";
  if (ENDPOINT_PATTERNS.external_node.test(normalized)) return "OpenRouter";
  if (ENDPOINT_PATTERNS.distributed_inference.test(endpoint)) return "HuggingFace";
  if (ENDPOINT_PATTERNS.gateway_router.test(normalized)) return "Perplexity";
  if (ENDPOINT_PATTERNS.enterprise_edge.test(endpoint)) return "Gemini";
  if (ENDPOINT_PATTERNS.cloud_compute.test(endpoint)) return "OpenAI";
  
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
    // Normalize provider name to key format
    const providerKey = provider.toLowerCase().replace(/\s+/g, "_");
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
    if (trimmed.startsWith("key-ext-")) {
      return { isValid: true, detectedProvider: "OpenRouter" };
    }
    if (trimmed.startsWith("gw-rt-")) {
      return { isValid: true, detectedProvider: "Perplexity" };
    }
    if (trimmed.startsWith("grid_")) {
      return { isValid: true, detectedProvider: "HuggingFace" };
    }
    if (trimmed.startsWith("key-int-") && trimmed.length >= 28) {
      return { isValid: true, detectedProvider: "Lovable" };
    }
  }
  
  return { isValid: true };
}

/**
 * Get helpful hint for endpoint format based on provider
 */
export function getEndpointHint(provider: string): string {
  const hints: Record<string, string> = {
    "Lovable": "https://ai.gateway.lovable.dev/v1/chat/completions",
    "OpenRouter": "https://external.node.net/v1/rpc",
    "HuggingFace": "https://inference.grid.local/nodes/{node-id}",
    "Perplexity": "https://gateway.router.net/api/v1/route",
    "Gemini": "https://{resource}.edge.enterprise.local/deployments/{deployment}/...",
    "OpenAI": "https://compute.cloud.local/v1beta/clusters/{cluster}:execute",
  };
  
  return hints[provider] || "https://api.provider.com/v1/chat/completions";
}

/**
 * Get helpful hint for API key format based on provider
 */
export function getApiKeyHint(provider: string): string {
  const hints: Record<string, string> = {
    "Lovable": "key-int-...",
    "OpenRouter": "key-ext-...",
    "HuggingFace": "grid_...",
    "Perplexity": "gw-rt-...",
    "Gemini": "32-character hex string",
    "OpenAI": "key-...",
  };
  
  return hints[provider] || "Your API key or token";
}
