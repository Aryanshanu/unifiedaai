import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DQExecutionMetric {
  rule_id: string;
  rule_name?: string;
  dimension: string;
  severity: string;
  success_rate: number;
  failed_count: number;
  total_count: number;
  threshold: number;
  violated: boolean;
  failed_samples?: unknown[];
}

interface DQExecution {
  id: string;
  dataset_id: string;
  profile_id: string | null;
  rules_version: number;
  execution_mode: string;
  metrics: DQExecutionMetric[];
  summary: {
    critical_failure: boolean;
    execution_mode: string;
    total_rules?: number;
    passed_rules?: number;
    failed_rules?: number;
    critical_violations?: number;
  };
  execution_ts: string;
  execution_time_ms: number | null;
}

interface DQExecutionReportProps {
  execution: DQExecution | null;
  isLoading?: boolean;
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'critical':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/30">CRITICAL</Badge>;
    case 'warning':
      return <Badge className="bg-warning/10 text-warning border-warning/30">WARNING</Badge>;
    default:
      return <Badge variant="secondary">INFO</Badge>;
  }
}

export function DQExecutionReport({ 
  execution, 
  isLoading
}: DQExecutionReportProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!execution) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No execution data yet</p>
          <p className="text-sm text-muted-foreground">Run the pipeline to execute rules</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = execution.metrics || [];
  const passedRules = metrics.filter(m => !m.violated);
  const failedRules = metrics.filter(m => m.violated);
  const criticalFailures = failedRules.filter(m => m.severity === 'critical');
  const passRate = metrics.length > 0 ? (passedRules.length / metrics.length) * 100 : 0;

  return (
    <Card className={cn(
      execution.summary?.critical_failure && "border-warning/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            STEP 3: RULE EXECUTION
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{execution.execution_mode}</Badge>
            <Badge variant="outline" className="font-mono text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {execution.execution_time_ms}ms
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Executed: {format(new Date(execution.execution_ts), 'MMM d, yyyy HH:mm:ss')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Critical Issues Warning */}
        {execution.summary?.critical_failure && (
          <Alert className="border-warning/50 bg-warning/5">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertTitle className="text-lg font-bold text-warning">
              Critical Issues Detected
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-4">
              <p className="text-muted-foreground">
                {criticalFailures.length} critical rule(s) failed. Pipeline continued automatically. Review issues below.
              </p>
              {criticalFailures.length > 0 && (
                <div className="bg-warning/10 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-warning">Failed Critical Rules:</p>
                  {criticalFailures.map((rule) => (
                    <div key={rule.rule_id} className="flex items-center justify-between text-sm">
                      <span>{rule.rule_name || rule.rule_id.slice(0, 8)}</span>
                      <span className="font-mono text-muted-foreground">
                        Expected: ≥{(rule.threshold * 100).toFixed(0)}% | 
                        Actual: {(rule.success_rate * 100).toFixed(1)}% | 
                        Gap: {((rule.threshold - rule.success_rate) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Rules</p>
            <p className="text-3xl font-bold">{metrics.length}</p>
          </div>
          <div className="p-4 bg-success/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Passed</p>
            <p className="text-3xl font-bold text-success">{passedRules.length}</p>
          </div>
          <div className="p-4 bg-destructive/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Failed</p>
            <p className="text-3xl font-bold text-destructive">{failedRules.length}</p>
          </div>
          <div className={cn(
            "p-4 rounded-lg",
            passRate >= 80 ? "bg-success/10" : passRate >= 60 ? "bg-warning/10" : "bg-destructive/10"
          )}>
            <p className="text-sm text-muted-foreground mb-1">Pass Rate</p>
            <p className={cn(
              "text-3xl font-bold",
              passRate >= 80 ? "text-success" : passRate >= 60 ? "text-warning" : "text-destructive"
            )}>
              {passRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Detailed Results
          </h4>

          {/* Failed Rules First */}
          {failedRules.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Failed Rules ({failedRules.length})
              </p>
              {failedRules.map((metric) => (
                <div
                  key={metric.rule_id}
                  className="border border-destructive/30 bg-destructive/5 rounded-lg overflow-hidden"
                >
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-destructive" />
                        <div>
                          <p className="font-semibold">{metric.rule_name || metric.rule_id.slice(0, 16)}</p>
                          <p className="text-xs text-muted-foreground">
                            Dimension: {metric.dimension.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      {getSeverityBadge(metric.severity)}
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Rule ID:</span>
                        <p className="font-mono text-xs truncate">{metric.rule_id}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <p className="font-medium">{metric.total_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Passed:</span>
                        <p className="font-medium text-success">
                          {(metric.total_count - metric.failed_count).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed:</span>
                        <p className="font-medium text-destructive">{metric.failed_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margin:</span>
                        <p className="font-medium text-destructive">
                          {((metric.threshold - metric.success_rate) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          Success Rate: {(metric.success_rate * 100).toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground">
                          Threshold: {(metric.threshold * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="relative">
                        <Progress value={metric.success_rate * 100} className="h-3" />
                        <div 
                          className="absolute top-0 h-3 w-0.5 bg-destructive"
                          style={{ left: `${metric.threshold * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Failed Samples */}
                    {metric.failed_samples && metric.failed_samples.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-destructive">
                          Failed Row Samples (first {metric.failed_samples.length}):
                        </p>
                        <div className="bg-muted rounded-lg p-3 max-h-40 overflow-y-auto">
                          <pre className="text-xs font-mono">
                            {JSON.stringify(metric.failed_samples, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Passed Rules */}
          {passedRules.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-success flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Passed Rules ({passedRules.length})
              </p>
              {passedRules.map((metric) => (
                <div
                  key={metric.rule_id}
                  className="border border-success/30 bg-success/5 rounded-lg p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <div>
                        <p className="font-semibold">{metric.rule_name || metric.rule_id.slice(0, 16)}</p>
                        <p className="text-xs text-muted-foreground">
                          Dimension: {metric.dimension.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    {getSeverityBadge(metric.severity)}
                  </div>

                  {/* Compact Metrics */}
                  <div className="flex items-center gap-6 text-sm">
                    <span>
                      <span className="text-muted-foreground">Total:</span>{' '}
                      <span className="font-medium">{metric.total_count.toLocaleString()}</span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Failed:</span>{' '}
                      <span className="font-medium">{metric.failed_count}</span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Rate:</span>{' '}
                      <span className="font-medium text-success">{(metric.success_rate * 100).toFixed(1)}%</span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Threshold:</span>{' '}
                      <span className="font-medium">{(metric.threshold * 100).toFixed(0)}%</span>
                    </span>
                    <span className="text-success font-medium">
                      +{((metric.success_rate - metric.threshold) * 100).toFixed(1)}% margin
                    </span>
                  </div>

                  {/* Mini Progress */}
                  <Progress value={metric.success_rate * 100} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
