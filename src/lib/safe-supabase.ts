import { supabase } from '@/integrations/supabase/client';
import { logApiError } from './error-logger';
import { toast } from 'sonner';

interface SafeQueryOptions {
  showErrorToast?: boolean;
  toastMessage?: string;
  fallbackData?: unknown;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: SafeQueryOptions = {
  showErrorToast: true,
  retries: 2,
  retryDelay: 1000,
};

/**
 * Safely execute a Supabase query with error handling and retry
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  options: SafeQueryOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 0; attempt <= (opts.retries ?? 0); attempt++) {
    try {
      const result = await queryFn();
      
      if (result.error) {
        throw result.error;
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Log the error
      await logApiError('supabase_query', error);
      
      // Retry if not last attempt
      if (attempt < (opts.retries ?? 0)) {
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
        continue;
      }
      
      // Last attempt failed
      if (opts.showErrorToast) {
        toast.error(opts.toastMessage || 'Failed to load data. Please try again.');
      }
      
      return { 
        data: opts.fallbackData as T | null, 
        error 
      };
    }
  }
  
  return { data: null, error: new Error('Query failed after retries') };
}

/**
 * Safely invoke a Supabase edge function with error handling
 */
export async function safeInvoke<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>,
  options: SafeQueryOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 0; attempt <= (opts.retries ?? 0); attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });
      
      if (error) {
        throw error;
      }
      
      return { data: data as T, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Log the error
      await logApiError(`edge_function:${functionName}`, error, body);
      
      // Retry if not last attempt
      if (attempt < (opts.retries ?? 0)) {
        if (opts.showErrorToast) {
          toast.info('Temporary issue — retrying...', { duration: opts.retryDelay });
        }
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
        continue;
      }
      
      // Last attempt failed
      if (opts.showErrorToast) {
        toast.error(opts.toastMessage || 'Service temporarily unavailable. Please try again.');
      }
      
      return { 
        data: opts.fallbackData as T | null, 
        error 
      };
    }
  }
  
  return { data: null, error: new Error('Function invoke failed after retries') };
}

/**
 * Safe wrapper for common Supabase operations
 * Note: For type safety, use safeQuery directly with your specific table queries
 */
export const safeDb = {
  /**
   * Get a count from any table
   */
  count: async (tableName: string) => {
    try {
      // Type assertion needed for dynamic table access
      const result = await (supabase as any).from(tableName)
        .select('*', { count: 'exact', head: true });
      
      return { data: result.count ?? 0, error: result.error };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      await logApiError(`supabase_count:${tableName}`, error);
      return { data: 0, error };
    }
  },
};
