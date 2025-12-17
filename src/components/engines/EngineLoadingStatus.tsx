import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Send, 
  Brain, 
  Calculator, 
  CheckCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EvalStatus = 'idle' | 'sending' | 'analyzing' | 'computing' | 'complete' | 'error';

interface EngineLoadingStatusProps {
  status: EvalStatus;
  engineName: string;
  className?: string;
}

const statusConfig: Record<EvalStatus, { 
  label: string; 
  icon: React.ElementType; 
  progress: number;
  color: string;
}> = {
  idle: { label: "Ready", icon: CheckCircle, progress: 0, color: "text-muted-foreground" },
  sending: { label: "Sending prompt to model...", icon: Send, progress: 25, color: "text-primary" },
  analyzing: { label: "Analyzing real model output...", icon: Brain, progress: 50, color: "text-primary" },
  computing: { label: "Computing weighted score...", icon: Calculator, progress: 75, color: "text-primary" },
  complete: { label: "Evaluation complete!", icon: CheckCircle, progress: 100, color: "text-success" },
  error: { label: "Evaluation failed", icon: Loader2, progress: 0, color: "text-destructive" },
};

export function EngineLoadingStatus({ status, engineName, className }: EngineLoadingStatusProps) {
  if (status === 'idle') return null;

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === 'sending' || status === 'analyzing' || status === 'computing';

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-full",
            status === 'complete' ? "bg-success/10" : "bg-primary/10"
          )}>
            <Icon className={cn(
              "w-6 h-6",
              config.color,
              isAnimating && "animate-pulse"
            )} />
          </div>
          <div className="flex-1">
            <p className={cn("font-medium", config.color)}>{config.label}</p>
            <p className="text-sm text-muted-foreground">
              {engineName} Engine
            </p>
          </div>
          {isAnimating && (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          )}
        </div>
        <Progress value={config.progress} className="mt-4 h-2" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Step {Math.ceil(config.progress / 25)} of 4</span>
          <span>{config.progress}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact inline version for use inside cards
export function EngineLoadingStatusInline({ status, engineName }: EngineLoadingStatusProps) {
  if (status === 'idle') return null;

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === 'sending' || status === 'analyzing' || status === 'computing';

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
      <Icon className={cn(
        "w-5 h-5",
        config.color,
        isAnimating && "animate-pulse"
      )} />
      <div className="flex-1">
        <p className={cn("text-sm font-medium", config.color)}>{config.label}</p>
      </div>
      {isAnimating && (
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      )}
    </div>
  );
}
