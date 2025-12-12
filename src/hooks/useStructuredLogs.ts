import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger, StructuredLog, LogLevel } from '@/lib/structured-logger';

export interface LogFilters {
  search: string;
  levels: LogLevel[];
  categories: string[];
  tags: string[];
  timeRange: '5m' | '15m' | '1h' | '24h' | 'all';
}

export function useStructuredLogs() {
  const [logs, setLogs] = useState<StructuredLog[]>(() => logger.getLogs());
  const [isPaused, setIsPaused] = useState(false);
  const [filters, setFilters] = useState<LogFilters>({
    search: '',
    levels: [],
    categories: [],
    tags: [],
    timeRange: 'all',
  });

  useEffect(() => {
    if (isPaused) return;

    const unsubscribe = logger.subscribe((newLog) => {
      setLogs(prev => [newLog, ...prev].slice(0, 2000));
    });

    return unsubscribe;
  }, [isPaused]);

  const clearLogs = useCallback(() => {
    logger.clear();
    setLogs([]);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const refreshLogs = useCallback(() => {
    setLogs(logger.getLogs());
  }, []);

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const timeRanges: Record<string, number> = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      'all': Infinity,
    };

    return logs.filter(log => {
      // Time range filter
      if (filters.timeRange !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        if (now - logTime > timeRanges[filters.timeRange]) return false;
      }

      // Level filter
      if (filters.levels.length > 0 && !filters.levels.includes(log.level)) {
        return false;
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(log.category)) {
        return false;
      }

      // Tag filter
      if (filters.tags.length > 0 && !filters.tags.some(t => log.tags.includes(t))) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches =
          log.message.toLowerCase().includes(searchLower) ||
          log.category.toLowerCase().includes(searchLower) ||
          log.source.toLowerCase().includes(searchLower) ||
          log.tags.some(t => t.toLowerCase().includes(searchLower)) ||
          JSON.stringify(log.metadata).toLowerCase().includes(searchLower);
        if (!matches) return false;
      }

      return true;
    });
  }, [logs, filters]);

  const stats = useMemo(() => logger.getStats(), [logs]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    logs.forEach(l => cats.add(l.category));
    return Array.from(cats).sort();
  }, [logs]);

  const tags = useMemo(() => {
    const allTags = new Set<string>();
    logs.forEach(l => l.tags.forEach(t => allTags.add(t)));
    return Array.from(allTags).sort();
  }, [logs]);

  const exportLogs = useCallback((format: 'json' | 'ndjson' = 'json') => {
    const data = format === 'json' ? logger.exportJSON() : logger.exportNDJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'ndjson'}`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    logs: filteredLogs,
    allLogs: logs,
    isPaused,
    filters,
    setFilters,
    clearLogs,
    togglePause,
    refreshLogs,
    stats,
    categories,
    tags,
    exportLogs,
  };
}
