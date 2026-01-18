// ============================================
// DQ ASSISTANT TYPES - Governance-Grade Interfaces
// ============================================

/**
 * Intent types for classification - determines response strategy
 */
export type DQIntent =
  | 'SUMMARY'           // General status overview
  | 'FAILED_RULES'      // What rules failed?
  | 'COLUMN_ISSUE'      // Why did column X fail?
  | 'INCIDENT_STATUS'   // Open incidents
  | 'ROOT_CAUSE'        // Why did this happen?
  | 'REMEDIATION'       // How to fix?
  | 'TREND'             // Historical comparison
  | 'GOVERNANCE_TRUST'  // Explain integrity score
  | 'UNKNOWN';          // Ask clarifying question

/**
 * Entities extracted from user message for context matching
 */
export interface ExtractedEntities {
  columns: string[];
  rules: string[];
  dimensions: string[];
  severities: string[];
  steps: string[];
}

/**
 * Column profile structure in LiveDQContext
 */
export interface ColumnProfileInfo {
  name: string;
  dtype: string;
  completeness: number;
  null_count: number;
  distinct_count: number;
  uniqueness?: number;
  min_value?: string | number | null;
  max_value?: string | number | null;
}

/**
 * Failed rule details for context
 */
export interface FailedRuleInfo {
  rule_id: string;
  rule_name: string;
  dimension: string;
  column_name: string | null;
  success_rate: number;
  failed_count: number;
  threshold: number;
  severity: string;
}

/**
 * Rule summary info
 */
export interface RuleInfo {
  id: string;
  rule_name: string;
  dimension: string;
  column_name: string | null;
  severity: string;
  threshold: number;
}

/**
 * Incident summary info
 */
export interface IncidentInfo {
  id: string;
  dimension: string;
  severity: 'P0' | 'P1' | 'P2';
  status: string;
  action: string;
  rule_id?: string | null;
}

/**
 * Live pipeline context - MUST be sent with every message
 * This is the complete snapshot of the current DQ pipeline state
 */
export interface LiveDQContext {
  dataset_id: string;
  dataset_name: string | null;
  pipeline_run_id: string | null;
  timestamp: string;

  profiling?: {
    row_count: number;
    column_count: number;
    column_profiles: Record<string, ColumnProfileInfo>;
    available_dimensions: string[];
    unavailable_dimensions: string[];
  };

  rules?: {
    total: number;
    by_dimension: Record<string, number>;
    critical: number;
    warning: number;
    info: number;
    items: RuleInfo[];
  };

  execution?: {
    id: string;
    total_rules: number;
    passed: number;
    failed: number;
    critical_failure: boolean;
    overall_score: number | null;
    failed_rules: FailedRuleInfo[];
  };

  incidents?: {
    open: number;
    by_severity: Record<'P0' | 'P1' | 'P2', number>;
    items: IncidentInfo[];
  };

  governance_report?: {
    integrity_score: number;
    missing_dimensions: string[];
    inconsistencies: string[];
    score_breakdown?: {
      base: number;
      dimension_penalty: number;
      simulated_penalty: number;
      critical_penalty: number;
      warning_penalty: number;
    };
  };
}

/**
 * Enhanced chat request with structured context
 */
export interface GovernanceChatRequest {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: LiveDQContext;
  extracted_entities: ExtractedEntities;
}

/**
 * Enhanced chat response with metadata
 */
export interface GovernanceChatResponse {
  status: 'success' | 'error';
  answer?: string;
  error_code?: 'NO_CONTEXT' | 'MODEL_UNAVAILABLE' | 'INVALID_REQUEST' | 'RATE_LIMITED' | 'MISSING_DATA' | 'STALE_CONTEXT';
  error_message?: string;
  metadata?: {
    intent: DQIntent;
    entities: ExtractedEntities;
    context_timestamp: string;
  };
}

/**
 * Context validation result
 */
export interface ContextValidation {
  valid: boolean;
  reason?: string;
  missing_sections?: string[];
}

// ============================================
// HELPER CONSTANTS
// ============================================

export const DQ_DIMENSIONS = [
  'completeness',
  'uniqueness',
  'validity',
  'accuracy',
  'timeliness',
  'consistency'
] as const;

export const SEVERITY_LEVELS = ['critical', 'warning', 'info'] as const;

export const INCIDENT_SEVERITIES = ['P0', 'P1', 'P2'] as const;

/**
 * Maximum age for context before it's considered stale (5 minutes)
 */
export const CONTEXT_STALE_THRESHOLD_MS = 5 * 60 * 1000;
