import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertOctagon,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DQExecution, DQExecutionMetric } from '@/hooks/useDQControlPlane';
import { format } from 'date-fns';
import { PassRateExplanation } from './ErrorRateExplanation';

interface DQExecutionResultsProps {
  execution: DQExecution | null;
  isLoading?: boolean;
}

const SEVERITY_COLORS = {
  critical: 'text-destructive',
  warning: 'text-yellow-500',
  info: 'text-blue-500'
};

export function DQExecutionResults({ execution, isLoading }: DQExecutionResultsProps) {
  if (!execution && !isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            RULE EXECUTION
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No execution results</p>
            <p className="text-xs mt-1">Run the pipeline to execute rules</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Play className="h-4 w-4 text-primary animate-pulse" />
            RULE EXECUTION
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = (execution?.metrics || []) as DQExecutionMetric[];
  const passedCount = metrics.filter(m => !m.violated).length;
  const failedCount = metrics.filter(m => m.violated).length;
  const criticalFailure = execution?.summary?.critical_failure;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            RULE EXECUTION
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Mode: {execution?.execution_mode}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {metrics.length} rules
            </Badge>
            {execution?.execution_time_ms && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {execution.execution_time_ms}ms
              </Badge>
            )}
          </div>
        </div>
        {execution?.execution_ts && (
          <p className="text-xs text-muted-foreground mt-1">
            Executed: {format(new Date(execution.execution_ts), 'MMM d, yyyy HH:mm:ss')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Critical Issues Warning */}
        {criticalFailure && (
          <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertOctagon className="h-5 w-5 text-warning flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-warning text-sm">Critical Issues Detected</h4>
                <p className="text-xs text-warning/80 mt-0.5">
                  Review failed rules below. Pipeline continued automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{metrics.length}</div>
            <div className="text-xs text-muted-foreground">Total Rules</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-500">{passedCount}</span>
            </div>
            <div className="text-xs text-green-500/80">Passed</div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{failedCount}</span>
            </div>
            <div className="text-xs text-destructive/80">Failed</div>
          </div>
        </div>

        {/* Pass Rate Calculation Transparency */}
        {metrics.length > 0 && (
          <PassRateExplanation
            passedRules={passedCount}
            totalRules={metrics.length}
            passRate={metrics.length > 0 ? (passedCount / metrics.length) * 100 : 0}
            className="mb-4"
          />
        )}

        {/* Metrics Table */}
        <ScrollArea className="h-[180px]">
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b border-border sticky top-0 bg-background">
              <div className="col-span-3">Rule</div>
              <div className="col-span-2">Dimension</div>
              <div className="col-span-2">Threshold</div>
              <div className="col-span-3">Actual</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            
            {/* Rows - sorted with failures first */}
            {[...metrics]
              .sort((a, b) => (b.violated ? 1 : 0) - (a.violated ? 1 : 0))
              .map((metric, index) => {
                const successRate = metric.success_rate * 100;
                const threshold = metric.threshold * 100;
                const isViolated = metric.violated;

                return (
                  <div 
                    key={`${metric.rule_id}-${index}`}
                    className={cn(
                      "grid grid-cols-12 gap-2 text-xs py-2 border-b border-border/50 transition-colors",
                      isViolated ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="col-span-3 font-mono truncate flex items-center gap-1">
                      <Zap className={cn("h-3 w-3", SEVERITY_COLORS[metric.severity as keyof typeof SEVERITY_COLORS] || 'text-muted-foreground')} />
                      <span title={metric.rule_id}>{metric.rule_id.slice(0, 8)}...</span>
                    </div>
                    <div className="col-span-2 capitalize">
                      {metric.dimension}
                    </div>
                    <div className="col-span-2 font-mono">
                      {threshold.toFixed(0)}%
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Progress 
                        value={successRate} 
                        className={cn(
                          "h-2 flex-1",
                          isViolated ? "[&>div]:bg-destructive" : "[&>div]:bg-green-500"
                        )}
                      />
                      <span className={cn(
                        "w-12 text-right font-mono flex items-center justify-end gap-0.5",
                        isViolated ? "text-destructive" : "text-green-500"
                      )}>
                        {isViolated ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      {isViolated ? (
                        <Badge variant="destructive" className="text-[10px]">
                          <XCircle className="h-3 w-3 mr-1" />
                          FAIL
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] bg-green-500 hover:bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          PASS
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            
            {metrics.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No execution metrics available
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
