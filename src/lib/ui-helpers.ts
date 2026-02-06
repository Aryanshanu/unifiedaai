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
    // DQ Pipeline specific errors - DO NOT MASK, show real message
    [/NO_DATA/i, 'No data found. Upload data using the uploader before running the pipeline.'],
    [/DATASET_NOT_FOUND/i, 'Dataset not found. Please create a dataset first.'],
    [/PROFILING_FAILED/i, 'Data profiling failed. Check your data format.'],
    [/RULES_FAILED/i, 'Rule generation failed.'],
    [/EXECUTION_FAILED/i, 'Rule execution failed.'],
    
    // OpenRouter specific errors - CRITICAL for Core Security
    [/no endpoints found/i, 'Model unavailable on OpenRouter. Please select a different model or use Built-in Target.'],
    [/MODEL_UNAVAILABLE/i, 'Selected model is unavailable. Try a different model or Built-in Target.'],
    [/openrouter.*404/i, 'Model not found on OpenRouter. Check model name or use Built-in Target.'],
    [/openrouter.*error/i, 'OpenRouter connection failed. Check API key or use Built-in Target.'],
    
    // Target executor specific
    [/target.*unreachable/i, 'Target system unreachable. Check endpoint configuration.'],
    [/target.*timeout/i, 'Target system timed out. The model may be slow or unavailable.'],
    [/PROVIDER_ERROR/i, 'Provider returned an error. Check your configuration.'],
    [/SYSTEM_NOT_FOUND/i, 'Target system not found. Please select a valid system.'],
    
    // Rate limits (most common user-facing issue)
    [/rate limit/i, 'The model is busy. Please wait a moment and try again.'],
    [/429/i, 'Too many requests. Please wait a moment and try again.'],
    [/too many requests/i, 'Too many requests. Please wait a moment and try again.'],
    [/model.*busy/i, 'The model is busy. Please wait and try again.'],
    
    // Edge function errors - only mask 500s, not 400s (validation errors)
    [/edge function.*500/i, 'Temporary service issue. Retrying...'],
    [/edge function returned.*non.?2xx.*500/i, 'Temporary service issue. Retrying...'],
    
    // Auth errors
    [/authentication failed/i, 'Please check your API token in Settings.'],
    [/401|unauthorized/i, 'Session expired. Please sign in again.'],
    [/403|forbidden|access denied/i, "You don't have permission for this action."],
    [/jwt/i, 'Session expired. Please sign in again.'],
    
    // Not found - more specific mapping
    [/model not found/i, 'Model not found. Please check your selection.'],
    [/system not found/i, 'Target system not found. Please select a valid system.'],
    [/404.*not found/i, 'The requested resource could not be found.'],
    
    // Model/endpoint config errors
    [/not a valid model id/i, 'Model configuration issue. Please update endpoint in Settings.'],
    [/endpoint.*not configured/i, 'Model endpoint not configured. Please update Settings.'],
    [/api.*token.*not configured/i, 'API token not configured. Please update Settings.'],
    [/unable to reach.*model/i, 'Unable to reach the model. Please check configuration.'],
    [/api key.*required/i, 'API key required. Please configure in Settings or use Built-in Target.'],
    
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
