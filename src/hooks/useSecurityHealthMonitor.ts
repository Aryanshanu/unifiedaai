 import { useState, useCallback, useEffect } from 'react';
 import { logApiError } from '@/lib/error-logger';
 
 export interface HealthEntry {
   timestamp: string;
   event: string;
   status: 'success' | 'error' | 'warning';
   metadata?: Record<string, unknown>;
 }
 
 export interface SecurityHealthMetrics {
   totalOperations: number;
   successCount: number;
   errorCount: number;
   successRate: number;
   lastError: HealthEntry | null;
   componentHealth: Record<string, { mountCount: number; unmountCount: number }>;
 }
 
 const MAX_LOG_ENTRIES = 100;
 
 /**
  * Self-healing health monitor for the Security module.
  * Tracks component lifecycle, function success rates, and provides early detection of issues.
  */
 export function useSecurityHealthMonitor(componentName?: string) {
   const [healthLog, setHealthLog] = useState<HealthEntry[]>([]);
   const [metrics, setMetrics] = useState<SecurityHealthMetrics>({
     totalOperations: 0,
     successCount: 0,
     errorCount: 0,
     successRate: 100,
     lastError: null,
     componentHealth: {},
   });
 
   const logEvent = useCallback((
     event: string, 
     status: 'success' | 'error' | 'warning', 
     metadata?: Record<string, unknown>
   ) => {
     const entry: HealthEntry = {
       timestamp: new Date().toISOString(),
       event,
       status,
       metadata,
     };
 
     setHealthLog(prev => {
       const newLog = [...prev.slice(-(MAX_LOG_ENTRIES - 1)), entry];
       return newLog;
     });
 
     setMetrics(prev => {
       const newTotal = prev.totalOperations + 1;
       const newSuccess = status === 'success' ? prev.successCount + 1 : prev.successCount;
       const newError = status === 'error' ? prev.errorCount + 1 : prev.errorCount;
       
       return {
         ...prev,
         totalOperations: newTotal,
         successCount: newSuccess,
         errorCount: newError,
         successRate: newTotal > 0 ? (newSuccess / newTotal) * 100 : 100,
         lastError: status === 'error' ? entry : prev.lastError,
       };
     });
 
     // Log errors to backend for persistence
     if (status === 'error') {
       logApiError('security_health', new Error(event), metadata);
     }
 
     // Console log for debugging
     const prefix = status === 'error' ? '❌' : status === 'warning' ? '⚠️' : '✅';
     console.log(`[SecurityHealth] ${prefix} ${event}`, metadata || '');
   }, []);
 
   // Track component lifecycle
   useEffect(() => {
     if (componentName) {
       logEvent('component_mounted', 'success', { component: componentName });
       
       setMetrics(prev => ({
         ...prev,
         componentHealth: {
           ...prev.componentHealth,
           [componentName]: {
             mountCount: (prev.componentHealth[componentName]?.mountCount || 0) + 1,
             unmountCount: prev.componentHealth[componentName]?.unmountCount || 0,
           },
         },
       }));
 
       return () => {
         logEvent('component_unmounted', 'success', { component: componentName });
         
         setMetrics(prev => ({
           ...prev,
           componentHealth: {
             ...prev.componentHealth,
             [componentName]: {
               mountCount: prev.componentHealth[componentName]?.mountCount || 1,
               unmountCount: (prev.componentHealth[componentName]?.unmountCount || 0) + 1,
             },
           },
         }));
       };
     }
   }, [componentName, logEvent]);
 
   /**
    * Wrap an async operation with health tracking
    */
   const trackOperation = useCallback(async <T>(
     operationName: string,
     operation: () => Promise<T>,
     options?: { 
       retries?: number; 
       retryDelay?: number;
       onRetry?: (attempt: number) => void;
     }
   ): Promise<T> => {
     const { retries = 0, retryDelay = 1000, onRetry } = options || {};
     let lastError: Error | null = null;
 
     for (let attempt = 0; attempt <= retries; attempt++) {
       try {
         if (attempt > 0) {
           logEvent(`${operationName}_retry`, 'warning', { attempt });
           onRetry?.(attempt);
           await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
         }
 
         const result = await operation();
         logEvent(`${operationName}_success`, 'success', { attempt });
         return result;
       } catch (error) {
         lastError = error instanceof Error ? error : new Error(String(error));
         logEvent(`${operationName}_failed`, 'error', { 
           attempt, 
           error: lastError.message,
           willRetry: attempt < retries,
         });
       }
     }
 
     throw lastError;
   }, [logEvent]);
 
   /**
    * Get health status summary
    */
   const getHealthStatus = useCallback((): 'healthy' | 'degraded' | 'unhealthy' => {
     if (metrics.successRate >= 95) return 'healthy';
     if (metrics.successRate >= 75) return 'degraded';
     return 'unhealthy';
   }, [metrics.successRate]);
 
   return {
     healthLog,
     metrics,
     logEvent,
     trackOperation,
     getHealthStatus,
   };
 }