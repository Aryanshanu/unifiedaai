import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertTriangle, Plug, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSystems } from "@/hooks/useSystems";

type Provider = "huggingface" | "openai" | "azure" | "anthropic" | "custom";

export function ConnectModelForm() {
  const { data: systems, refetch } = useSystems();
  const [provider, setProvider] = useState<Provider>("huggingface");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const getPlaceholderEndpoint = () => {
    switch (provider) {
      case "huggingface":
        return "https://api-inference.huggingface.co/models/your-model";
      case "openai":
        return "https://api.openai.com/v1/chat/completions";
      case "azure":
        return "https://your-resource.openai.azure.com/openai/deployments/your-model";
      case "anthropic":
        return "https://api.anthropic.com/v1/messages";
      default:
        return "https://your-api.com/v1/completions";
    }
  };

  const handleTestConnection = async () => {
    if (!endpoint || !apiKey) {
      toast.error("Please enter both endpoint and API key");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Simple connectivity test - just check if endpoint responds
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName || "test",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 5,
        }),
      });

      // Any response (even 4xx) means the endpoint is reachable
      if (response.ok || response.status < 500) {
        setTestResult("success");
        toast.success("Connection successful!", {
          description: "Your model endpoint is reachable.",
        });
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error: any) {
      setTestResult("error");
      toast.error("Connection failed", {
        description: error.message || "Could not reach the endpoint",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSystem) {
      toast.error("Please select a system to configure");
      return;
    }
    if (!endpoint || !apiKey) {
      toast.error("Please enter endpoint and API key");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("systems")
        .update({
          endpoint,
          api_token_encrypted: apiKey,
          model_name: modelName,
          provider: provider,
        })
        .eq("id", selectedSystem);

      if (error) throw error;

      toast.success("Model endpoint saved!", {
        description: "Your system is now configured with a real model endpoint.",
      });
      refetch();
    } catch (error: any) {
      toast.error("Failed to save", {
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plug className="w-5 h-5" />
          Connect Your Model
        </CardTitle>
        <CardDescription>
          Configure a real model endpoint for evaluations. All engines will use this endpoint for real AI-powered analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-yellow-500/10 border-yellow-500/30">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <AlertDescription className="text-yellow-500">
            No fake data. All evaluations will use your real model endpoint.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Select System</Label>
            <Select value={selectedSystem} onValueChange={setSelectedSystem}>
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Choose a system to configure" />
              </SelectTrigger>
              <SelectContent>
                {systems?.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.name}
                    {system.endpoint && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Configured
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
              <SelectTrigger className="bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="huggingface">HuggingFace Inference API</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="azure">Azure OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                <SelectItem value="custom">Custom Endpoint</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Inference Endpoint URL</Label>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={getPlaceholderEndpoint()}
              className="bg-secondary font-mono text-sm"
            />
          </div>

          <div>
            <Label className="mb-2 block">Model Name (optional)</Label>
            <Input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., gpt-4, claude-3-opus, mistral-7b"
              className="bg-secondary"
            />
          </div>

          <div>
            <Label className="mb-2 block">API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-... or hf_..."
                className="bg-secondary pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !endpoint || !apiKey}
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : testResult === "success" ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                Connected
              </>
            ) : (
              "Test Connection"
            )}
          </Button>

          <Button
            variant="gradient"
            onClick={handleSave}
            disabled={saving || !selectedSystem || !endpoint || !apiKey}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}