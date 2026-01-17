import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  X, 
  Send, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  CheckCircle2,
  Database,
  FileCheck,
  Activity,
  AlertCircle,
  Bot
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// ============================================
// TYPES - Strict contracts, no assumptions
// ============================================

interface DQChatContext {
  dataset_name: string | null;
  profiling: {
    row_count: number;
    columns: Array<{
      name: string;
      dtype: string;
      completeness: number;
      null_count: number;
      distinct_count: number;
    }>;
  } | null;
  rules: Array<{
    rule_name: string;
    dimension: string;
    severity: string;
    threshold: number;
    column_name: string | null;
  }> | null;
  execution: {
    passed_count: number;
    failed_count: number;
    critical_failure: boolean;
    circuit_breaker_tripped: boolean;
  } | null;
  incidents: Array<{
    dimension: string;
    severity: string;
    status: string;
    action: string;
  }> | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError: boolean;
  errorCode?: string;
}

type ErrorCode = 'NO_CONTEXT' | 'MODEL_UNAVAILABLE' | 'INVALID_REQUEST' | 'RATE_LIMITED' | 'UNKNOWN';

interface DQChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    profile?: {
      row_count: number;
      column_profiles: unknown;
    } | null;
    rules?: Array<{
      rule_name: string;
      dimension: string;
      severity: string;
      threshold: number;
      column_name: string | null;
    }> | null;
    execution?: {
      id: string;
      metrics: unknown[];
      summary: {
        critical_failure: boolean;
        execution_mode?: string;
      };
      circuit_breaker_tripped: boolean;
    } | null;
    incidents?: Array<{
      dimension: string;
      severity: string;
      status: string;
      action: string;
    }> | null;
    datasetName?: string;
  };
}

// ============================================
// ERROR DEFINITIONS - Error-first design
// ============================================

const ERROR_CONFIG: Record<ErrorCode, { message: string; actionLabel?: string; actionType?: string }> = {
  NO_CONTEXT: {
    message: 'No data quality data is available. Please run the DQ pipeline first.',
    actionLabel: 'Run Pipeline',
    actionType: 'run_pipeline'
  },
  MODEL_UNAVAILABLE: {
    message: 'The AI model is temporarily unavailable. Please try again in a moment.',
    actionLabel: 'Retry',
    actionType: 'retry'
  },
  INVALID_REQUEST: {
    message: 'Please enter a valid question.'
  },
  RATE_LIMITED: {
    message: 'Too many requests. Please wait a moment and try again.',
    actionLabel: 'Retry',
    actionType: 'retry'
  },
  UNKNOWN: {
    message: 'An unexpected error occurred. Please try again.',
    actionLabel: 'Retry',
    actionType: 'retry'
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function transformContext(props: DQChatPanelProps['context']): DQChatContext {
  // Transform profile
  let profiling: DQChatContext['profiling'] = null;
  if (props.profile) {
    const columnProfiles = props.profile.column_profiles;
    let columns: DQChatContext['profiling']['columns'] = [];
    
    if (Array.isArray(columnProfiles)) {
      columns = columnProfiles.map((col: unknown) => {
        const c = col as Record<string, unknown>;
        return {
          name: String(c.name || ''),
          dtype: String(c.dtype || c.data_type || 'unknown'),
          completeness: Number(c.completeness ?? 100),
          null_count: Number(c.null_count ?? 0),
          distinct_count: Number(c.distinct_count ?? 0)
        };
      });
    }
    
    profiling = {
      row_count: props.profile.row_count,
      columns
    };
  }

  // Transform execution
  let execution: DQChatContext['execution'] = null;
  if (props.execution) {
    // Compute passed/failed from metrics array
    const metrics = props.execution.metrics as Array<{ violated?: boolean }> || [];
    const failedCount = metrics.filter(m => m.violated).length;
    const passedCount = metrics.length - failedCount;
    
    execution = {
      passed_count: passedCount,
      failed_count: failedCount,
      critical_failure: Boolean(props.execution.summary?.critical_failure ?? false),
      circuit_breaker_tripped: Boolean(props.execution.circuit_breaker_tripped)
    };
  }

  return {
    dataset_name: props.datasetName || null,
    profiling,
    rules: props.rules || null,
    execution,
    incidents: props.incidents || null
  };
}

function buildContextString(context: DQChatContext): string {
  const parts: string[] = [];

  if (context.dataset_name) {
    parts.push(`Dataset: ${context.dataset_name}`);
  }

  if (context.profiling) {
    parts.push(`\nPROFILING RESULTS:`);
    parts.push(`- Total Rows: ${context.profiling.row_count.toLocaleString()}`);
    parts.push(`- Columns: ${context.profiling.columns.length}`);
    
    const lowCompleteness = context.profiling.columns.filter(c => c.completeness < 90);
    if (lowCompleteness.length > 0) {
      parts.push(`- Columns with <90% completeness: ${lowCompleteness.map(c => `${c.name} (${c.completeness.toFixed(1)}%)`).join(', ')}`);
    }
  }

  if (context.rules && context.rules.length > 0) {
    parts.push(`\nRULES:`);
    parts.push(`- Total Rules: ${context.rules.length}`);
    const bySeverity = context.rules.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(bySeverity).forEach(([sev, count]) => {
      parts.push(`- ${sev}: ${count}`);
    });
  }

  if (context.execution) {
    parts.push(`\nEXECUTION RESULTS:`);
    parts.push(`- Passed: ${context.execution.passed_count}`);
    parts.push(`- Failed: ${context.execution.failed_count}`);
    if (context.execution.critical_failure) {
      parts.push(`- ⚠️ CRITICAL FAILURE DETECTED`);
    }
    if (context.execution.circuit_breaker_tripped) {
      parts.push(`- ⚠️ CIRCUIT BREAKER TRIPPED`);
    }
  }

  if (context.incidents && context.incidents.length > 0) {
    parts.push(`\nINCIDENTS:`);
    parts.push(`- Total: ${context.incidents.length}`);
    const open = context.incidents.filter(i => i.status === 'open').length;
    if (open > 0) {
      parts.push(`- Open: ${open}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : 'No data quality context available.';
}

function getContextStatus(context: DQChatContext): { hasData: boolean; summary: string } {
  const parts: string[] = [];
  
  if (context.profiling) parts.push('Profile ✓');
  if (context.rules && context.rules.length > 0) parts.push(`${context.rules.length} Rules`);
  if (context.execution) parts.push('Execution ✓');
  if (context.incidents && context.incidents.length > 0) parts.push(`${context.incidents.length} Incidents`);

  if (parts.length === 0) {
    return { hasData: false, summary: 'No data loaded. Run the pipeline first.' };
  }

  return { hasData: true, summary: parts.join(' | ') };
}

// ============================================
// COMPONENT
// ============================================

export function DQChatPanel({ isOpen, onClose, context: rawContext }: DQChatPanelProps) {
  // State - Ephemeral by design, no persistence
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Transform raw context to strict interface
  const context = transformContext(rawContext);
  const contextStatus = getContextStatus(context);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: generateId(),
        role: 'assistant',
        content: `Hello! I'm your Data Quality Assistant.\n\nI can help you understand your data quality results, explain issues, and suggest fixes.\n\n**Note:** Chat history is not saved. Each session starts fresh.`,
        timestamp: new Date(),
        isError: false
      }]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (messageText?: string) => {
    const text = (messageText || input).trim();
    
    if (!text) return;
    
    // Clear input immediately
    setInput('');
    setLastUserMessage(text);

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      isError: false
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Check for context
    if (!contextStatus.hasData) {
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: ERROR_CONFIG.NO_CONTEXT.message,
        timestamp: new Date(),
        isError: true,
        errorCode: 'NO_CONTEXT'
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      return;
    }

    try {
      // Build history for API (last 10 messages max)
      const history = messages
        .filter(m => !m.isError)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('dq-chat', {
        body: {
          message: text,
          history,
          context: buildContextString(context)
        }
      });

      if (error) {
        throw new Error(error.message || 'Function invocation failed');
      }

      if (data.status === 'error') {
        const errorCode = data.error_code as ErrorCode || 'UNKNOWN';
        const errorMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: ERROR_CONFIG[errorCode]?.message || data.error_message || ERROR_CONFIG.UNKNOWN.message,
          timestamp: new Date(),
          isError: true,
          errorCode
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: data.answer || 'I received your message but have no response.',
          timestamp: new Date(),
          isError: false
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('[DQChatPanel] Error:', err);
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: ERROR_CONFIG.MODEL_UNAVAILABLE.message,
        timestamp: new Date(),
        isError: true,
        errorCode: 'MODEL_UNAVAILABLE'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      sendMessage(lastUserMessage);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setShowClearConfirm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderErrorAction = (errorCode?: string) => {
    if (!errorCode) return null;
    const config = ERROR_CONFIG[errorCode as ErrorCode];
    if (!config?.actionLabel) return null;

    return (
      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={config.actionType === 'retry' ? handleRetry : undefined}
      >
        {config.actionLabel}
      </Button>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[400px] bg-background border-l shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">DQ Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowClearConfirm(true)}
              disabled={messages.length === 0}
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Context Status Banner */}
        <div className={cn(
          "px-4 py-2 text-sm border-b flex items-center gap-2",
          contextStatus.hasData ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
        )}>
          {contextStatus.hasData ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">{contextStatus.summary}</span>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : message.isError
                        ? "bg-destructive/10 border border-destructive/30 text-foreground"
                        : "bg-muted text-foreground"
                  )}
                >
                  {message.isError && (
                    <div className="flex items-center gap-1 mb-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs font-medium">Error</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.isError && renderErrorAction(message.errorCode)}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data quality..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={() => sendMessage()} 
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all messages from this session. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
