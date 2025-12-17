import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { logApiError } from '@/lib/error-logger';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToast?: boolean;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number) => void;
  onSuccess?: () => void;
}

interface RetryState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onError' | 'onRetry' | 'onSuccess'>> = {
  maxRetries: 3,
  retryDelay: 5000,
  showToast: true,
};

/**
 * Hook for making API calls with automatic retry on failure
 */
export function useApiRetry<T>(
  apiCall: () => Promise<T>,
  options: RetryOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [state, setState] = useState<RetryState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isRetrying: false,
    retryCount: 0,
  });
  
  const abortRef = useRef(false);
  const lastSuccessRef = useRef<T | null>(null);

  const execute = useCallback(async (): Promise<T | null> => {
    abortRef.current = false;
    setState(prev => ({ ...prev, isLoading: true, error: null, retryCount: 0 }));

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      if (abortRef.current) break;

      try {
        const result = await apiCall();
        lastSuccessRef.current = result;
        setState({
          data: result,
          error: null,
          isLoading: false,
          isRetrying: false,
          retryCount: attempt,
        });
        opts.onSuccess?.();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        if (attempt < opts.maxRetries) {
          // Retry
          setState(prev => ({
            ...prev,
            isRetrying: true,
            retryCount: attempt + 1,
          }));
          
          opts.onRetry?.(attempt + 1);
          
          if (opts.showToast) {
            toast.info(`Temporary issue — retrying in ${opts.retryDelay / 1000} seconds...`, {
              duration: opts.retryDelay - 500,
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
        } else {
          // All retries failed
          await logApiError('api_retry_exhausted', error);
          
          setState({
            data: lastSuccessRef.current, // Return cached data if available
            error,
            isLoading: false,
            isRetrying: false,
            retryCount: attempt,
          });
          
          opts.onError?.(error);
          
          if (opts.showToast) {
            if (lastSuccessRef.current) {
              toast.warning('Working offline with cached data');
            } else {
              toast.error('Service temporarily unavailable. Please try again later.');
            }
          }
        }
      }
    }

    return lastSuccessRef.current;
  }, [apiCall, opts]);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  return {
    ...state,
    execute,
    abort,
    reset,
    cachedData: lastSuccessRef.current,
  };
}

/**
 * Simple wrapper for one-off API calls with retry
 */
export async function fetchWithRetry<T>(
  apiCall: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (attempt < opts.maxRetries) {
        if (opts.showToast) {
          toast.info(`Temporary issue — retrying...`);
        }
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
      }
    }
  }

  await logApiError('fetch_with_retry', lastError);
  
  if (opts.showToast) {
    toast.error('Service temporarily unavailable');
  }
  
  return null;
}
