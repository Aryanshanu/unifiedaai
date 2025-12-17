import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logRealtimeError } from '@/lib/error-logger';
import { toast } from 'sonner';

interface RealtimeConfig {
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

interface RealtimeOptions {
  onInsert?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  maxRetries?: number;
  showReconnecting?: boolean;
}

const MAX_BACKOFF_MS = 30000;

/**
 * Hook for Supabase Realtime subscriptions with auto-reconnect
 */
export function useRealtimeWithReconnect(
  channelName: string,
  configs: RealtimeConfig[],
  options: RealtimeOptions = {}
) {
  const { maxRetries = 5, showReconnecting = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const subscribe = useCallback(() => {
    cleanup();

    const channel = supabase.channel(channelName);

    // Add listeners for each config using the correct typing
    configs.forEach(config => {
      const { table, schema = 'public', event = '*' } = config;
      
      channel.on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
        },
        (payload: any) => {
          const typedPayload = payload as RealtimePostgresChangesPayload<Record<string, unknown>>;
          // Route to appropriate handler
          if (typedPayload.eventType === 'INSERT' && options.onInsert) {
            options.onInsert(typedPayload);
          } else if (typedPayload.eventType === 'UPDATE' && options.onUpdate) {
            options.onUpdate(typedPayload);
          } else if (typedPayload.eventType === 'DELETE' && options.onDelete) {
            options.onDelete(typedPayload);
          }
          
          // Always call onChange if provided
          options.onChange?.(typedPayload);
        }
      );
    });

    channelRef.current = channel;

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setIsReconnecting(false);
        setRetryCount(0);
        
        if (showReconnecting && retryCount > 0) {
          toast.success('Reconnected to live updates');
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setIsConnected(false);
        
        // Log the error
        logRealtimeError(channelName, err || new Error(`Channel ${status}`));
        
        // Attempt reconnect with exponential backoff
        if (retryCount < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, retryCount), MAX_BACKOFF_MS);
          
          setIsReconnecting(true);
          
          if (showReconnecting) {
            toast.info(`Reconnecting in ${Math.round(backoffMs / 1000)}s...`, {
              duration: backoffMs - 500,
            });
          }
          
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            subscribe();
          }, backoffMs);
        } else {
          setIsReconnecting(false);
          
          if (showReconnecting) {
            toast.error('Live updates unavailable. Data will refresh on page reload.');
          }
        }
      } else if (status === 'CLOSED') {
        setIsConnected(false);
        setIsReconnecting(false);
      }
    });
  }, [channelName, configs, options, cleanup, maxRetries, retryCount, showReconnecting]);

  useEffect(() => {
    subscribe();
    return cleanup;
  }, [subscribe, cleanup]);

  const reconnect = useCallback(() => {
    setRetryCount(0);
    subscribe();
  }, [subscribe]);

  return {
    isConnected,
    isReconnecting,
    retryCount,
    reconnect,
  };
}

/**
 * Simple hook for a single table subscription
 */
export function useTableRealtime(
  table: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  options?: Omit<RealtimeOptions, 'onChange'>
) {
  return useRealtimeWithReconnect(
    `${table}-changes`,
    [{ table }],
    { ...options, onChange }
  );
}
