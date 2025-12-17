import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Key, Plus, Trash2, Eye, EyeOff, Check, Sparkles, Bot, Brain, Search, Zap, Globe } from "lucide-react";
import { useProviderKeys, useAddProviderKey, useDeleteProviderKey, useToggleProviderKey } from "@/hooks/useProviderKeys";
import type { LLMProvider } from "@/hooks/useProviderKeys";

const SUPPORTED_PROVIDERS: { id: LLMProvider; name: string; description: string }[] = [
  { id: "lovable", name: "Lovable AI", description: "Pre-configured, no API key needed" },
  { id: "openai", name: "OpenAI", description: "GPT-4, GPT-4o, GPT-3.5" },
  { id: "anthropic", name: "Anthropic", description: "Claude 3 Opus, Sonnet, Haiku" },
  { id: "gemini", name: "Google Gemini", description: "Gemini Pro, Flash" },
  { id: "perplexity", name: "Perplexity", description: "Web-connected LLMs" },
  { id: "openrouter", name: "OpenRouter", description: "100+ models, unified API" },
  { id: "huggingface", name: "HuggingFace", description: "Open-source models" },
];

const PROVIDER_ICONS: Record<LLMProvider, React.ReactNode> = {
  lovable: <Sparkles className="h-4 w-4" />,
  openai: <Bot className="h-4 w-4" />,
  anthropic: <Brain className="h-4 w-4" />,
  gemini: <Zap className="h-4 w-4" />,
  perplexity: <Search className="h-4 w-4" />,
  openrouter: <Globe className="h-4 w-4" />,
  huggingface: <Bot className="h-4 w-4" />,
};

export function ProviderKeysSection() {
  const { data: savedKeys, isLoading } = useProviderKeys();
  const addKey = useAddProviderKey();
  const deleteKey = useDeleteProviderKey();
  const toggleKey = useToggleProviderKey();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  const handleAddKey = async () => {
    if (!selectedProvider || !apiKeyInput.trim()) return;

    await addKey.mutateAsync({ 
      provider: selectedProvider, 
      apiKey: apiKeyInput.trim() 
    });

    setAddDialogOpen(false);
    setApiKeyInput("");
    setSelectedProvider(null);
    setShowKey(false);
  };

  const handleDeleteKey = async () => {
    if (!selectedProvider) return;

    await deleteKey.mutateAsync(selectedProvider);
    setDeleteDialogOpen(false);
    setSelectedProvider(null);
  };

  const getKeyStatus = (provider: LLMProvider) => {
    const key = savedKeys?.find(k => k.provider === provider);
    if (!key) return null;
    return key;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          LLM Provider API Keys
        </CardTitle>
        <CardDescription>
          Configure API keys for different LLM providers. Keys are encrypted and stored securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {SUPPORTED_PROVIDERS.map((provider) => {
          const keyStatus = getKeyStatus(provider.id);
          const isLovable = provider.id === "lovable";

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  {PROVIDER_ICONS[provider.id]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    {isLovable && (
                      <Badge variant="secondary" className="text-xs">Built-in</Badge>
                    )}
                    {keyStatus?.hasKey && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{provider.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {keyStatus?.hasKey && (
                  <>
                    <Switch
                      checked={keyStatus.is_active}
                      onCheckedChange={(checked) => 
                        toggleKey.mutate({ id: keyStatus.id, isActive: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}

                {!isLovable && (
                  <Button
                    variant={keyStatus?.hasKey ? "outline" : "default"}
                    size="sm"
                    onClick={() => {
                      setSelectedProvider(provider.id);
                      setAddDialogOpen(true);
                    }}
                  >
                    {keyStatus?.hasKey ? "Update" : "Add Key"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            Loading provider keys...
          </div>
        )}
      </CardContent>

      {/* Add/Update Key Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedProvider && getKeyStatus(selectedProvider)?.hasKey ? "Update" : "Add"} API Key
            </DialogTitle>
            <DialogDescription>
              Enter your API key for {SUPPORTED_PROVIDERS.find(p => p.id === selectedProvider)?.name}.
              Keys are encrypted before storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Get your API key from:</p>
              <ul className="list-disc list-inside mt-1">
                {selectedProvider === "openai" && (
                  <li><a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a></li>
                )}
                {selectedProvider === "anthropic" && (
                  <li><a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Anthropic Console</a></li>
                )}
                {selectedProvider === "gemini" && (
                  <li><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a></li>
                )}
                {selectedProvider === "perplexity" && (
                  <li><a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Perplexity Settings</a></li>
                )}
                {selectedProvider === "openrouter" && (
                  <li><a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenRouter Keys</a></li>
                )}
                {selectedProvider === "huggingface" && (
                  <li><a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">HuggingFace Tokens</a></li>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddKey} 
              disabled={!apiKeyInput.trim() || addKey.isPending}
            >
              {addKey.isPending ? "Saving..." : "Save Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your {SUPPORTED_PROVIDERS.find(p => p.id === selectedProvider)?.name} API key.
              You can add a new one at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
