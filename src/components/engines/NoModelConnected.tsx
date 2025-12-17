import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Unplug, Settings, ArrowRight } from "lucide-react";

interface NoModelConnectedProps {
  modelId?: string;
  systemId?: string;
  engineName: string;
}

export function NoModelConnected({ modelId, systemId, engineName }: NoModelConnectedProps) {
  return (
    <Card className="border-muted bg-muted/30">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4 py-8">
          <div className="p-4 bg-muted rounded-full">
            <Unplug className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">No Model Endpoint Connected</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              To run {engineName} evaluations, configure your model's API endpoint in the system settings.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {systemId && (
              <Button asChild>
                <Link to={`/systems/${systemId}/settings`}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Endpoint
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/models">
                View All Models
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for showing inside model selector
export function NoEndpointWarning({ systemId }: { systemId?: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg border border-warning/30 text-sm">
      <Unplug className="w-4 h-4 text-warning shrink-0" />
      <span className="text-muted-foreground">
        No endpoint configured.
      </span>
      {systemId && (
        <Link 
          to={`/systems/${systemId}/settings`}
          className="text-primary hover:underline ml-auto whitespace-nowrap"
        >
          Configure →
        </Link>
      )}
    </div>
  );
}
