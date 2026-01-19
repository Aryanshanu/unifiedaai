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
import {
  detectUnit,
  normalizeToRatio,
  validateExecutionTruth,
  validateRatio,
} from '@/lib/dq-truth-enforcement';

// ============================================
// TRUTH ENFORCEMENT: Unit normalization helpers
// ============================================

/**
 * TRUTH CONTRACT: Normalize any rate to ratio (0-1)
 * Backend may send ratio (0-1) or percentage (0-100)
 */
function toRatio(value: number): number {
  const unit = detectUnit(value);
  return normalizeToRatio(value, unit);
}

/**
 * TRUTH CONTRACT: Convert ratio to percentage for DISPLAY ONLY
 */
function toDisplayPercent(ratio: number): string {
  const validation = validateRatio(ratio);
  if (!validation.valid) {
    console.error(`[TRUTH VIOLATION] Invalid ratio: ${ratio}`);
    return 'INVALID';
  }
  return `${(ratio * 100).toFixed(1)}%`;
}

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

interface DQExecutionReportTabularProps {
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

export function DQExecutionReportTabular({ 
  execution, 
  isLoading
}: DQExecutionReportTabularProps) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
  
  // TRUTH CONTRACT: Calculate from counts, not from metrics
  const passedRules = metrics.filter(m => !m.violated);
  const failedRules = metrics.filter(m => m.violated);
  const criticalFailures = failedRules.filter(m => m.severity === 'critical');
  
  // EXECUTION TRUTH VALIDATION
  const executionTruthResult = validateExecutionTruth(
    passedRules.length,
    failedRules.length,
    metrics.length
  );
  
  if (!executionTruthResult.valid && executionTruthResult.error) {
    console.error(`[TRUTH VIOLATION] ${executionTruthResult.error}`);
  }
  
  // Pass rate from counts
  const passRate = metrics.length > 0 ? passedRules.length / metrics.length : 0;

  // TRUTH CONTRACT: Normalize all metrics to ratio space, then display as percentage
  const normalizedMetrics = metrics.map(m => ({
    ...m,
    // Normalize success_rate to ratio (0-1)
    successRateRatio: toRatio(m.success_rate),
    // Normalize threshold to ratio (0-1)
    thresholdRatio: toRatio(m.threshold),
  }));

  // Calculate aggregate metrics in RATIO SPACE
  const avgSuccessRatio = normalizedMetrics.length > 0 
    ? normalizedMetrics.reduce((sum, m) => sum + m.successRateRatio, 0) / normalizedMetrics.length 
    : 0;
  
  // TRUTH CONTRACT: Error Rate = Failed Rules / Total Rules (aligns with Pass Rate)
  // Pass Rate + Error Rate = 100%
  const errorRatio = metrics.length > 0 ? failedRules.length / metrics.length : 0;
  
  // Calculate null/blank from completeness dimension
  const completenessMetrics = normalizedMetrics.filter(m => m.dimension === 'completeness');
  const nullBlankRatio = completenessMetrics.length > 0
    ? completenessMetrics.reduce((sum, m) => sum + (1 - m.successRateRatio), 0) / completenessMetrics.length
    : 0;
  
  // Calculate duplicate rate from uniqueness dimension
  const uniquenessMetrics = normalizedMetrics.filter(m => m.dimension === 'uniqueness');
  const duplicateRatio = uniquenessMetrics.length > 0
    ? uniquenessMetrics.reduce((sum, m) => sum + (1 - m.successRateRatio), 0) / uniquenessMetrics.length
    : 0;

  return (
    <Card className={cn(execution.summary?.critical_failure && "border-destructive/50")}>
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
        {/* Critical Failure Alert */}
        {execution.summary?.critical_failure && (
          <Alert variant="destructive" className="border-2">
            <AlertOctagon className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">
              ⚠️ CRITICAL FAILURE DETECTED
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p>Critical data quality issues found. Review the failed rules below.</p>
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
            passRate >= 0.8 ? "bg-success/10" : passRate >= 0.6 ? "bg-warning/10" : "bg-destructive/10"
          )}>
            <Percent className="h-4 w-4 mx-auto mb-1" />
            <p className={cn(
              "text-2xl font-bold",
              passRate >= 0.8 ? "text-success" : passRate >= 0.6 ? "text-warning" : "text-destructive"
            )}>
              {/* DISPLAY: Convert ratio to percentage */}
              {(passRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Pass Rate</p>
          </div>
          <div className="p-3 bg-warning/10 rounded-lg text-center">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-warning" />
            {/* DISPLAY: Convert ratio to percentage */}
            <p className="text-2xl font-bold text-warning">{(errorRatio * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Error Rate</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <Copy className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            {/* DISPLAY: Convert ratio to percentage */}
            <p className="text-2xl font-bold">{(duplicateRatio * 100).toFixed(1)}%</p>
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
                {normalizedMetrics.map((metric) => {
                  const isExpanded = expandedRules.has(metric.rule_id);
                  // TRUTH CONTRACT: Calculate margin in ratio space, display as percentage
                  const marginRatio = metric.successRateRatio - metric.thresholdRatio;
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
                              {/* DISPLAY: Convert ratio to percentage */}
                              {(metric.successRateRatio * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {/* DISPLAY: Convert ratio to percentage */}
                              {(metric.thresholdRatio * 100).toFixed(0)}%
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-mono font-bold",
                              marginRatio >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {/* DISPLAY: Convert ratio to percentage */}
                              {marginRatio >= 0 ? '+' : ''}{(marginRatio * 100).toFixed(1)}%
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
              avgSuccessRatio >= 0.80 ? "text-success" : 
              avgSuccessRatio >= 0.60 ? "text-warning" : "text-destructive"
            )}>
              {/* DISPLAY: Convert ratio to percentage */}
              {(avgSuccessRatio * 100).toFixed(1)}%
            </span>
          </div>
          <Progress value={avgSuccessRatio * 100} className="h-3" />
        </div>
      </CardContent>
    </Card>
  );
}
