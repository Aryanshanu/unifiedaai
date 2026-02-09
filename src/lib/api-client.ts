/**
 * Centralized API error handling.
 * Normalizes errors into a consistent format with friendly messages.
 */

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public isRetryable: boolean,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Map of raw error patterns to friendly messages */
const ERROR_PATTERNS: Array<{ pattern: RegExp; friendly: string; code: ApiErrorCode }> = [
  { pattern: /jwt expired/i, friendly: 'Your session has expired. Please sign in again.', code: 'UNAUTHORIZED' },
  { pattern: /not found|no rows/i, friendly: 'The requested resource was not found.', code: 'NOT_FOUND' },
  { pattern: /permission denied|row-level security/i, friendly: 'You do not have permission to perform this action.', code: 'UNAUTHORIZED' },
  { pattern: /network|fetch|ECONNREFUSED/i, friendly: 'Unable to reach the server. Please check your connection.', code: 'NETWORK_ERROR' },
  { pattern: /timeout|ETIMEDOUT/i, friendly: 'The request timed out. Please try again.', code: 'TIMEOUT' },
  { pattern: /non.?2xx|status code/i, friendly: 'The server encountered an issue processing your request.', code: 'SERVER_ERROR' },
];

/**
 * Normalize any error into a friendly ApiError.
 */
export function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  const message = err instanceof Error ? err.message : String(err);

  for (const { pattern, friendly, code } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return new ApiError(code, code !== 'UNAUTHORIZED', friendly, err);
    }
  }

  return new ApiError('SERVER_ERROR', true, 'Something went wrong. Please try again.', err);
}

/**
 * Wrap an async operation with consistent error handling.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const apiErr = normalizeError(err);
    if (context) {
      console.error(`[${context}]`, apiErr.code, apiErr.message);
    }
    throw apiErr;
  }
}
