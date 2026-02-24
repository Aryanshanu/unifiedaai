import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Zap, Globe } from "lucide-react";

export function ConnectModelForm() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          AI Gateway Status
        </CardTitle>
        <CardDescription>
          All evaluations are routed through the Fractal AI Gateway. No configuration needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-success/20 bg-success/5">
          <CheckCircle2 className="w-6 h-6 text-success" />
          <div>
            <p className="font-medium text-foreground">Connected & Active</p>
            <p className="text-sm text-muted-foreground">Gateway is operational and handling all inference requests.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Model</p>
            <p className="font-medium text-foreground text-sm">google/gemini-3-flash-preview</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Provider</p>
            <p className="font-medium text-foreground text-sm">Lovable AI Gateway</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Authentication</p>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                Auto-configured
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Endpoint: <code className="font-mono text-foreground">https://ai.gateway.lovable.dev/v1/chat/completions</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
