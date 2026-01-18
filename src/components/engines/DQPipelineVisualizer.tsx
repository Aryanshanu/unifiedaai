import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Database, 
  BookOpen, 
  Play, 
  BarChart3, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  ArrowRight
} from 'lucide-react';
import type { PipelineStep, StepStatus, PipelineStatus } from '@/hooks/useDQControlPlane';

interface DQPipelineVisualizerProps {
  currentStep: PipelineStep | null;
  stepStatuses: Record<PipelineStep, StepStatus>;
  pipelineStatus: PipelineStatus;
  elapsedTime: number;
  isRealtimeConnected: boolean;
}

const STEP_CONFIG: Record<PipelineStep, { icon: React.ElementType; label: string; description: string }> = {
  1: { icon: Database, label: 'PROFILE', description: 'Data Profiling' },
  2: { icon: BookOpen, label: 'RULES', description: 'Rule Development' },
  3: { icon: Play, label: 'EXECUTE', description: 'Rule Execution' },
  4: { icon: BarChart3, label: 'DASHBOARD', description: 'AI/BI Assets' },
  5: { icon: AlertTriangle, label: 'INCIDENTS', description: 'Issue Management' }
};

const STATUS_STYLES: Record<StepStatus, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  pending: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted', icon: Circle },
  running: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary', icon: Loader2 },
  passed: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500', icon: CheckCircle2 },
  failed: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive', icon: XCircle }
};

export function DQPipelineVisualizer({
  currentStep,
  stepStatuses,
  pipelineStatus,
  elapsedTime,
  isRealtimeConnected
}: DQPipelineVisualizerProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}s`;
  };

  const getStatusMessage = () => {
    if (pipelineStatus === 'idle') return 'Ready to run pipeline';
    if (pipelineStatus === 'success') return 'Pipeline completed successfully';
    if (pipelineStatus === 'error') return 'Pipeline encountered an error';
    if (currentStep) return `${STEP_CONFIG[currentStep].description}... (Step ${currentStep} of 5)`;
    return 'Processing...';
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            DATA QUALITY PIPELINE
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                isRealtimeConnected ? "border-green-500 text-green-500" : "border-muted text-muted-foreground"
              )}
            >
              <Circle className={cn("h-2 w-2 mr-1 fill-current", isRealtimeConnected && "animate-pulse")} />
              {/* GOVERNANCE FIX: Renamed from "Realtime" - more accurate terminology */}
              Sync {isRealtimeConnected ? 'Active' : 'Inactive'}
            </Badge>
            {pipelineStatus === 'running' && (
              <Badge variant="secondary" className="font-mono">
                {formatTime(elapsedTime)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Pipeline Steps */}
        <div className="flex items-center justify-between gap-2 mb-6">
          {([1, 2, 3, 4, 5] as PipelineStep[]).map((step, index) => {
            const config = STEP_CONFIG[step];
            const status = stepStatuses[step];
            const styles = STATUS_STYLES[status];
            const StepIcon = config.icon;
            const StatusIcon = styles.icon;

            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "relative w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all",
                      styles.bg,
                      styles.border,
                      status === 'running' && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                  >
                    <StepIcon className={cn("h-6 w-6", styles.text)} />
                    <div className="absolute -top-2 -right-2">
                      <StatusIcon 
                        className={cn(
                          "h-5 w-5 bg-background rounded-full",
                          styles.text,
                          status === 'running' && "animate-spin"
                        )} 
                      />
                    </div>
                  </div>
                  <span className={cn("text-xs font-medium mt-2", styles.text)}>
                    {config.label}
                  </span>
                </div>
                {index < 4 && (
                  <ArrowRight 
                    className={cn(
                      "h-5 w-5 flex-shrink-0 mt-[-1.5rem]",
                      stepStatuses[step] === 'passed' ? "text-green-500" : "text-muted-foreground"
                    )} 
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Status Message */}
        <div className={cn(
          "text-center py-3 rounded-lg border",
          pipelineStatus === 'idle' && "bg-muted/50 border-muted text-muted-foreground",
          pipelineStatus === 'running' && "bg-primary/5 border-primary/20 text-primary",
          pipelineStatus === 'success' && "bg-green-500/5 border-green-500/20 text-green-500",
          pipelineStatus === 'error' && "bg-destructive/5 border-destructive/20 text-destructive"
        )}>
          <div className="flex items-center justify-center gap-2">
            {pipelineStatus === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
            {pipelineStatus === 'success' && <CheckCircle2 className="h-4 w-4" />}
            {pipelineStatus === 'error' && <XCircle className="h-4 w-4" />}
            <span className="text-sm font-medium">{getStatusMessage()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
