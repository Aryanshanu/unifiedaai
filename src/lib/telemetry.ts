// OpenTelemetry-style instrumentation for the RAI platform
// This provides tracing and performance monitoring across the application

interface Span {
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, string | number | boolean>;
  events: { name: string; timestamp: number; attributes?: Record<string, any> }[];
  status: 'ok' | 'error' | 'unset';
  parentSpanId?: string;
}

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

// Generate random trace/span IDs
const generateId = (length: number = 16): string => {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

// Active spans storage
const activeSpans = new Map<string, Span>();
const completedSpans: Span[] = [];

// Current trace context
let currentContext: TraceContext | null = null;

export class Telemetry {
  private static instance: Telemetry;
  private serviceName: string = 'fractal-rai-platform';
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(): Telemetry {
    if (!Telemetry.instance) {
      Telemetry.instance = new Telemetry();
    }
    return Telemetry.instance;
  }

  // Start a new trace
  startTrace(name: string): TraceContext {
    const traceId = generateId(32);
    const spanId = generateId(16);
    
    currentContext = { traceId, spanId };
    
    this.startSpan(name);
    
    return currentContext;
  }

  // Start a new span within current trace
  startSpan(name: string, attributes: Record<string, any> = {}): string {
    const spanId = generateId(16);
    const span: Span = {
      name,
      startTime: performance.now(),
      attributes: {
        'service.name': this.serviceName,
        ...attributes,
      },
      events: [],
      status: 'unset',
      parentSpanId: currentContext?.spanId,
    };
    
    activeSpans.set(spanId, span);
    
    if (this.enabled) {
      console.debug(`[OTEL] Span started: ${name}`, { spanId, traceId: currentContext?.traceId });
    }
    
    return spanId;
  }

  // End a span
  endSpan(spanId: string, status: 'ok' | 'error' = 'ok', attributes: Record<string, any> = {}): void {
    const span = activeSpans.get(spanId);
    if (!span) return;
    
    span.endTime = performance.now();
    span.status = status;
    Object.assign(span.attributes, attributes);
    
    const duration = span.endTime - span.startTime;
    
    if (this.enabled) {
      console.debug(`[OTEL] Span ended: ${span.name}`, { 
        spanId, 
        duration: `${duration.toFixed(2)}ms`,
        status,
      });
    }
    
    activeSpans.delete(spanId);
    completedSpans.push(span);
    
    // Keep only last 100 spans
    if (completedSpans.length > 100) {
      completedSpans.shift();
    }
  }

  // Add an event to a span
  addEvent(spanId: string, name: string, attributes?: Record<string, any>): void {
    const span = activeSpans.get(spanId);
    if (!span) return;
    
    span.events.push({
      name,
      timestamp: performance.now(),
      attributes,
    });
  }

  // Set span attributes
  setAttributes(spanId: string, attributes: Record<string, any>): void {
    const span = activeSpans.get(spanId);
    if (!span) return;
    
    Object.assign(span.attributes, attributes);
  }

  // Record an exception
  recordException(spanId: string, error: Error): void {
    const span = activeSpans.get(spanId);
    if (!span) return;
    
    span.events.push({
      name: 'exception',
      timestamp: performance.now(),
      attributes: {
        'exception.type': error.name,
        'exception.message': error.message,
        'exception.stacktrace': error.stack || '',
      },
    });
    span.status = 'error';
  }

  // Get current trace context for propagation
  getTraceContext(): TraceContext | null {
    return currentContext;
  }

  // Create traceparent header for HTTP propagation
  getTraceparentHeader(): string | null {
    if (!currentContext) return null;
    return `00-${currentContext.traceId}-${currentContext.spanId}-01`;
  }

  // Get completed spans for debugging
  getCompletedSpans(): Span[] {
    return [...completedSpans];
  }

  // Clear completed spans
  clearSpans(): void {
    completedSpans.length = 0;
  }

  // Enable/disable telemetry
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Export singleton instance
export const telemetry = Telemetry.getInstance();

// React hook for component-level instrumentation
export function useComponentTrace(componentName: string) {
  const spanId = telemetry.startSpan(`component.${componentName}`, {
    'component.name': componentName,
    'component.type': 'react',
  });

  return {
    spanId,
    addEvent: (name: string, attrs?: Record<string, any>) => telemetry.addEvent(spanId, name, attrs),
    setAttributes: (attrs: Record<string, any>) => telemetry.setAttributes(spanId, attrs),
    end: (status?: 'ok' | 'error') => telemetry.endSpan(spanId, status),
  };
}

// Helper to trace async operations
export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes: Record<string, any> = {}
): Promise<T> {
  const spanId = telemetry.startSpan(name, attributes);
  
  try {
    const result = await fn();
    telemetry.endSpan(spanId, 'ok');
    return result;
  } catch (error) {
    if (error instanceof Error) {
      telemetry.recordException(spanId, error);
    }
    telemetry.endSpan(spanId, 'error');
    throw error;
  }
}

// Helper to trace sync operations
export function traceSync<T>(
  name: string,
  fn: () => T,
  attributes: Record<string, any> = {}
): T {
  const spanId = telemetry.startSpan(name, attributes);
  
  try {
    const result = fn();
    telemetry.endSpan(spanId, 'ok');
    return result;
  } catch (error) {
    if (error instanceof Error) {
      telemetry.recordException(spanId, error);
    }
    telemetry.endSpan(spanId, 'error');
    throw error;
  }
}

// Performance marks for key user interactions
export function markInteraction(name: string, attributes: Record<string, any> = {}): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`rai-${name}`, { detail: attributes });
  }
  telemetry.startSpan(`interaction.${name}`, {
    'interaction.type': name,
    ...attributes,
  });
}

// Page load instrumentation
export function instrumentPageLoad(pageName: string): () => void {
  const spanId = telemetry.startSpan(`page.load.${pageName}`, {
    'page.name': pageName,
    'page.url': typeof window !== 'undefined' ? window.location.pathname : '',
  });
  
  return () => {
    telemetry.endSpan(spanId, 'ok', {
      'page.load.complete': true,
    });
  };
}
