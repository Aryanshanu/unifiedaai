import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export type HealthStatus = 'healthy' | 'retrying' | 'failed' | 'loading';

interface SelfHealingOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onRecovery?: () => void;
  onFailure?: (error: Error) => void;
  showToasts?: boolean;
}

interface SelfHealingState<T> {
  data: T | null;
  error: Error | null;
  status: HealthStatus;
  lastUpdated: Date | null;
  retryCount: number;
}

export function useSelfHealing<T>(
  fetchFn: () => Promise<T>,
  options: SelfHealingOptions = {}
) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry,
    onRecovery,
    onFailure,
    showToasts = true,
  } = options;

  const [state, setState] = useState<SelfHealingState<T>>({
    data: null,
    error: null,
    status: 'loading',
    lastUpdated: null,
    retryCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const calculateDelay = useCallback((attempt: number) => {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 500; // Add jitter
  }, [baseDelay, maxDelay]);

  const execute = useCallback(async (retryAttempt = 0): Promise<T | null> => {
    clearRetryTimeout();
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      status: retryAttempt > 0 ? 'retrying' : 'loading',
      retryCount: retryAttempt,
    }));

    try {
      const result = await fetchFn();
      
      if (retryAttempt > 0 && showToasts) {
        toast.success('Connection recovered');
        onRecovery?.();
      }

      setState({
        data: result,
        error: null,
        status: 'healthy',
        lastUpdated: new Date(),
        retryCount: 0,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      
      if (err.name === 'AbortError') {
        return null;
      }

      if (retryAttempt < maxRetries) {
        const delay = calculateDelay(retryAttempt);
        
        if (showToasts && retryAttempt === 0) {
          toast.warning(`Connection issue, retrying...`);
        }
        
        onRetry?.(retryAttempt + 1, err);

        setState(prev => ({
          ...prev,
          status: 'retrying',
          retryCount: retryAttempt + 1,
        }));

        return new Promise((resolve) => {
          retryTimeoutRef.current = setTimeout(async () => {
            const result = await execute(retryAttempt + 1);
            resolve(result);
          }, delay);
        });
      }

      if (showToasts) {
        toast.error('Failed to load data. Please try again.');
      }
      
      onFailure?.(err);

      setState(prev => ({
        ...prev,
        data: prev.data, // Keep cached data
        error: err,
        status: 'failed',
        retryCount: retryAttempt,
      }));

      return null;
    }
  }, [fetchFn, maxRetries, calculateDelay, clearRetryTimeout, showToasts, onRetry, onRecovery, onFailure]);

  const retry = useCallback(() => {
    return execute(0);
  }, [execute]);

  const reset = useCallback(() => {
    clearRetryTimeout();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      data: null,
      error: null,
      status: 'loading',
      lastUpdated: null,
      retryCount: 0,
    });
  }, [clearRetryTimeout]);

  useEffect(() => {
    return () => {
      clearRetryTimeout();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [clearRetryTimeout]);

  return {
    ...state,
    execute,
    retry,
    reset,
    isLoading: state.status === 'loading',
    isRetrying: state.status === 'retrying',
    isFailed: state.status === 'failed',
    isHealthy: state.status === 'healthy',
  };
}

// Debounce utility for preventing excessive operations
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}
