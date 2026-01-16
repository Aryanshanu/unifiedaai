import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Key,
  CheckCircle2,
  XCircle,
  Brain,
  MessageSquare,
  Zap,
  Thermometer,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useProviderKeys, useAddProviderKey, useDeleteProviderKey, LLMProvider } from '@/hooks/useProviderKeys';
import { useAuth } from '@/hooks/useAuth';

interface HuggingFaceConfig {
  reasoningModel: string;
  instructModel: string;
  enableRAG: boolean;
  enableStreaming: boolean;
  maxTokens: number;
  temperature: number;
}

const REASONING_MODELS = [
  { id: 'LLM360/K2-Think', name: 'LLM360/K2-Think', description: 'Chain-of-thought reasoning' },
  { id: 'microsoft/Phi-3-mini-4k-instruct', name: 'Phi-3 Mini', description: 'Compact reasoning model' },
];

const INSTRUCT_MODELS = [
  { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B Instruct', description: 'Fast, high-quality responses' },
  { id: 'meta-llama/Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B Instruct', description: 'Compact and efficient' },
  { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B Instruct', description: 'Balanced performance' },
  { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B', description: 'Helpful assistant model' },
];

interface HuggingFaceSettingsProps {
  onSave?: (config: HuggingFaceConfig) => void;
}

export function HuggingFaceSettings({ onSave }: HuggingFaceSettingsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: providerKeys, isLoading: loadingKeys } = useProviderKeys();
  const addKeyMutation = useAddProviderKey();
  const deleteKeyMutation = useDeleteProviderKey();
  
  const [config, setConfig] = useState<HuggingFaceConfig>({
    reasoningModel: 'LLM360/K2-Think',
    instructModel: 'meta-llama/Llama-3.1-8B-Instruct',
    enableRAG: true,
    enableStreaming: true,
    maxTokens: 1024,
    temperature: 0.7
  });

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Check if HuggingFace key is configured
  const huggingFaceKey = providerKeys?.find(k => k.provider === 'huggingface');
  const isApiKeyConfigured = !!huggingFaceKey?.hasKey;

  // Load saved config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('huggingface_config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load HuggingFace config:', e);
      }
    }
  }, []);

  const handleSaveConfig = () => {
    localStorage.setItem('huggingface_config', JSON.stringify(config));
    onSave?.(config);
    toast({
      title: "Settings Saved",
      description: "HuggingFace configuration has been updated.",
    });
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key.",
        variant: "destructive"
      });
      return;
    }

    try {
      await addKeyMutation.mutateAsync({
        provider: 'huggingface' as LLMProvider,
        apiKey: apiKeyInput.trim()
      });
      setApiKeyInput('');
      setShowApiKey(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteApiKey = async () => {
    try {
      await deleteKeyMutation.mutateAsync('huggingface' as LLMProvider);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* API Key Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                HuggingFace API Key
              </CardTitle>
              <CardDescription>
                Configure your HuggingFace API token for the DQ chatbot
              </CardDescription>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                isApiKeyConfigured 
                  ? "bg-success/10 text-success border-success/30" 
                  : "bg-destructive/10 text-destructive border-destructive/30"
              )}
            >
              {loadingKeys ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isApiKeyConfigured ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Configured
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Configured
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm text-warning">
                Please sign in to configure your HuggingFace API key.
              </p>
            </div>
          ) : isApiKeyConfigured ? (
            <div className="flex items-center justify-between p-4 bg-success/5 border border-success/20 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">API Key Active</p>
                  <p className="text-sm text-muted-foreground">
                    Your HuggingFace token is configured and ready to use.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDeleteApiKey}
                disabled={deleteKeyMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                {deleteKeyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-warning">API Key Required</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get your API key from{' '}
                      <a 
                        href="https://huggingface.co/settings/tokens" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        HuggingFace Settings → Access Tokens
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Token</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button 
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim() || addKeyMutation.isPending}
                  >
                    {addKeyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Save Key'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Model Configuration
          </CardTitle>
          <CardDescription>
            Configure AI models for the Data Quality chatbot and analysis
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Reasoning Model */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <Label className="font-medium">Reasoning Model (Chain-of-Thought)</Label>
            </div>
            <Select 
              value={config.reasoningModel} 
              onValueChange={(value) => setConfig(prev => ({ ...prev, reasoningModel: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reasoning model" />
              </SelectTrigger>
              <SelectContent>
                {REASONING_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for complex analysis and multi-step reasoning about data quality
            </p>
          </div>

          <Separator />

          {/* Instruct Model */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <Label className="font-medium">Instruct Model (Final Output)</Label>
            </div>
            <Select 
              value={config.instructModel} 
              onValueChange={(value) => setConfig(prev => ({ ...prev, instructModel: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select instruct model" />
              </SelectTrigger>
              <SelectContent>
                {INSTRUCT_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Generates the final user-facing responses in the chatbot
            </p>
          </div>

          <Separator />

          {/* Feature Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <div>
                  <Label className="font-medium">Enable RAG Context Injection</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically inject profiling, rules, and incident data
                  </p>
                </div>
              </div>
              <Switch 
                checked={config.enableRAG}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableRAG: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <div>
                  <Label className="font-medium">Enable Streaming Responses</Label>
                  <p className="text-xs text-muted-foreground">
                    Show responses token-by-token as they generate
                  </p>
                </div>
              </div>
              <Switch 
                checked={config.enableStreaming}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableStreaming: checked }))}
              />
            </div>
          </div>

          <Separator />

          {/* Parameters */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                Max Tokens
                <Badge variant="outline" className="font-mono text-xs">{config.maxTokens}</Badge>
              </Label>
              <Slider
                value={[config.maxTokens]}
                onValueChange={([value]) => setConfig(prev => ({ ...prev, maxTokens: value }))}
                min={256}
                max={4096}
                step={256}
              />
              <p className="text-xs text-muted-foreground">
                Maximum length of generated responses
              </p>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperature
                <Badge variant="outline" className="font-mono text-xs">{config.temperature.toFixed(1)}</Badge>
              </Label>
              <Slider
                value={[config.temperature * 10]}
                onValueChange={([value]) => setConfig(prev => ({ ...prev, temperature: value / 10 }))}
                min={0}
                max={10}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Higher = more creative, Lower = more focused
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveConfig} className="gap-2">
              <Save className="h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
