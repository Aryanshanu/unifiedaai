import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
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
  Minimize2,
  Settings,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Trash2,
  ArrowLeft,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { DQProfile, DQRule, DQExecution, DQIncident } from '@/hooks/useDQControlPlane';
import { useProviderKeys, useAddProviderKey, useDeleteProviderKey, LLMProvider } from '@/hooks/useProviderKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  errorCode?: string;
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

interface HuggingFaceConfig {
  reasoningModel: string;
  instructModel: string;
  enableRAG: boolean;
  enableStreaming: boolean;
  maxTokens: number;
  temperature: number;
}

const REASONING_MODELS = [
  { id: 'LLM360/K2-Think', name: 'K2-Think', description: 'Chain-of-thought reasoning' },
  { id: 'microsoft/Phi-3-mini-4k-instruct', name: 'Phi-3 Mini', description: 'Compact reasoning' },
];

const INSTRUCT_MODELS = [
  { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', description: 'High quality' },
  { id: 'meta-llama/Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B', description: 'Compact' },
  { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B', description: 'Balanced' },
  { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B', description: 'Helpful' },
];

const DEFAULT_CONFIG: HuggingFaceConfig = {
  reasoningModel: 'LLM360/K2-Think',
  instructModel: 'meta-llama/Llama-3.1-8B-Instruct',
  enableRAG: true,
  enableStreaming: false,
  maxTokens: 1024,
  temperature: 0.7,
};

const QUICK_ACTIONS = [
  { label: 'Main issues?', prompt: 'What are the main data quality issues in this dataset?' },
  { label: 'Low scores?', prompt: 'Why are some dimension scores low?' },
  { label: 'Missing values?', prompt: 'Which columns have the most missing values?' },
  { label: 'Fix suggestions', prompt: 'What fixes do you recommend for the failed rules?' },
];

export function DQChatbotPanel({ isOpen, onClose, context }: DQChatbotPanelProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<HuggingFaceConfig>(DEFAULT_CONFIG);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth and provider keys
  const { user } = useAuth();
  const { data: providerKeys, isLoading: loadingKeys } = useProviderKeys();
  const addKeyMutation = useAddProviderKey();
  const deleteKeyMutation = useDeleteProviderKey();

  const huggingFaceKey = providerKeys?.find(k => k.provider === 'huggingface');
  const isApiKeyConfigured = huggingFaceKey?.hasKey ?? false;

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('huggingface_config');
      if (savedConfig) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
      }
    } catch (e) {
      console.warn('Could not load HuggingFace config:', e);
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current && !showSettings) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, showSettings]);

  const handleSaveConfig = () => {
    try {
      localStorage.setItem('huggingface_config', JSON.stringify(config));
      toast({
        title: 'Settings saved',
        description: 'Your chatbot configuration has been updated.',
      });
    } catch (e) {
      toast({
        title: 'Error saving settings',
        description: 'Could not save configuration.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    try {
      await addKeyMutation.mutateAsync({
        provider: 'huggingface' as LLMProvider,
        apiKey: apiKeyInput.trim(),
      });
      setApiKeyInput('');
      setShowApiKey(false);
      toast({
        title: 'API Key saved',
        description: 'HuggingFace API key has been configured.',
      });
    } catch (e) {
      toast({
        title: 'Error saving API key',
        description: 'Could not save the API key.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteApiKey = async () => {
    try {
      await deleteKeyMutation.mutateAsync('huggingface' as LLMProvider);
      toast({
        title: 'API Key removed',
        description: 'HuggingFace API key has been deleted.',
      });
    } catch (e) {
      toast({
        title: 'Error removing API key',
        description: 'Could not delete the API key.',
        variant: 'destructive',
      });
    }
  };

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

    // Build conversation history including the new message
    const conversationHistory = [...messages, userMessage];
    
    setMessages(conversationHistory);
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
          messages: conversationHistory.map(m => ({ role: m.role, content: m.content })),
          context: contextSummary,
          config: {
            model: config.instructModel,
            temperature: config.temperature,
            maxTokens: config.maxTokens
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      const errorCode = data.error_code;
      
      // Update assistant message with response
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { 
              ...m, 
              content: data.response || 'I apologize, but I could not generate a response.', 
              isStreaming: false,
              errorCode
            }
          : m
      ));
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { 
              ...m, 
              content: 'Sorry, I encountered an error. Please check if the HuggingFace API key is configured in Settings.', 
              isStreaming: false,
              errorCode: 'HF_UNKNOWN'
            }
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

  const goToSettings = () => {
    setShowSettings(true);
  };

  // Render error action buttons based on error code
  const renderErrorActions = (errorCode?: string) => {
    if (!errorCode) return null;

    if (errorCode === 'NO_API_KEY' || errorCode === 'HF_AUTH_INVALID') {
      return (
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2 gap-2"
          onClick={goToSettings}
        >
          <KeyRound className="h-3 w-3" />
          Configure API Key
        </Button>
      );
    }

    if (errorCode === 'HF_FORBIDDEN_MODEL') {
      return (
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2 gap-2"
          onClick={goToSettings}
        >
          <Settings className="h-3 w-3" />
          Change Model Settings
        </Button>
      );
    }

    if (errorCode === 'HF_MODEL_LOADING' || errorCode === 'HF_RATE_LIMITED') {
      return (
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2 gap-2"
          onClick={() => {
            // Retry the last user message
            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
            if (lastUserMsg) {
              // Remove the error message and retry
              setMessages(prev => prev.filter(m => m.errorCode !== errorCode));
              setTimeout(() => sendMessage(lastUserMsg.content), 500);
            }
          }}
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      );
    }

    return null;
  };

  // Get display name for current model
  const getCurrentModelName = () => {
    const model = INSTRUCT_MODELS.find(m => m.id === config.instructModel);
    return model?.name || 'Llama 3.1 8B';
  };

  // Don't render anything when closed
  if (!isOpen) {
    return null;
  }

  // Settings View
  const renderSettingsView = () => (
    <div className="space-y-6 p-1">
      {/* API Key Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-medium flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            HuggingFace API Key
          </Label>
          <Badge variant={isApiKeyConfigured ? "outline" : "destructive"} className="text-xs">
            {isApiKeyConfigured ? (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" /> Configured
              </span>
            ) : (
              "Not Configured"
            )}
          </Badge>
        </div>
        
        {!user ? (
          <p className="text-sm text-muted-foreground">
            Please log in to configure API keys.
          </p>
        ) : isApiKeyConfigured ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
              ••••••••••••••••
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteApiKey}
              disabled={deleteKeyMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="hf_xxxxxxxxxxxx"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput.trim() || addKeyMutation.isPending}
            >
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <Label className="font-medium">Reasoning Model</Label>
        <Select
          value={config.reasoningModel}
          onValueChange={(v) => setConfig({ ...config, reasoningModel: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {REASONING_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col">
                  <span>{model.name}</span>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="font-medium">Instruct Model</Label>
        <Select
          value={config.instructModel}
          onValueChange={(v) => setConfig({ ...config, instructModel: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {INSTRUCT_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col">
                  <span>{model.name}</span>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Temperature: {config.temperature.toFixed(1)}</Label>
          <Slider
            value={[config.temperature * 10]}
            onValueChange={([v]) => setConfig({ ...config, temperature: v / 10 })}
            max={10}
            min={0}
            step={1}
            className="py-2"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Max Tokens: {config.maxTokens}</Label>
          <Slider
            value={[config.maxTokens]}
            onValueChange={([v]) => setConfig({ ...config, maxTokens: v })}
            max={4096}
            min={256}
            step={128}
            className="py-2"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable RAG Context</Label>
          <Switch
            checked={config.enableRAG}
            onCheckedChange={(v) => setConfig({ ...config, enableRAG: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable Streaming</Label>
          <Switch
            checked={config.enableStreaming}
            onCheckedChange={(v) => setConfig({ ...config, enableStreaming: v })}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleSaveConfig} className="flex-1 gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
        <Button variant="outline" onClick={() => setShowSettings(false)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );

  // Chat View
  const renderChatView = () => (
    <>
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
                    : message.errorCode
                      ? "bg-destructive/10 border border-destructive/30"
                      : "bg-muted"
                )}
              >
                {message.isStreaming ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                ) : (
                  <>
                    {message.errorCode && (
                      <div className="flex items-center gap-1 text-destructive text-xs mb-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Error</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.role === 'assistant' && renderErrorActions(message.errorCode)}
                  </>
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
          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      )}
    </>
  );

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
            <h3 className="font-semibold">{showSettings ? 'Settings' : 'DQ Assistant'}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat" disabled={showSettings}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSettings(!showSettings)} 
            title="Settings"
            className={cn(showSettings && "bg-primary/10")}
          >
            <Settings className={cn("h-4 w-4", showSettings && "text-primary")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Context Badge - Hide when settings shown */}
      {!showSettings && (
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
      )}

      {/* Content Area */}
      <ScrollArea className="flex-1 p-4">
        {showSettings ? renderSettingsView() : renderChatView()}
      </ScrollArea>

      {/* Input - Hide when settings shown */}
      {!showSettings && (
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
            Using {getCurrentModelName()}
          </p>
        </div>
      )}
    </div>
  );
}