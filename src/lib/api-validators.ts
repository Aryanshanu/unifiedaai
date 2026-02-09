/**
 * Zod validators for critical API responses.
 * Provides runtime validation with graceful fallback.
 */
import { z } from 'zod';

// ── Policy Pack ──
export const PolicyPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  rules: z.array(z.any()),
  status: z.enum(['draft', 'active', 'disabled']),
  version: z.string(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ── Drift Alert ──
export const DriftAlertSchema = z.object({
  id: z.string(),
  model_id: z.string(),
  feature: z.string(),
  drift_type: z.string(),
  drift_value: z.number(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'investigating', 'mitigating', 'resolved']),
  detected_at: z.string(),
  resolved_at: z.string().nullable(),
  resolved_by: z.string().nullable(),
});

// ── Incident ──
export const IncidentSchema = z.object({
  id: z.string(),
  model_id: z.string().nullable(),
  incident_type: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'investigating', 'mitigating', 'resolved']),
  assignee_id: z.string().nullable(),
  created_at: z.string(),
  resolved_at: z.string().nullable(),
  resolved_by: z.string().nullable(),
  archived_at: z.string().nullable().optional(),
  archived_by: z.string().nullable().optional(),
});

/**
 * Validate an array of API responses with graceful fallback.
 * If validation fails, logs a warning and returns raw data.
 */
export function safeValidateArray<T>(
  schema: z.ZodType<T>,
  data: unknown[],
  context: string
): T[] {
  try {
    return z.array(schema).parse(data);
  } catch (err) {
    console.warn(
      `[api-validators] Validation failed for ${context}:`,
      err instanceof z.ZodError ? err.issues.slice(0, 3) : err
    );
    return data as T[];
  }
}
