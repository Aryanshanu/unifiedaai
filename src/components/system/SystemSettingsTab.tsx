import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateSystem, type System } from "@/hooks/useSystems";
import { toast } from "sonner";
import { Loader2, Key, Globe, Save, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SystemSettingsTabProps {
  system: System;
}

export function SystemSettingsTab({ system }: SystemSettingsTabProps) {
  const { user } = useAuth();
  const updateSystem = useUpdateSystem();
  
  const [endpoint, setEndpoint] = useState(system.endpoint || "");
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const isOwner = user?.id === system.owner_id;
  const hasExistingToken = !!system.api_token_encrypted;
  
  const handleEndpointChange = (value: string) => {
    setEndpoint(value);
    setHasChanges(true);
  };
  
  const handleTokenChange = (value: string) => {
    setApiToken(value);
    setHasChanges(true);
  };
  
  const handleSave = async () => {
    try {
      const updates: Partial<System> & { id: string } = {
        id: system.id,
        endpoint: endpoint || null,
      };
      
      // Only update token if a new one was provided
      if (apiToken) {
        updates.api_token_encrypted = apiToken;
      }
      
      await updateSystem.mutateAsync(updates);
      toast.success("Settings saved successfully");
      setHasChanges(false);
      setApiToken(""); // Clear the token field after save
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    }
  };
  
  if (!isOwner) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h3>
        <p className="text-muted-foreground">
          Only the system owner can modify these settings.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure the API endpoint and authentication for this system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="endpoint">API Endpoint</Label>
            <Input
              id="endpoint"
              type="url"
              placeholder="https://api.example.com/v1/model"
              value={endpoint}
              onChange={(e) => handleEndpointChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The URL endpoint used for model evaluations and API calls.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="api_token" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Token
              {hasExistingToken && (
                <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded">
                  Configured
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="api_token"
                type={showToken ? "text" : "password"}
                placeholder={hasExistingToken ? "••••••••••••••••" : "Enter API token"}
                value={apiToken}
                onChange={(e) => handleTokenChange(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {hasExistingToken 
                ? "Enter a new token to replace the existing one, or leave blank to keep current token."
                : "Authentication token for the API endpoint. Required for external model calls."
              }
            </p>
          </div>
          
          {!hasExistingToken && endpoint && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">API Token Missing</p>
                <p className="text-xs text-muted-foreground">
                  You have an endpoint configured but no API token. External evaluations may fail without proper authentication.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || updateSystem.isPending}
              className="bg-gradient-primary"
            >
              {updateSystem.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}