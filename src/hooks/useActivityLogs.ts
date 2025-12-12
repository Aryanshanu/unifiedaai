import { useState, useEffect, useCallback } from 'react';
import { activityLogger, ActivityLog } from '@/lib/activity-logger';

export function useActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>(() => activityLogger.getLogs());
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const unsubscribe = activityLogger.subscribe((newLog) => {
      setLogs(prev => {
        // Check if this is an update to an existing log
        const existingIndex = prev.findIndex(l => l.id === newLog.id);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = newLog;
          return updated;
        }
        // New log - add to beginning
        return [newLog, ...prev].slice(0, 500);
      });
    });

    return unsubscribe;
  }, [isPaused]);

  const clearLogs = useCallback(() => {
    activityLogger.clear();
    setLogs([]);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const refreshLogs = useCallback(() => {
    setLogs(activityLogger.getLogs());
  }, []);

  return {
    logs,
    isPaused,
    clearLogs,
    togglePause,
    refreshLogs,
  };
}
