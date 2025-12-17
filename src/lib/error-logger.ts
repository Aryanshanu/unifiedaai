import { supabase } from '@/integrations/supabase/client';

interface ErrorLogData {
  error_type: string;
  error_message: string;
  error_stack?: string | null;
  component_name?: string;
  page_url?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an error to the app_errors table in Supabase
 * This is fire-and-forget - it won't throw even if logging fails
 */
export async function logError(data: ErrorLogData): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    // Use type assertion since app_errors table was just created
    await (supabase as any).from('app_errors').insert({
      error_type: data.error_type,
      error_message: data.error_message.substring(0, 5000), // Limit message length
      error_stack: data.error_stack?.substring(0, 10000) || null,
      component_name: data.component_name || null,
      user_id: userData?.user?.id || null,
      page_url: data.page_url || window.location.href,
      user_agent: data.user_agent || navigator.userAgent,
      metadata: data.metadata || {},
    });
    
    console.log('[ErrorLogger] Error logged to database');
  } catch (err) {
    // Silent fail - don't throw when logging fails
    console.error('[ErrorLogger] Failed to log error:', err);
  }
}

/**
 * Log an API error with context
 */
export async function logApiError(
  endpoint: string,
  error: unknown,
  requestData?: unknown
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  await logError({
    error_type: 'api_error',
    error_message: `API Error at ${endpoint}: ${errorMessage}`,
    error_stack: errorStack,
    component_name: endpoint,
    metadata: {
      endpoint,
      requestData: requestData ? JSON.stringify(requestData).substring(0, 1000) : null,
    },
  });
}

/**
 * Log a component render error
 */
export async function logComponentError(
  componentName: string,
  error: unknown
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  await logError({
    error_type: 'component_error',
    error_message: `Component Error in ${componentName}: ${errorMessage}`,
    error_stack: errorStack,
    component_name: componentName,
  });
}

/**
 * Log a realtime subscription error
 */
export async function logRealtimeError(
  channel: string,
  error: unknown
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  await logError({
    error_type: 'realtime_error',
    error_message: `Realtime Error on ${channel}: ${errorMessage}`,
    component_name: channel,
    metadata: { channel },
  });
}
