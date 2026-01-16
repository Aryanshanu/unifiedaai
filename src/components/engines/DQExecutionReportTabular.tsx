import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock,
  AlertOctagon,
  StopCircle,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  Percent,
  Hash,
  Copy
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
  circuit_breaker_tripped: boolean;
  execution_ts: string;
  execution_time_ms: number | null;
}

interface CircuitBreakerState {
  isTripped: boolean;
  pendingInput: unknown;
  executionSummary: {
    total_rules: number;
    passed: number;
    failed: number;
    critical_failures: number;
  } | null;
}

interface DQExecutionReportTabularProps {
  execution: DQExecution | null;
  isLoading?: boolean;
  circuitBreakerState?: CircuitBreakerState;
  onContinue?: () => void;
  onStop?: () => void;
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

export function DQExecutionReportTabular({ 
  execution, 
  isLoading,
  circuitBreakerState,
  onContinue,
  onStop
}: DQExecutionReportTabularProps) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const toggleRule = (ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

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
          <Skeleton className="h-64" />
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

  // Calculate aggregate metrics
  const avgSuccessRate = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.success_rate, 0) / metrics.length 
    : 0;
  const totalFailed = metrics.reduce((sum, m) => sum + m.failed_count, 0);
  const totalRecords = metrics[0]?.total_count || 0;
  const errorRate = totalRecords > 0 ? (totalFailed / totalRecords) * 100 : 0;
  const nullBlankPercent = metrics
    .filter(m => m.dimension === 'completeness')
    .reduce((sum, m) => sum + (1 - m.success_rate), 0) / 
    Math.max(metrics.filter(m => m.dimension === 'completeness').length, 1) * 100;
  const duplicateRate = metrics
    .filter(m => m.dimension === 'uniqueness')
    .reduce((sum, m) => sum + (1 - m.success_rate), 0) / 
    Math.max(metrics.filter(m => m.dimension === 'uniqueness').length, 1) * 100;

  return (
    <Card className={cn(execution.circuit_breaker_tripped && "border-destructive/50")}>
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
        {/* Circuit Breaker Alert */}
        {(execution.circuit_breaker_tripped || circuitBreakerState?.isTripped) && (
          <Alert variant="destructive" className="border-2">
            <AlertOctagon className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">
              🚨 CIRCUIT BREAKER TRIPPED
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-4">
              <p>Critical data quality failure detected. Downstream tasks stopped to prevent data corruption.</p>
              {onContinue && onStop && (
                <div className="flex gap-3 pt-2">
                  <Button variant="destructive" onClick={onStop} className="gap-2">
                    <StopCircle className="h-4 w-4" />
                    Stop Pipeline
                  </Button>
                  <Button variant="outline" onClick={onContinue} className="gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Continue Anyway
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <Hash className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{metrics.length}</p>
            <p className="text-xs text-muted-foreground">Total Rules</p>
          </div>
          <div className="p-3 bg-success/10 rounded-lg text-center">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-success" />
            <p className="text-2xl font-bold text-success">{passedRules.length}</p>
            <p className="text-xs text-muted-foreground">Passed</p>
          </div>
          <div className="p-3 bg-destructive/10 rounded-lg text-center">
            <XCircle className="h-4 w-4 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{failedRules.length}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
          <div className={cn(
            "p-3 rounded-lg text-center",
            passRate >= 80 ? "bg-success/10" : passRate >= 60 ? "bg-warning/10" : "bg-destructive/10"
          )}>
            <Percent className="h-4 w-4 mx-auto mb-1" />
            <p className={cn(
              "text-2xl font-bold",
              passRate >= 80 ? "text-success" : passRate >= 60 ? "text-warning" : "text-destructive"
            )}>
              {passRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Pass Rate</p>
          </div>
          <div className="p-3 bg-warning/10 rounded-lg text-center">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-warning" />
            <p className="text-2xl font-bold text-warning">{errorRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Error Rate</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <Copy className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{duplicateRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Duplicate Rate</p>
          </div>
        </div>

        {/* Execution Results Table */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Execution Results
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="font-semibold">Rule Name</TableHead>
                  <TableHead className="font-semibold">Dimension</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold text-right">Passed</TableHead>
                  <TableHead className="font-semibold text-right">Failed</TableHead>
                  <TableHead className="font-semibold text-right">Success %</TableHead>
                  <TableHead className="font-semibold text-right">Threshold</TableHead>
                  <TableHead className="font-semibold text-right">Margin</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => {
                  const isExpanded = expandedRules.has(metric.rule_id);
                  const margin = (metric.success_rate - metric.threshold) * 100;
                  const hasSamples = metric.failed_samples && metric.failed_samples.length > 0;
                  
                  return (
                    <Collapsible 
                      key={metric.rule_id} 
                      open={isExpanded} 
                      onOpenChange={() => hasSamples && toggleRule(metric.rule_id)} 
                      asChild
                    >
                      <>
                        <CollapsibleTrigger asChild disabled={!hasSamples}>
                          <TableRow className={cn(
                            "cursor-pointer hover:bg-muted/30",
                            metric.violated && "bg-destructive/5"
                          )}>
                            <TableCell>
                              {hasSamples && (
                                isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {metric.rule_name || metric.rule_id.slice(0, 16)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="uppercase text-xs">
                                {metric.dimension}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {metric.total_count.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-success">
                              {(metric.total_count - metric.failed_count).toLocaleString()}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-mono",
                              metric.failed_count > 0 && "text-destructive"
                            )}>
                              {metric.failed_count.toLocaleString()}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-mono font-bold",
                              metric.violated ? "text-destructive" : "text-success"
                            )}>
                              {(metric.success_rate * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {(metric.threshold * 100).toFixed(0)}%
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-mono font-bold",
                              margin >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {margin >= 0 ? '+' : ''}{margin.toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              {metric.violated ? (
                                <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                                  ❌ FAIL
                                </Badge>
                              ) : (
                                <Badge className="bg-success/10 text-success border-success/30">
                                  ✅ PASS
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        {hasSamples && (
                          <CollapsibleContent asChild>
                            <TableRow className="bg-destructive/5">
                              <TableCell colSpan={10} className="p-4">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-destructive">
                                    Failed Row Samples ({metric.failed_samples!.length}):
                                  </p>
                                  <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-muted/50">
                                          <TableHead className="font-semibold">Row</TableHead>
                                          <TableHead className="font-semibold">Data</TableHead>
                                          <TableHead className="font-semibold">Failure Reason</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {metric.failed_samples!.slice(0, 5).map((sample, idx) => (
                                          <TableRow key={idx}>
                                            <TableCell className="font-mono">{idx + 1}</TableCell>
                                            <TableCell className="font-mono text-xs max-w-md truncate">
                                              {JSON.stringify(sample).slice(0, 100)}...
                                            </TableCell>
                                            <TableCell className="text-destructive">
                                              Violates {metric.dimension} rule
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        )}
                      </>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Quality Score</span>
            <span className={cn(
              "font-bold",
              avgSuccessRate >= 0.80 ? "text-success" : 
              avgSuccessRate >= 0.60 ? "text-warning" : "text-destructive"
            )}>
              {(avgSuccessRate * 100).toFixed(1)}%
            </span>
          </div>
          <Progress value={avgSuccessRate * 100} className="h-3" />
        </div>
      </CardContent>
    </Card>
  );
}
