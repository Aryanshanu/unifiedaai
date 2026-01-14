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
 * Data Quality Engine Input Schema
 */
export interface DataQualityInput {
  dataset_id: string;
  run_type: 'scheduled' | 'on_demand' | 'pre_training' | 'contract_check';
  sample_data?: Record<string, unknown>[];
  schema_definition?: Record<string, string>;
  freshness_threshold_hours?: number;
  check_contract?: boolean;
}

export function validateDataQualityInput(body: unknown): ValidationResult<DataQualityInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  if (!isValidUUID(input.dataset_id)) {
    errors.push({ field: 'dataset_id', message: 'dataset_id must be a valid UUID' });
  }
  
  const validRunTypes = ['scheduled', 'on_demand', 'pre_training', 'contract_check'];
  if (!validRunTypes.includes(input.run_type as string)) {
    errors.push({ field: 'run_type', message: `run_type must be one of: ${validRunTypes.join(', ')}` });
  }
  
  if (input.freshness_threshold_hours !== undefined && 
      (typeof input.freshness_threshold_hours !== 'number' || input.freshness_threshold_hours < 0)) {
    errors.push({ field: 'freshness_threshold_hours', message: 'freshness_threshold_hours must be a positive number' });
  }
  
  if (input.check_contract !== undefined && !isValidBoolean(input.check_contract)) {
    errors.push({ field: 'check_contract', message: 'check_contract must be a boolean' });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { 
    success: true, 
    data: {
      dataset_id: input.dataset_id as string,
      run_type: input.run_type as DataQualityInput['run_type'],
      sample_data: input.sample_data as Record<string, unknown>[] | undefined,
      schema_definition: input.schema_definition as Record<string, string> | undefined,
      freshness_threshold_hours: input.freshness_threshold_hours as number | undefined,
      check_contract: input.check_contract as boolean | undefined
    }
  };
}

/**
 * Audit Report Input Schema
 */
export interface AuditReportInput {
  systemId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  includeRawLogs?: boolean;
  format?: 'json' | 'pdf' | 'both';
}

export function validateAuditReportInput(body: unknown): ValidationResult<AuditReportInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  if (input.systemId !== undefined && !isValidUUID(input.systemId)) {
    errors.push({ field: 'systemId', message: 'systemId must be a valid UUID' });
  }
  
  if (input.projectId !== undefined && !isValidUUID(input.projectId)) {
    errors.push({ field: 'projectId', message: 'projectId must be a valid UUID' });
  }
  
  if (!input.systemId && !input.projectId) {
    errors.push({ field: 'systemId|projectId', message: 'At least systemId or projectId is required' });
  }
  
  if (input.format !== undefined && !['json', 'pdf', 'both'].includes(input.format as string)) {
    errors.push({ field: 'format', message: 'format must be json, pdf, or both' });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { success: true, data: input as AuditReportInput };
}

/**
 * Red Team Campaign Input Schema
 */
export interface RedTeamInput {
  campaignName?: string;
  attackCount?: number;
  runFullCampaign?: boolean;
  categories?: string[];
  targetSystemId?: string;
}

export function validateRedTeamInput(body: unknown): ValidationResult<RedTeamInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: true, data: { runFullCampaign: true } }; // Default if no body
  }
  
  const input = body as Record<string, unknown>;
  
  if (input.campaignName !== undefined && !isValidString(input.campaignName, { maxLength: 200 })) {
    errors.push({ field: 'campaignName', message: 'campaignName must be a string (max 200 chars)' });
  }
  
  if (input.attackCount !== undefined && 
      (typeof input.attackCount !== 'number' || input.attackCount < 1 || input.attackCount > 100)) {
    errors.push({ field: 'attackCount', message: 'attackCount must be a number between 1 and 100' });
  }
  
  if (input.targetSystemId !== undefined && !isValidUUID(input.targetSystemId)) {
    errors.push({ field: 'targetSystemId', message: 'targetSystemId must be a valid UUID' });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { success: true, data: input as RedTeamInput };
}

/**
 * ML Detection Input Schema
 */
export interface MLDetectionInput {
  text: string;
  mode?: 'full' | 'pii' | 'toxicity' | 'security';
}

export function validateMLDetectionInput(body: unknown): ValidationResult<MLDetectionInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  if (!isValidString(input.text, { minLength: 1, maxLength: 100000 })) {
    errors.push({ field: 'text', message: 'text is required and must be 1-100000 chars' });
  }
  
  if (input.mode !== undefined && !['full', 'pii', 'toxicity', 'security'].includes(input.mode as string)) {
    errors.push({ field: 'mode', message: 'mode must be full, pii, toxicity, or security' });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { success: true, data: { text: input.text as string, mode: input.mode as MLDetectionInput['mode'] } };
}

/**
 * LLM Generate Input Schema
 */
export interface LLMGenerateInput {
  provider?: string;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  system_id?: string;
}

export function validateLLMGenerateInput(body: unknown): ValidationResult<LLMGenerateInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    errors.push({ field: 'messages', message: 'messages must be a non-empty array' });
  } else if (input.messages.length > 100) {
    errors.push({ field: 'messages', message: 'messages array cannot exceed 100 items' });
  }
  
  if (input.temperature !== undefined && (typeof input.temperature !== 'number' || input.temperature < 0 || input.temperature > 2)) {
    errors.push({ field: 'temperature', message: 'temperature must be a number between 0 and 2' });
  }
  
  if (input.max_tokens !== undefined && (typeof input.max_tokens !== 'number' || input.max_tokens < 1 || input.max_tokens > 128000)) {
    errors.push({ field: 'max_tokens', message: 'max_tokens must be a number between 1 and 128000' });
  }
  
  if (input.system_id !== undefined && !isValidUUID(input.system_id)) {
    errors.push({ field: 'system_id', message: 'system_id must be a valid UUID' });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { 
    success: true, 
    data: {
      provider: input.provider as string | undefined,
      model: input.model as string | undefined,
      messages: input.messages as Array<{ role: string; content: string }>,
      temperature: input.temperature as number | undefined,
      max_tokens: input.max_tokens as number | undefined,
      stream: input.stream as boolean | undefined,
      system_id: input.system_id as string | undefined,
    }
  };
}

/**
 * Custom Prompt Test Input Schema
 */
export interface CustomPromptTestInput {
  modelId: string;
  engineType: string;
  prompt: string;
}

export function validateCustomPromptTestInput(body: unknown): ValidationResult<CustomPromptTestInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  if (!isValidUUID(input.modelId)) {
    errors.push({ field: 'modelId', message: 'modelId must be a valid UUID' });
  }
  
  const validEngines = ['fairness', 'toxicity', 'privacy', 'hallucination', 'explainability'];
  if (!validEngines.includes(input.engineType as string)) {
    errors.push({ field: 'engineType', message: `engineType must be one of: ${validEngines.join(', ')}` });
  }
  
  if (!isValidString(input.prompt, { minLength: 1, maxLength: 10000 })) {
    errors.push({ field: 'prompt', message: 'prompt is required and must be 1-10000 chars' });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { 
    success: true, 
    data: {
      modelId: input.modelId as string,
      engineType: input.engineType as string,
      prompt: input.prompt as string,
    }
  };
}

/**
 * Validate Contract Input Schema
 */
export interface ValidateContractInput {
  upload_id: string;
  contract_id?: string;
}

export function validateContractInput(body: unknown): ValidationResult<ValidateContractInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  if (!isValidUUID(input.upload_id)) {
    errors.push({ field: 'upload_id', message: 'upload_id must be a valid UUID' });
  }
  
  if (input.contract_id !== undefined && !isValidUUID(input.contract_id)) {
    errors.push({ field: 'contract_id', message: 'contract_id must be a valid UUID' });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { success: true, data: { upload_id: input.upload_id as string, contract_id: input.contract_id as string | undefined } };
}

/**
 * Record MLOps Event Input Schema
 */
export interface MLOpsEventInput {
  systemId: string;
  modelId?: string;
  eventType: 'deployment' | 'model_update' | 'pipeline_run' | 'config_change' | 'rollback' | 'bypass';
  eventDetails: Record<string, unknown>;
  actorId?: string;
  artifactHash?: string;
  commitSha?: string;
}

export function validateMLOpsEventInput(body: unknown): ValidationResult<MLOpsEventInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  if (!isValidUUID(input.systemId)) {
    errors.push({ field: 'systemId', message: 'systemId must be a valid UUID' });
  }
  
  if (input.modelId !== undefined && !isValidUUID(input.modelId)) {
    errors.push({ field: 'modelId', message: 'modelId must be a valid UUID' });
  }
  
  const validEventTypes = ['deployment', 'model_update', 'pipeline_run', 'config_change', 'rollback', 'bypass'];
  if (!validEventTypes.includes(input.eventType as string)) {
    errors.push({ field: 'eventType', message: `eventType must be one of: ${validEventTypes.join(', ')}` });
  }
  
  if (!input.eventDetails || typeof input.eventDetails !== 'object') {
    errors.push({ field: 'eventDetails', message: 'eventDetails must be an object' });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { 
    success: true, 
    data: {
      systemId: input.systemId as string,
      modelId: input.modelId as string | undefined,
      eventType: input.eventType as MLOpsEventInput['eventType'],
      eventDetails: input.eventDetails as Record<string, unknown>,
      actorId: input.actorId as string | undefined,
      artifactHash: input.artifactHash as string | undefined,
      commitSha: input.commitSha as string | undefined,
    }
  };
}

/**
 * Audit Data Input Schema  
 */
export interface AuditDataInput {
  upload_id: string;
}

export function validateAuditDataInput(body: unknown): ValidationResult<AuditDataInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  if (!isValidUUID(input.upload_id)) {
    errors.push({ field: 'upload_id', message: 'upload_id must be a valid UUID' });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { success: true, data: { upload_id: input.upload_id as string } };
}

/**
 * RAI Reasoning Engine Input Schema
 */
export interface RAIReasoningInput {
  modelId: string;
  engineType: string;
}

export function validateRAIReasoningInput(body: unknown): ValidationResult<RAIReasoningInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  }
  
  const input = body as Record<string, unknown>;
  
  if (!isValidUUID(input.modelId)) {
    errors.push({ field: 'modelId', message: 'modelId must be a valid UUID' });
  }
  
  const validEngines = ['fairness', 'toxicity', 'privacy', 'hallucination', 'explainability'];
  if (!validEngines.includes(input.engineType as string)) {
    errors.push({ field: 'engineType', message: `engineType must be one of: ${validEngines.join(', ')}` });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { 
    success: true, 
    data: {
      modelId: input.modelId as string,
      engineType: input.engineType as string,
    }
  };
}

/**
 * Test Traffic Input Schema
 */
export interface TestTrafficInput {
  systemId?: string;
  count?: number;
}

export function validateTestTrafficInput(body: unknown): ValidationResult<TestTrafficInput> {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    return { success: true, data: {} }; // Default empty input is valid
  }
  
  const input = body as Record<string, unknown>;
  
  if (input.systemId !== undefined && !isValidUUID(input.systemId)) {
    errors.push({ field: 'systemId', message: 'systemId must be a valid UUID' });
  }
  
  if (input.count !== undefined && (typeof input.count !== 'number' || input.count < 1 || input.count > 1000)) {
    errors.push({ field: 'count', message: 'count must be a number between 1 and 1000' });
  }
  
  if (errors.length > 0) return { success: false, errors };
  
  return { success: true, data: input as TestTrafficInput };
}

/**
 * Create a fetch wrapper with timeout
 */
export function createTimeoutFetch(timeoutMs: number = 30000) {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  };
}

/**
 * Execute with fallback pattern
 */
export async function executeWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  label: string
): Promise<{ result: T; degraded: boolean }> {
  try {
    const result = await primary();
    return { result, degraded: false };
  } catch (primaryError) {
    console.warn(`[${label}] Primary failed:`, primaryError);
    try {
      const result = await fallback();
      return { result, degraded: true };
    } catch (fallbackError) {
      console.error(`[${label}] Both primary and fallback failed`);
      throw fallbackError;
    }
  }
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(required: string[]): { valid: boolean; missing: string[] } {
  const missing = required.filter(key => {
    // Deno environment only for edge functions
    const value = Deno.env.get(key);
    return !value;
  });
  return { valid: missing.length === 0, missing };
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
