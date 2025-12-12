// Global Activity Logger - Captures ALL actions and responses across the platform

export interface ActivityLog {
  id: string;
  timestamp: Date;
  type: 'action' | 'response' | 'error' | 'navigation' | 'api_call' | 'db_change' | 'user_input';
  category: string;
  action: string;
  details: Record<string, any>;
  status: 'pending' | 'success' | 'error';
  duration?: number;
  userId?: string;
  sessionId: string;
}

type LogSubscriber = (log: ActivityLog) => void;

class ActivityLogger {
  private static instance: ActivityLogger;
  private logs: ActivityLog[] = [];
  private subscribers: Set<LogSubscriber> = new Set();
  private sessionId: string;
  private maxLogs: number = 1000;

  private constructor() {
    this.sessionId = this.generateId();
    this.interceptFetch();
    this.interceptConsole();
  }

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Intercept all fetch calls to log API requests
  private interceptFetch(): void {
    const originalFetch = window.fetch;
    const logger = this;

    window.fetch = async function (...args) {
      const [url, options] = args;
      const urlString = typeof url === 'string' ? url : url.toString();
      const method = options?.method || 'GET';
      const startTime = Date.now();

      // Log the request
      const requestLog = logger.log({
        type: 'api_call',
        category: 'Network',
        action: `${method} ${urlString.split('?')[0].split('/').pop() || urlString}`,
        details: {
          url: urlString,
          method,
          hasBody: !!options?.body,
        },
        status: 'pending',
      });

      try {
        const response = await originalFetch.apply(this, args);
        const duration = Date.now() - startTime;

        // Update with response
        logger.updateLog(requestLog.id, {
          status: response.ok ? 'success' : 'error',
          duration,
          details: {
            ...requestLog.details,
            statusCode: response.status,
            statusText: response.statusText,
          },
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.updateLog(requestLog.id, {
          status: 'error',
          duration,
          details: {
            ...requestLog.details,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        throw error;
      }
    };
  }

  // Intercept console.error to capture errors
  private interceptConsole(): void {
    const originalError = console.error;
    const logger = this;

    console.error = function (...args) {
      logger.log({
        type: 'error',
        category: 'Console',
        action: 'Console Error',
        details: {
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '),
        },
        status: 'error',
      });
      originalError.apply(console, args);
    };
  }

  // Main logging method
  log(entry: Omit<ActivityLog, 'id' | 'timestamp' | 'sessionId'>): ActivityLog {
    const log: ActivityLog = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
    };

    this.logs.unshift(log);

    // Trim to max logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Notify subscribers
    this.subscribers.forEach(sub => sub(log));

    return log;
  }

  // Update an existing log
  updateLog(id: string, updates: Partial<ActivityLog>): void {
    const index = this.logs.findIndex(l => l.id === id);
    if (index !== -1) {
      this.logs[index] = { ...this.logs[index], ...updates };
      this.subscribers.forEach(sub => sub(this.logs[index]));
    }
  }

  // Subscribe to new logs
  subscribe(callback: LogSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Get all logs
  getLogs(): ActivityLog[] {
    return [...this.logs];
  }

  // Clear logs
  clear(): void {
    this.logs = [];
  }

  // Helper methods for common actions
  logAction(category: string, action: string, details: Record<string, any> = {}): ActivityLog {
    return this.log({
      type: 'action',
      category,
      action,
      details,
      status: 'success',
    });
  }

  logNavigation(from: string, to: string): ActivityLog {
    return this.log({
      type: 'navigation',
      category: 'Navigation',
      action: `Navigate to ${to}`,
      details: { from, to },
      status: 'success',
    });
  }

  logUserInput(field: string, value: any): ActivityLog {
    return this.log({
      type: 'user_input',
      category: 'User Input',
      action: `Input: ${field}`,
      details: { field, valueLength: typeof value === 'string' ? value.length : undefined },
      status: 'success',
    });
  }

  logDbChange(table: string, operation: string, data: any): ActivityLog {
    return this.log({
      type: 'db_change',
      category: 'Database',
      action: `${operation} on ${table}`,
      details: { table, operation, recordId: data?.id },
      status: 'success',
    });
  }

  logError(category: string, error: Error | string, details: Record<string, any> = {}): ActivityLog {
    return this.log({
      type: 'error',
      category,
      action: typeof error === 'string' ? error : error.message,
      details: {
        ...details,
        stack: error instanceof Error ? error.stack : undefined,
      },
      status: 'error',
    });
  }

  logResponse(category: string, action: string, response: any, success: boolean): ActivityLog {
    return this.log({
      type: 'response',
      category,
      action,
      details: { response },
      status: success ? 'success' : 'error',
    });
  }
}

export const activityLogger = ActivityLogger.getInstance();

// Export convenience functions
export const logAction = activityLogger.logAction.bind(activityLogger);
export const logNavigation = activityLogger.logNavigation.bind(activityLogger);
export const logUserInput = activityLogger.logUserInput.bind(activityLogger);
export const logDbChange = activityLogger.logDbChange.bind(activityLogger);
export const logError = activityLogger.logError.bind(activityLogger);
export const logResponse = activityLogger.logResponse.bind(activityLogger);
