import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Settings, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";

interface EngineErrorCardProps {
  title?: string;
  message?: string;
  type?: 'temporary' | 'connection' | 'endpoint';
  onRetry?: () => void;
  isRetrying?: boolean;
  systemId?: string;
}

export function EngineErrorCard({
  title = "Temporary Issue",
  message = "We're working on it. Your data is safe.",
  type = 'temporary',
  onRetry,
  isRetrying = false,
  systemId,
}: EngineErrorCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'connection':
        return <WifiOff className="w-8 h-8 text-warning" />;
      case 'endpoint':
        return <Settings className="w-8 h-8 text-muted-foreground" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-warning" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'connection':
        return "Model Endpoint Error";
      case 'endpoint':
        return "No Endpoint Configured";
      default:
        return title;
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'connection':
        return "Could not connect to your model endpoint. Please check your connection and API credentials.";
      case 'endpoint':
        return "Configure your model endpoint in Settings to run evaluations.";
      default:
        return message;
    }
  };

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {getIcon()}
          <div>
            <h3 className="text-lg font-semibold text-foreground">{getTitle()}</h3>
            <p className="text-sm text-muted-foreground mt-1">{getMessage()}</p>
          </div>
          <div className="flex gap-2">
            {onRetry && (
              <Button 
                onClick={onRetry} 
                disabled={isRetrying}
                variant="default"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? "Retrying..." : "Retry"}
              </Button>
            )}
            {type === 'endpoint' && systemId && (
              <Button variant="outline" asChild>
                <Link to={`/systems/${systemId}/settings`}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Endpoint
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
