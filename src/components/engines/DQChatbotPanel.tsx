import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageCircle,
  Send,
  X,
  ChevronRight,
  Bot,
  User,
  Sparkles,
  Database,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { DQProfile, DQRule, DQExecution, DQIncident } from '@/hooks/useDQControlPlane';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface DQContext {
  profile?: DQProfile | null;
  rules?: DQRule[];
  execution?: DQExecution | null;
  incidents?: DQIncident[];
  datasetName?: string;
}

interface DQChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: DQContext;
}

const QUICK_ACTIONS = [
  { label: 'Main issues?', prompt: 'What are the main data quality issues in this dataset?' },
  { label: 'Low scores?', prompt: 'Why are some dimension scores low?' },
  { label: 'Missing values?', prompt: 'Which columns have the most missing values?' },
  { label: 'Fix suggestions', prompt: 'What fixes do you recommend for the failed rules?' },
];

export function DQChatbotPanel({ isOpen, onClose, context }: DQChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Build context summary for the AI
  const buildContextSummary = (): string => {
    const parts: string[] = [];

    if (context.datasetName) {
      parts.push(`Dataset: ${context.datasetName}`);
    }

    if (context.profile) {
      const profiles = Array.isArray(context.profile.column_profiles) 
        ? context.profile.column_profiles 
        : Object.values(context.profile.column_profiles || {});
      
      parts.push(`Profiling Results:`);
      parts.push(`- Row count: ${context.profile.row_count}`);
      parts.push(`- Columns: ${profiles.length}`);
      
      profiles.forEach((col: any) => {
        parts.push(`  - ${col.column_name}: type=${col.dtype}, completeness=${(col.completeness * 100).toFixed(1)}%, nulls=${col.null_count}, unique=${col.distinct_count}${col.min_value !== undefined ? `, min=${col.min_value}` : ''}${col.max_value !== undefined ? `, max=${col.max_value}` : ''}`);
      });
    }

    if (context.rules && context.rules.length > 0) {
      parts.push(`\nActive Rules (${context.rules.length}):`);
      context.rules.slice(0, 10).forEach(rule => {
        parts.push(`- ${rule.rule_name}: dimension=${rule.dimension}, severity=${rule.severity}, threshold=${rule.threshold}`);
      });
    }

    if (context.execution) {
      const summary = (context.execution.summary || {}) as Record<string, unknown>;
      parts.push(`\nExecution Results:`);
      parts.push(`- Passed: ${summary.passed ?? 0}`);
      parts.push(`- Failed: ${summary.failed ?? 0}`);
      parts.push(`- Circuit breaker: ${context.execution.circuit_breaker_tripped ? 'TRIPPED' : 'OK'}`);
    }

    if (context.incidents && context.incidents.length > 0) {
      parts.push(`\nActive Incidents (${context.incidents.length}):`);
      context.incidents.slice(0, 5).forEach(inc => {
        parts.push(`- ${inc.dimension}: ${inc.action} (severity=${inc.severity}, status=${inc.status})`);
      });
    }

    return parts.join('\n');
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add placeholder for assistant message
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }]);

    try {
      const contextSummary = buildContextSummary();
      
      const response = await supabase.functions.invoke('dq-chatbot', {
        body: {
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: content.trim() }
          ],
          context: contextSummary
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      // Update assistant message with response
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: data.response || 'I apologize, but I could not generate a response.', isStreaming: false }
          : m
      ));
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: 'Sorry, I encountered an error. Please check if the HuggingFace API key is configured in Settings.', isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 h-20 w-20 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 z-50"
        onClick={() => onClose()}
      >
        <MessageCircle className="h-9 w-9" />
      </Button>
    );
  }

  return (
    <div 
      className={cn(
        "fixed right-0 top-0 h-full bg-background border-l shadow-2xl z-50 flex flex-col transition-all duration-300",
        isExpanded ? "w-[600px]" : "w-[400px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">DQ Assistant</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Context Badge */}
      <div className="px-4 py-2 border-b bg-primary/5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Database className="h-3 w-3" />
          <span>Context:</span>
          {context.profile && <Badge variant="outline" className="text-xs">Profile ✓</Badge>}
          {context.rules && context.rules.length > 0 && <Badge variant="outline" className="text-xs">{context.rules.length} Rules</Badge>}
          {context.execution && <Badge variant="outline" className="text-xs">Execution ✓</Badge>}
          {context.incidents && context.incidents.length > 0 && (
            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
              {context.incidents.length} Incidents
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto text-primary/30 mb-4" />
              <h4 className="font-medium mb-1">Ask about your data quality</h4>
              <p className="text-sm text-muted-foreground">
                I have access to your profiling results, rules, execution status, and incidents.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Quick Questions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-auto py-2"
                    onClick={() => sendMessage(action.prompt)}
                  >
                    <ChevronRight className="h-3 w-3 mr-1 shrink-0" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}
                >
                  {message.isStreaming ? (
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  <p className="text-[10px] opacity-50 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data quality..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            size="icon" 
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Using LLM360/K2-Think + Llama-3.1-8B-Instruct
        </p>
      </div>
    </div>
  );
}
