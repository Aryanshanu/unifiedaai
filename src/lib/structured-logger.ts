// Centralized Structured Logging System
// Enterprise-grade logging with levels, structured JSON format, and real-time tracking

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface StructuredLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  source: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId: string;
  duration?: number;
  metadata: Record<string, any>;
  tags: string[];
}

export interface LogConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enablePersistence: boolean;
  maxLogs: number;
  retentionDays: number;
}

type LogSubscriber = (log: StructuredLog) => void;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4,
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: '#6B7280',
  INFO: '#3B82F6',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  CRITICAL: '#DC2626',
};

class StructuredLogger {
  private static instance: StructuredLogger;
  private logs: StructuredLog[] = [];
  private subscribers: Set<LogSubscriber> = new Set();
  private sessionId: string;
  private config: LogConfig = {
    minLevel: 'DEBUG',
    enableConsole: true,
    enablePersistence: true,
    maxLogs: 2000,
    retentionDays: 7,
  };

  private constructor() {
    this.sessionId = this.generateId();
    this.interceptFetch();
    this.interceptConsole();
    this.trackNavigation();
    this.trackErrors();
    this.trackPerformance();
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  private formatForConsole(log: StructuredLog): void {
    // Console output disabled for performance -- console.group/log calls
    // are synchronous and block the main thread. Logs are kept in-memory
    // and accessible via the observability page / useStructuredLogs hook.
    // To re-enable for debugging, uncomment the block below.
    return;

    /*
    if (!this.config.enableConsole) return;
    const style = `color: ${LOG_LEVEL_COLORS[log.level]}; font-weight: bold;`;
    const date = new Date(log.timestamp);
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    const timestamp = date.toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    }) + `.${ms}`;
    console.groupCollapsed(`%c[${log.level}]%c ${timestamp} | ${log.category} | ${log.message}`, style, 'color: inherit;');
    console.log('📋 Full Log:', log);
    if (Object.keys(log.metadata).length > 0) console.log('📦 Metadata:', log.metadata);
    if (log.tags.length > 0) console.log('🏷️ Tags:', log.tags);
    console.groupEnd();
    */
  }

  private interceptFetch(): void {
    const originalFetch = window.fetch;
    const logger = this;

    window.fetch = async function (...args) {
      const [url, options] = args;
      const urlString = typeof url === 'string' ? url : url.toString();
      const method = options?.method || 'GET';
      const startTime = performance.now();
      const traceId = logger.generateId();

      // Skip logging for certain internal requests
      if (urlString.includes('supabase') && urlString.includes('realtime')) {
        return originalFetch.apply(this, args);
      }

      const endpoint = urlString.split('?')[0].split('/').pop() || 'unknown';

      logger.log('DEBUG', 'Network', `${method} ${endpoint}`, 'fetch', {
        url: urlString,
        method,
        hasBody: !!options?.body,
        traceId,
      }, ['network', 'outbound']);

      try {
        const response = await originalFetch.apply(this, args);
        const duration = Math.round(performance.now() - startTime);

        const level: LogLevel = response.ok ? 'INFO' : 'ERROR';
        logger.log(level, 'Network', `${method} ${endpoint} → ${response.status}`, 'fetch', {
          url: urlString,
          method,
          statusCode: response.status,
          statusText: response.statusText,
          duration,
          traceId,
        }, ['network', 'response', response.ok ? 'success' : 'failure']);

        return response;
      } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        logger.log('ERROR', 'Network', `${method} ${endpoint} → FAILED`, 'fetch', {
          url: urlString,
          method,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
          traceId,
        }, ['network', 'error', 'exception']);
        throw error;
      }
    };
  }

  private interceptConsole(): void {
    const logger = this;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = function (...args) {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      // Avoid recursion from our own logs
      if (!message.includes('[CRITICAL]') && !message.includes('[ERROR]')) {
        logger.log('ERROR', 'Console', message.slice(0, 200), 'console.error', {
          fullMessage: message,
          args: args.length,
        }, ['console', 'error']);
      }
      originalError.apply(console, args);
    };

    console.warn = function (...args) {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      if (!message.includes('[WARNING]')) {
        logger.log('WARNING', 'Console', message.slice(0, 200), 'console.warn', {
          fullMessage: message,
        }, ['console', 'warning']);
      }
      originalWarn.apply(console, args);
    };
  }

  private trackNavigation(): void {
    if (typeof window === 'undefined') return;

    const logger = this;
    let lastPath = window.location.pathname;

    // Track initial page load
    logger.log('INFO', 'Navigation', `Page loaded: ${lastPath}`, 'router', {
      path: lastPath,
      referrer: document.referrer,
      userAgent: navigator.userAgent.slice(0, 100),
    }, ['navigation', 'pageload']);

    // Track route changes (for SPA)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      const newPath = window.location.pathname;
      if (newPath !== lastPath) {
        logger.log('INFO', 'Navigation', `Navigate: ${lastPath} → ${newPath}`, 'router', {
          from: lastPath,
          to: newPath,
        }, ['navigation', 'route-change']);
        lastPath = newPath;
      }
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      const newPath = window.location.pathname;
      if (newPath !== lastPath) {
        logger.log('INFO', 'Navigation', `Replace: ${lastPath} → ${newPath}`, 'router', {
          from: lastPath,
          to: newPath,
        }, ['navigation', 'replace']);
        lastPath = newPath;
      }
      return result;
    };

    window.addEventListener('popstate', () => {
      const newPath = window.location.pathname;
      if (newPath !== lastPath) {
        logger.log('INFO', 'Navigation', `Back/Forward: ${lastPath} → ${newPath}`, 'router', {
          from: lastPath,
          to: newPath,
        }, ['navigation', 'popstate']);
        lastPath = newPath;
      }
    });
  }

  private trackErrors(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.log('CRITICAL', 'Runtime', event.message, 'window.error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      }, ['error', 'uncaught', 'runtime']);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.log('CRITICAL', 'Promise', 'Unhandled Promise Rejection', 'promise.rejection', {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
      }, ['error', 'promise', 'unhandled']);
    });
  }

  private trackPerformance(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    // Track long tasks
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.log('WARNING', 'Performance', `Long task detected: ${Math.round(entry.duration)}ms`, 'performance', {
              duration: entry.duration,
              startTime: entry.startTime,
              entryType: entry.entryType,
            }, ['performance', 'long-task']);
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch {
      // Long task observer not supported
    }

    // Track largest contentful paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.log('INFO', 'Performance', `LCP: ${Math.round(lastEntry.startTime)}ms`, 'performance', {
          lcp: lastEntry.startTime,
          element: (lastEntry as any).element?.tagName,
        }, ['performance', 'lcp', 'core-web-vital']);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {
      // LCP observer not supported
    }
  }

  // Main logging method
  log(
    level: LogLevel,
    category: string,
    message: string,
    source: string,
    metadata: Record<string, any> = {},
    tags: string[] = []
  ): StructuredLog {
    if (!this.shouldLog(level)) {
      return {} as StructuredLog;
    }

    const log: StructuredLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      source,
      sessionId: this.sessionId,
      metadata,
      tags: [...tags, level.toLowerCase()],
    };

    this.logs.unshift(log);

    // Trim to max logs
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(0, this.config.maxLogs);
    }

    // Notify subscribers
    this.subscribers.forEach(sub => sub(log));

    // Console output for development
    this.formatForConsole(log);

    return log;
  }

  // Convenience methods for each level
  debug(category: string, message: string, source: string = 'app', metadata: Record<string, any> = {}, tags: string[] = []): StructuredLog {
    return this.log('DEBUG', category, message, source, metadata, [...tags, 'debug']);
  }

  info(category: string, message: string, source: string = 'app', metadata: Record<string, any> = {}, tags: string[] = []): StructuredLog {
    return this.log('INFO', category, message, source, metadata, [...tags, 'info']);
  }

  warn(category: string, message: string, source: string = 'app', metadata: Record<string, any> = {}, tags: string[] = []): StructuredLog {
    return this.log('WARNING', category, message, source, metadata, [...tags, 'warning']);
  }

  error(category: string, message: string, source: string = 'app', metadata: Record<string, any> = {}, tags: string[] = []): StructuredLog {
    return this.log('ERROR', category, message, source, metadata, [...tags, 'error']);
  }

  critical(category: string, message: string, source: string = 'app', metadata: Record<string, any> = {}, tags: string[] = []): StructuredLog {
    return this.log('CRITICAL', category, message, source, metadata, [...tags, 'critical']);
  }

  // Subscribe to new logs
  subscribe(callback: LogSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Get all logs
  getLogs(): StructuredLog[] {
    return [...this.logs];
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel): StructuredLog[] {
    return this.logs.filter(l => l.level === level);
  }

  // Get logs by category
  getLogsByCategory(category: string): StructuredLog[] {
    return this.logs.filter(l => l.category === category);
  }

  // Get logs by tag
  getLogsByTag(tag: string): StructuredLog[] {
    return this.logs.filter(l => l.tags.includes(tag));
  }

  // Clear logs
  clear(): void {
    this.logs = [];
  }

  // Update config
  setConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get stats
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    last5Min: number;
    errorsLast1h: number;
  } {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    const byLevel = { DEBUG: 0, INFO: 0, WARNING: 0, ERROR: 0, CRITICAL: 0 };
    const byCategory: Record<string, number> = {};
    let last5Min = 0;
    let errorsLast1h = 0;

    for (const log of this.logs) {
      byLevel[log.level]++;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;

      const logTime = new Date(log.timestamp).getTime();
      if (logTime > fiveMinAgo) last5Min++;
      if (logTime > oneHourAgo && (log.level === 'ERROR' || log.level === 'CRITICAL')) {
        errorsLast1h++;
      }
    }

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      last5Min,
      errorsLast1h,
    };
  }

  // Export logs as JSON
  exportJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Export logs as NDJSON (for log aggregators)
  exportNDJSON(): string {
    return this.logs.map(log => JSON.stringify(log)).join('\n');
  }
}

export const logger = StructuredLogger.getInstance();

// Export convenience functions
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logCritical = logger.critical.bind(logger);
