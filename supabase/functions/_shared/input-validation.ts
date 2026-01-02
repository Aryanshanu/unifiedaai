/**
 * Input Validation Module for Edge Functions
 * 
 * Provides Zod-based schema validation for all edge function inputs.
 * This prevents injection attacks, type confusion, and malformed payloads.
 */

// Inline Zod-like validation (no external dependencies needed in Deno)
// We use a lightweight custom validator to avoid npm dependency issues

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate a UUID string
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Validate a string with optional constraints
 */
export function isValidString(
  value: unknown, 
  options?: { minLength?: number; maxLength?: number; optional?: boolean }
): value is string {
  if (options?.optional && (value === undefined || value === null)) {
    return true;
  }
  if (typeof value !== 'string') return false;
  if (options?.minLength && value.length < options.minLength) return false;
  if (options?.maxLength && value.length > options.maxLength) return false;
  return true;
}

/**
 * Validate a boolean
 */
export function isValidBoolean(value: unknown, optional = false): value is boolean {
  if (optional && value === undefined) return true;
  return typeof value === 'boolean';
}

/**
 * AI Gateway Input Schema
 */
export interface AIGatewayInput {
  systemId: string;
  traceId?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

export function validateAIGatewayInput(body: unknown): ValidationResult<AIGatewayInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  // Validate systemId
  if (!isValidUUID(input.systemId)) {
    errors.push({ field: 'systemId', message: 'systemId must be a valid UUID' });
  }
  
  // Validate traceId (optional)
  if (input.traceId !== undefined && !isValidString(input.traceId, { maxLength: 100 })) {
    errors.push({ field: 'traceId', message: 'traceId must be a string (max 100 chars)' });
  }
  
  // Get messages from input or input.input
  const messagesSource = (input.input as Record<string, unknown>)?.messages || input.messages;
  
  if (!Array.isArray(messagesSource) || messagesSource.length === 0) {
    errors.push({ field: 'messages', message: 'messages must be a non-empty array' });
  } else if (messagesSource.length > 100) {
    errors.push({ field: 'messages', message: 'messages array cannot exceed 100 items' });
  } else {
    for (let i = 0; i < messagesSource.length; i++) {
      const msg = messagesSource[i];
      if (!msg || typeof msg !== 'object') {
        errors.push({ field: `messages[${i}]`, message: 'Each message must be an object' });
        continue;
      }
      
      const { role, content } = msg as { role?: unknown; content?: unknown };
      
      if (!['user', 'assistant', 'system'].includes(role as string)) {
        errors.push({ field: `messages[${i}].role`, message: 'role must be user, assistant, or system' });
      }
      
      if (!isValidString(content, { minLength: 1, maxLength: 50000 })) {
        errors.push({ field: `messages[${i}].content`, message: 'content must be 1-50000 chars' });
      }
    }
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return {
    success: true,
    data: {
      systemId: input.systemId as string,
      traceId: input.traceId as string | undefined,
      messages: messagesSource as AIGatewayInput['messages'],
    }
  };
}

/**
 * Evaluation Engine Input Schema (Fairness, Toxicity, Privacy, Hallucination, Explainability)
 */
export interface EvalEngineInput {
  modelId?: string;
  systemId?: string;
  text?: string;
  context?: string;
  customPrompt?: string;
  autoEscalate?: boolean;
  explanations?: unknown;
}

export function validateEvalEngineInput(body: unknown): ValidationResult<EvalEngineInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  // At least one of modelId, systemId, or text must be provided
  const hasModelId = input.modelId !== undefined;
  const hasSystemId = input.systemId !== undefined;
  const hasText = input.text !== undefined;
  
  if (!hasModelId && !hasSystemId && !hasText) {
    errors.push({ field: 'modelId|systemId|text', message: 'At least one of modelId, systemId, or text is required' });
  }
  
  // Validate modelId if provided
  if (hasModelId && !isValidUUID(input.modelId)) {
    errors.push({ field: 'modelId', message: 'modelId must be a valid UUID' });
  }
  
  // Validate systemId if provided  
  if (hasSystemId && !isValidUUID(input.systemId)) {
    errors.push({ field: 'systemId', message: 'systemId must be a valid UUID' });
  }
  
  // Validate text if provided (max 50000 chars for analysis)
  if (hasText && !isValidString(input.text, { maxLength: 50000 })) {
    errors.push({ field: 'text', message: 'text must be a string (max 50000 chars)' });
  }
  
  // Validate context if provided
  if (input.context !== undefined && !isValidString(input.context, { maxLength: 50000 })) {
    errors.push({ field: 'context', message: 'context must be a string (max 50000 chars)' });
  }
  
  // Validate customPrompt if provided
  if (input.customPrompt !== undefined && !isValidString(input.customPrompt, { maxLength: 10000 })) {
    errors.push({ field: 'customPrompt', message: 'customPrompt must be a string (max 10000 chars)' });
  }
  
  // Validate autoEscalate if provided
  if (input.autoEscalate !== undefined && !isValidBoolean(input.autoEscalate)) {
    errors.push({ field: 'autoEscalate', message: 'autoEscalate must be a boolean' });
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return {
    success: true,
    data: {
      modelId: input.modelId as string | undefined,
      systemId: input.systemId as string | undefined,
      text: input.text as string | undefined,
      context: input.context as string | undefined,
      customPrompt: input.customPrompt as string | undefined,
      autoEscalate: input.autoEscalate as boolean | undefined,
      explanations: input.explanations,
    }
  };
}

/**
 * Create a standardized error response for validation failures
 */
export function validationErrorResponse(
  errors: ValidationError[],
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation Error',
      message: 'Invalid request payload',
      details: errors,
    }),
    { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
