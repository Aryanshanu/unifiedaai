/**
 * Sanitize error messages to be user-friendly
 * Never expose raw technical errors to users
 */
export function sanitizeErrorMessage(message: string): string {
  const raw = (message || '').trim();
  if (!raw) return 'Something went wrong. Please try again.';
  
  const lower = raw.toLowerCase();

  // Map technical errors to friendly messages (order matters - more specific first)
  const errorMappings: [RegExp | string, string][] = [
    // Rate limits (most common user-facing issue)
    [/rate limit/i, 'The model is busy. Please wait a moment and try again.'],
    [/429/i, 'Too many requests. Please wait a moment and try again.'],
    [/too many requests/i, 'Too many requests. Please wait a moment and try again.'],
    [/model.*busy/i, 'The model is busy. Please wait and try again.'],
    
    // Edge function errors (catch all variations)
    [/edge function returned.*non.?2xx/i, 'Temporary service issue. Retrying...'],
    [/edge function.*500/i, 'Temporary service issue. Retrying...'],
    [/edge function.*error/i, 'Temporary service issue. Please retry.'],
    [/non.?2xx status/i, 'Temporary service issue. Please retry.'],
    [/returned.*error/i, 'Temporary service issue. Please retry.'],
    
    // Auth errors
    [/authentication failed/i, 'Please check your API token in Settings.'],
    [/401|unauthorized/i, 'Session expired. Please sign in again.'],
    [/403|forbidden|access denied/i, "You don't have permission for this action."],
    [/jwt/i, 'Session expired. Please sign in again.'],
    
    // Not found
    [/404|not found/i, 'The requested item could not be found.'],
    [/model not found/i, 'Model not found. Please check your selection.'],
    
    // Model/endpoint config errors
    [/not a valid model id/i, 'Model configuration issue. Please update endpoint in Settings.'],
    [/endpoint.*not configured/i, 'Model endpoint not configured. Please update Settings.'],
    [/api.*token.*not configured/i, 'API token not configured. Please update Settings.'],
    [/unable to reach.*model/i, 'Unable to reach the model. Please check configuration.'],
    
    // Server errors
    [/500|internal server/i, 'Temporary issue — please try again.'],
    [/502|bad gateway/i, 'Service temporarily unavailable. Retrying...'],
    [/503|service unavailable/i, 'Service is busy. Please try again shortly.'],
    [/504|gateway timeout/i, 'Request timed out. Please try again.'],
    
    // Network errors
    [/failed to fetch|networkerror/i, 'Network issue. Please check your connection and retry.'],
    [/network error/i, 'Connection issue. Please check your internet.'],
    [/timeout/i, 'The request took too long. Please try again.'],
    [/CORS|cross-origin/i, 'Connection issue. Please try again.'],
    
    // Parse errors
    [/JSON|parse error/i, 'Data format error. Please try again.'],
    
    // Abort
    [/abort/i, 'Request was cancelled.'],
  ];
  
  for (const [pattern, friendlyMessage] of errorMappings) {
    if (typeof pattern === 'string') {
      if (lower.includes(pattern.toLowerCase())) {
        return friendlyMessage;
      }
    } else if (pattern.test(raw)) {
      return friendlyMessage;
    }
  }
  
  // If message is already reasonably short and doesn't look technical
  const technicalPatterns = /stack|trace|at\s+\w+\.\w+|\.ts:|\.js:|line\s+\d+|column\s+\d+|error\s*:|supabase|deno/i;
  if (raw.length < 80 && !raw.includes('\n') && !technicalPatterns.test(raw)) {
    return raw;
  }
  
  return 'Something went wrong. Please try again.';
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
