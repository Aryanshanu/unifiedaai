import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
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
  AlertCircle,
  Bot,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { 
  LiveDQContext, 
  ExtractedEntities, 
  ColumnProfileInfo,
  RuleInfo,
  FailedRuleInfo,
  IncidentInfo,
  DQ_DIMENSIONS,
  CONTEXT_STALE_THRESHOLD_MS
} from '@/types/dq-assistant';

// ============================================
// TYPES
// ============================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError: boolean;
  errorCode?: string;
}

type ErrorCode = 'NO_CONTEXT' | 'MODEL_UNAVAILABLE' | 'INVALID_REQUEST' | 'RATE_LIMITED' | 'MISSING_DATA' | 'STALE_CONTEXT' | 'UNKNOWN';

interface DQChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    datasetId?: string;
    profile?: {
      id?: string;
      row_count: number;
      column_profiles: unknown;
      profile_ts?: string;
    } | null;
    rules?: Array<{
      id: string;
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
        total_rules?: number;
        passed?: number;
        failed?: number;
        critical_failure: boolean;
        execution_mode?: string;
      };
      execution_ts?: string;
    } | null;
    incidents?: Array<{
      id: string;
      dimension: string;
      severity: string;
      status: string;
      action: string;
      rule_id?: string | null;
    }> | null;
    datasetName?: string;
    trustReport?: {
      trust_score: number;
      discarded_metrics?: string[];
      inconsistencies_found?: string[];
      missing_dimensions_count?: number;
      score_breakdown?: {
        base: number;
        dimension_penalty: number;
        simulated_penalty: number;
        critical_penalty: number;
        warning_penalty: number;
      };
    } | null;
  };
}

// ============================================
// ERROR DEFINITIONS
// ============================================

const ERROR_CONFIG: Record<ErrorCode, { message: string; actionLabel?: string; actionType?: string }> = {
  NO_CONTEXT: {
    message: 'No data quality data is available. Please run the DQ pipeline first.',
    actionLabel: 'Run Pipeline',
    actionType: 'run_pipeline'
  },
  STALE_CONTEXT: {
    message: 'Pipeline data is stale (>5 min old). Please refresh or re-run the pipeline.',
    actionLabel: 'Refresh',
    actionType: 'refresh'
  },
  MISSING_DATA: {
    message: 'The required data for this question is not available in the current pipeline run.',
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
// CONSTANTS
// ============================================

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const DQ_DIMENSION_LIST = ['completeness', 'uniqueness', 'validity', 'accuracy', 'timeliness', 'consistency'];

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Transform raw context from DQControlPlane into structured LiveDQContext
 */
function buildLiveDQContext(props: DQChatPanelProps['context']): LiveDQContext {
  const now = new Date().toISOString();
  
  // Determine timestamp from latest available data
  const timestamps = [
    props.execution?.execution_ts,
    props.profile?.profile_ts
  ].filter(Boolean) as string[];
  
  const latestTimestamp = timestamps.length > 0 
    ? timestamps.sort().reverse()[0] 
    : now;

  // Build column profiles map
  let columnProfiles: Record<string, ColumnProfileInfo> = {};
  let columnCount = 0;
  
  if (props.profile?.column_profiles) {
    const rawProfiles = props.profile.column_profiles;
    
    if (Array.isArray(rawProfiles)) {
      rawProfiles.forEach((col: unknown) => {
        const c = col as Record<string, unknown>;
        const name = String(c.name || c.column_name || '');
        if (name) {
          columnProfiles[name] = {
            name,
            dtype: String(c.dtype || c.data_type || 'unknown'),
            completeness: Number(c.completeness ?? 100),
            null_count: Number(c.null_count ?? 0),
            distinct_count: Number(c.distinct_count ?? 0),
            uniqueness: Number(c.uniqueness ?? 0),
          };
        }
      });
      columnCount = rawProfiles.length;
    } else if (typeof rawProfiles === 'object') {
      Object.entries(rawProfiles).forEach(([key, val]) => {
        const c = val as Record<string, unknown>;
        columnProfiles[key] = {
          name: String(c.name || key),
          dtype: String(c.dtype || c.data_type || 'unknown'),
          completeness: Number(c.completeness ?? 100),
          null_count: Number(c.null_count ?? 0),
          distinct_count: Number(c.distinct_count ?? 0),
          uniqueness: Number(c.uniqueness ?? 0),
        };
      });
      columnCount = Object.keys(rawProfiles).length;
    }
  }

  // Build rules summary
  let rules: LiveDQContext['rules'] = undefined;
  if (props.rules && props.rules.length > 0) {
    const byDimension: Record<string, number> = {};
    let critical = 0, warning = 0, info = 0;
    
    const items: RuleInfo[] = props.rules.map(r => {
      byDimension[r.dimension] = (byDimension[r.dimension] || 0) + 1;
      if (r.severity === 'critical') critical++;
      else if (r.severity === 'warning') warning++;
      else info++;
      
      return {
        id: r.id,
        rule_name: r.rule_name,
        dimension: r.dimension,
        column_name: r.column_name,
        severity: r.severity,
        threshold: r.threshold
      };
    });
    
    rules = {
      total: props.rules.length,
      by_dimension: byDimension,
      critical,
      warning,
      info,
      items
    };
  }

  // Build execution summary with failed rules
  let execution: LiveDQContext['execution'] = undefined;
  if (props.execution) {
    const metrics = (props.execution.metrics || []) as Array<{
      rule_id?: string;
      dimension?: string;
      severity?: string;
      success_rate?: number;
      failed_count?: number;
      total_count?: number;
      threshold?: number;
      violated?: boolean;
    }>;
    
    const failedMetrics = metrics.filter(m => m.violated);
    const failedRules: FailedRuleInfo[] = failedMetrics.map(m => {
      // Find matching rule for name
      const matchingRule = props.rules?.find(r => r.id === m.rule_id);
      return {
        rule_id: m.rule_id || '',
        rule_name: matchingRule?.rule_name || 'Unknown Rule',
        dimension: m.dimension || 'unknown',
        column_name: matchingRule?.column_name || null,
        success_rate: m.success_rate || 0,
        failed_count: m.failed_count || 0,
        threshold: m.threshold || 0,
        severity: m.severity || 'info'
      };
    });

    // Calculate overall score
    const totalRules = props.execution.summary?.total_rules || metrics.length;
    const passed = props.execution.summary?.passed || (metrics.length - failedMetrics.length);
    const failed = props.execution.summary?.failed || failedMetrics.length;
    const overallScore = totalRules > 0 ? Math.round((passed / totalRules) * 100) : null;

    execution = {
      id: props.execution.id,
      total_rules: totalRules,
      passed,
      failed,
      critical_failure: Boolean(props.execution.summary?.critical_failure),
      overall_score: overallScore,
      failed_rules: failedRules
    };
  }

  // Build incidents summary
  let incidents: LiveDQContext['incidents'] = undefined;
  if (props.incidents && props.incidents.length > 0) {
    const bySeverity: Record<'P0' | 'P1' | 'P2', number> = { P0: 0, P1: 0, P2: 0 };
    let open = 0;
    
    const items: IncidentInfo[] = props.incidents.map(i => {
      const sev = i.severity as 'P0' | 'P1' | 'P2';
      if (bySeverity[sev] !== undefined) bySeverity[sev]++;
      if (i.status === 'open') open++;
      
      return {
        id: i.id,
        dimension: i.dimension,
        severity: sev,
        status: i.status,
        action: i.action,
        rule_id: i.rule_id
      };
    });
    
    incidents = { open, by_severity: bySeverity, items };
  }

  // Build governance report
  let governanceReport: LiveDQContext['governance_report'] = undefined;
  if (props.trustReport) {
    const missingDimensions: string[] = [];
    if (props.trustReport.missing_dimensions_count && props.trustReport.missing_dimensions_count > 0) {
      // Infer from inconsistencies if available
      if (props.trustReport.inconsistencies_found) {
        props.trustReport.inconsistencies_found.forEach(msg => {
          DQ_DIMENSION_LIST.forEach(dim => {
            if (msg.toLowerCase().includes(dim) && !missingDimensions.includes(dim)) {
              missingDimensions.push(dim);
            }
          });
        });
      }
    }
    
    governanceReport = {
      integrity_score: props.trustReport.trust_score,
      missing_dimensions: missingDimensions,
      inconsistencies: props.trustReport.inconsistencies_found || [],
      score_breakdown: props.trustReport.score_breakdown
    };
  }

  // Determine available/unavailable dimensions
  const availableDimensions = rules 
    ? Object.keys(rules.by_dimension)
    : [];
  const unavailableDimensions = DQ_DIMENSION_LIST.filter(
    d => !availableDimensions.includes(d)
  );

  return {
    dataset_id: props.datasetId || '',
    dataset_name: props.datasetName || null,
    pipeline_run_id: props.execution?.id || null,
    timestamp: latestTimestamp,
    profiling: props.profile ? {
      row_count: props.profile.row_count,
      column_count: columnCount,
      column_profiles: columnProfiles,
      available_dimensions: availableDimensions,
      unavailable_dimensions: unavailableDimensions
    } : undefined,
    rules,
    execution,
    incidents,
    governance_report: governanceReport
  };
}

/**
 * Extract entities (columns, rules, dimensions) from user message
 */
function extractEntities(message: string, context: LiveDQContext): ExtractedEntities {
  const msgLower = message.toLowerCase();
  
  // Get column names from profiling
  const columnNames = context.profiling 
    ? Object.keys(context.profiling.column_profiles)
    : [];
  
  // Get rule names
  const ruleNames = context.rules?.items.map(r => r.rule_name) || [];
  
  // Match columns (case-insensitive)
  const foundColumns = columnNames.filter(c => 
    msgLower.includes(c.toLowerCase())
  );
  
  // Match rules (case-insensitive, partial match)
  const foundRules = ruleNames.filter(r => 
    msgLower.includes(r.toLowerCase())
  );
  
  // Match dimensions
  const foundDimensions = DQ_DIMENSION_LIST.filter(d => 
    msgLower.includes(d)
  );
  
  // Match severities
  const severities: string[] = [];
  if (msgLower.includes('critical') || msgLower.includes('p0')) severities.push('critical');
  if (msgLower.includes('warning') || msgLower.includes('p1')) severities.push('warning');
  if (msgLower.includes('info') || msgLower.includes('p2')) severities.push('info');
  
  // Match pipeline steps
  const steps: string[] = [];
  if (msgLower.includes('profil')) steps.push('profiling');
  if (msgLower.includes('rule')) steps.push('rules');
  if (msgLower.includes('execut')) steps.push('execution');
  if (msgLower.includes('incident')) steps.push('incidents');
  if (msgLower.includes('dashboard') || msgLower.includes('asset')) steps.push('dashboard');
  
  return {
    columns: foundColumns,
    rules: foundRules,
    dimensions: foundDimensions,
    severities,
    steps
  };
}

/**
 * Check if context is stale (>5 minutes old)
 */
function isContextStale(timestamp: string): boolean {
  const contextTime = new Date(timestamp).getTime();
  const now = Date.now();
  return (now - contextTime) > STALE_THRESHOLD_MS;
}

/**
 * Get context status for the UI banner
 */
function getContextStatus(context: LiveDQContext): { 
  hasData: boolean; 
  summary: string;
  isStale: boolean;
  contextAge: string;
} {
  const parts: string[] = [];
  
  if (context.profiling) {
    parts.push(`${context.profiling.row_count.toLocaleString()} rows`);
  }
  if (context.rules && context.rules.total > 0) {
    parts.push(`${context.rules.total} rules`);
  }
  if (context.execution) {
    const score = context.execution.overall_score;
    parts.push(score !== null ? `Score: ${score}%` : 'Executed');
  }
  if (context.incidents && context.incidents.open > 0) {
    parts.push(`${context.incidents.open} open incidents`);
  }

  const hasData = parts.length > 0;
  const isStale = hasData && isContextStale(context.timestamp);
  
  // Calculate age
  let contextAge = '';
  if (hasData) {
    const ageMs = Date.now() - new Date(context.timestamp).getTime();
    const ageSec = Math.floor(ageMs / 1000);
    if (ageSec < 60) contextAge = `${ageSec}s ago`;
    else if (ageSec < 3600) contextAge = `${Math.floor(ageSec / 60)}m ago`;
    else contextAge = `${Math.floor(ageSec / 3600)}h ago`;
  }

  if (!hasData) {
    return { hasData: false, summary: 'No data loaded. Run the pipeline first.', isStale: false, contextAge: '' };
  }

  return { hasData: true, summary: parts.join(' | '), isStale, contextAge };
}

// ============================================
// COMPONENT
// ============================================

export function DQChatPanel({ isOpen, onClose, context: rawContext }: DQChatPanelProps) {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build structured context
  const context = useMemo(() => buildLiveDQContext(rawContext), [rawContext]);
  const contextStatus = useMemo(() => getContextStatus(context), [context]);

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
        content: `Hello! I'm your **Data Quality Governance Assistant** for the Fractal Unified Governance Platform.\n\nI can help you understand your data quality results, explain issues, and suggest remediations.\n\n**Important:** I only answer based on the current pipeline data. I will never guess or fabricate metrics.\n\nChat history is not saved between sessions.`,
        timestamp: new Date(),
        isError: false
      }]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text) return;
    
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
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: ERROR_CONFIG.NO_CONTEXT.message,
        timestamp: new Date(),
        isError: true,
        errorCode: 'NO_CONTEXT'
      }]);
      setIsLoading(false);
      return;
    }

    // Check for stale context (warn but allow)
    if (contextStatus.isStale) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `⚠️ **Warning:** Pipeline data is ${contextStatus.contextAge} old. Results may not reflect the current state.\n\nProceeding with available data...`,
        timestamp: new Date(),
        isError: false
      }]);
    }

    try {
      // Extract entities from user message
      const extractedEntities = extractEntities(text, context);
      
      // Build history (last 10 messages)
      const history = messages
        .filter(m => !m.isError)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      // Call governance-grade edge function
      const { data, error } = await supabase.functions.invoke('dq-chat', {
        body: {
          message: text,
          history,
          context,
          extracted_entities: extractedEntities
        }
      });

      if (error) {
        throw new Error(error.message || 'Function invocation failed');
      }

      if (data.status === 'error') {
        const errorCode = data.error_code as ErrorCode || 'UNKNOWN';
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: ERROR_CONFIG[errorCode]?.message || data.error_message || ERROR_CONFIG.UNKNOWN.message,
          timestamp: new Date(),
          isError: true,
          errorCode
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: data.answer || 'I received your message but have no response.',
          timestamp: new Date(),
          isError: false
        }]);
      }
    } catch (err) {
      console.error('[DQChatPanel] Error:', err);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: ERROR_CONFIG.MODEL_UNAVAILABLE.message,
        timestamp: new Date(),
        isError: true,
        errorCode: 'MODEL_UNAVAILABLE'
      }]);
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
      {/* Mobile backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-[55] sm:hidden" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] max-w-full bg-background border-l shadow-xl z-[60] flex flex-col isolate">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">DQ Governance Assistant</span>
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
          !contextStatus.hasData ? "bg-warning/10 text-warning" :
          contextStatus.isStale ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" :
          "bg-success/10 text-success"
        )}>
          {!contextStatus.hasData ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : contextStatus.isStale ? (
            <Clock className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate flex-1">{contextStatus.summary}</span>
          {contextStatus.contextAge && (
            <Badge variant="outline" className="text-xs shrink-0">
              {contextStatus.contextAge}
            </Badge>
          )}
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
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm overflow-hidden",
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
                  {/* Render markdown for assistant messages, plain text for user */}
                  {message.role === 'assistant' && !message.isError ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <ReactMarkdown
                        components={{
                          h2: ({children}) => <h2 className="text-sm font-bold mt-3 mb-1 text-foreground first:mt-0">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
                          ul: ({children}) => <ul className="list-disc list-inside my-1 space-y-0.5 pl-0">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside my-1 space-y-0.5 pl-0">{children}</ol>,
                          li: ({children}) => <li className="text-sm leading-relaxed">{children}</li>,
                          p: ({children}) => <p className="my-1 leading-relaxed">{children}</p>,
                          strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                          code: ({children}) => <code className="bg-background/50 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                          hr: () => <hr className="my-2 border-border" />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  )}
                  {message.isError && renderErrorAction(message.errorCode)}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Analyzing...</span>
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
