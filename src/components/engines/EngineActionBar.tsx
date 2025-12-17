import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  RotateCcw, 
  AlertTriangle, 
  Download, 
  FileText,
  Send,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EngineActionBarProps {
  onRetry: () => void;
  onDownload?: () => void;
  modelId?: string;
  systemId?: string;
  engineName: string;
  score?: number;
  isRetrying?: boolean;
  className?: string;
}

export function EngineActionBar({
  onRetry,
  onDownload,
  modelId,
  systemId,
  engineName,
  score,
  isRetrying = false,
  className,
}: EngineActionBarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEscalate = () => {
    if (!modelId) {
      toast({
        title: "No model selected",
        description: "Please select a model first",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Escalating to HITL",
      description: `${engineName} evaluation flagged for human review`,
    });
    
    navigate("/hitl", { 
      state: { 
        escalationType: engineName.toLowerCase(),
        modelId,
        score,
      } 
    });
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      toast({
        title: "Preparing Report",
        description: `Generating ${engineName} evaluation report...`,
      });
    }
  };

  return (
    <Card className={cn("sticky bottom-4 shadow-lg border-primary/20", className)}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Actions
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              disabled={isRetrying}
              className="gap-2"
            >
              {isRetrying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {isRetrying ? "Retrying..." : "Retry Evaluation"}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEscalate}
              className="gap-2 text-warning hover:text-warning hover:bg-warning/10"
            >
              <AlertTriangle className="w-4 h-4" />
              Escalate to HITL
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
