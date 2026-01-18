import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  LayoutDashboard, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Target,
  Gauge,
  Award
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
}

interface DQDashboardData {
  id: string;
  execution_id: string;
  dataset_id: string;
  generated_at: string;
  overall_score: number;
  grade: string;
  total_rules: number;
  passed_rules: number;
  failed_rules: number;
  dimensions: {
    dimension: string;
    score: number;
    rules_checked: number;
    violations: number;
  }[];
  hotspots: {
    rule_name: string;
    dimension: string;
    score: number;
    threshold: number;
    gap: number;
    severity: string;
  }[];
  metrics: {
    error_rate: number;
    null_blank_percent: number;
    duplicate_rate: number;
    freshness_score: number;
    consistency_score: number;
  };
}

interface DQDashboardVisualProps {
  assets: {
    id: string;
    execution_id: string;
    dataset_id: string;
    summary_sql: string;
    hotspots_sql: string;
    dimension_breakdown_sql: string;
    generated_at: string;
  } | null;
  executionMetrics?: DQExecutionMetric[];
  isLoading?: boolean;
}

function getGradeConfig(grade: string) {
  switch (grade) {
    case 'A':
      return { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', label: 'Excellent' };
    case 'B':
      return { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', label: 'Good' };
    case 'C':
      return { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', label: 'Fair' };
    case 'D':
      return { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Poor' };
    default:
      return { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', label: 'Critical' };
  }
}

function getScoreGrade(score: number): string {
  if (score >= 95) return 'A';
  if (score >= 85) return 'B';
  if (score >= 70) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function getDimensionColor(dimension: string): string {
  const colors: Record<string, string> = {
    completeness: 'bg-blue-500',
    uniqueness: 'bg-purple-500',
    validity: 'bg-green-500',
    accuracy: 'bg-orange-500',
    timeliness: 'bg-yellow-500',
    consistency: 'bg-pink-500',
  };
  return colors[dimension.toLowerCase()] || 'bg-muted';
}

export function DQDashboardVisual({ assets, executionMetrics, isLoading }: DQDashboardVisualProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!assets && !executionMetrics) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No dashboard data yet</p>
          <p className="text-sm text-muted-foreground">Run the pipeline to generate dashboard</p>
        </CardContent>
      </Card>
    );
  }

  // Compute dashboard data from execution metrics
  const metrics = executionMetrics || [];
  const totalRules = metrics.length;
  const passedRules = metrics.filter(m => !m.violated).length;
  const failedRules = metrics.filter(m => m.violated).length;
  const overallScore = metrics.length > 0 
    ? (metrics.reduce((sum, m) => sum + m.success_rate, 0) / metrics.length) * 100 
    : 0;
  const grade = getScoreGrade(overallScore);
  const gradeConfig = getGradeConfig(grade);

  // Group by dimension
  const dimensionGroups = metrics.reduce((acc, m) => {
    const dim = m.dimension.toLowerCase();
    if (!acc[dim]) {
      acc[dim] = { total: 0, sum: 0, violated: 0 };
    }
    acc[dim].total++;
    acc[dim].sum += m.success_rate;
    if (m.violated) acc[dim].violated++;
    return acc;
  }, {} as Record<string, { total: number; sum: number; violated: number }>);

  const dimensions = Object.entries(dimensionGroups).map(([dim, data]) => ({
    dimension: dim,
    score: (data.sum / data.total) * 100,
    rules_checked: data.total,
    violations: data.violated,
  }));

  // Get hotspots (worst performers)
  const hotspots = metrics
    .filter(m => m.violated)
    .sort((a, b) => a.success_rate - b.success_rate)
    .slice(0, 5)
    .map(m => ({
      rule_name: m.rule_name || m.rule_id.slice(0, 16),
      dimension: m.dimension,
      score: m.success_rate * 100,
      threshold: m.threshold * 100,
      gap: (m.threshold - m.success_rate) * 100,
      severity: m.severity,
    }));

  // Calculate quality metrics
  const totalRecords = metrics[0]?.total_count || 0;
  const totalFailed = metrics.reduce((sum, m) => sum + m.failed_count, 0);
  const errorRate = totalRecords > 0 ? (totalFailed / totalRecords / metrics.length) * 100 : 0;
  
  const completenessMetrics = metrics.filter(m => m.dimension.toLowerCase() === 'completeness');
  const nullBlankPercent = completenessMetrics.length > 0
    ? (1 - completenessMetrics.reduce((sum, m) => sum + m.success_rate, 0) / completenessMetrics.length) * 100
    : 0;

  const uniquenessMetrics = metrics.filter(m => m.dimension.toLowerCase() === 'uniqueness');
  const duplicateRate = uniquenessMetrics.length > 0
    ? (1 - uniquenessMetrics.reduce((sum, m) => sum + m.success_rate, 0) / uniquenessMetrics.length) * 100
    : 0;

  const timelinessMetrics = metrics.filter(m => m.dimension.toLowerCase() === 'timeliness');
  // GOVERNANCE FIX: Remove default 100% - show null if not evaluated
  const freshnessScore = timelinessMetrics.length > 0
    ? timelinessMetrics.reduce((sum, m) => sum + m.success_rate, 0) / timelinessMetrics.length * 100
    : null;

  const consistencyMetrics = metrics.filter(m => m.dimension.toLowerCase() === 'consistency');
  // GOVERNANCE FIX: Remove default 100% - show null if not evaluated
  const consistencyScore = consistencyMetrics.length > 0
    ? consistencyMetrics.reduce((sum, m) => sum + m.success_rate, 0) / consistencyMetrics.length * 100
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            STEP 4: DATA QUALITY DASHBOARD
          </CardTitle>
          {assets && (
            <Badge variant="outline" className="text-xs">
              Generated: {format(new Date(assets.generated_at), 'MMM d, HH:mm')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Quality Score Card */}
        <div className="grid grid-cols-5 gap-4">
          {/* Grade Card */}
          <div className={cn("p-4 rounded-lg border-2 text-center", gradeConfig.bg, gradeConfig.border)}>
            <Award className={cn("h-6 w-6 mx-auto mb-2", gradeConfig.color)} />
            <p className={cn("text-4xl font-bold", gradeConfig.color)}>{grade}</p>
            <p className="text-sm text-muted-foreground">{gradeConfig.label}</p>
            <p className={cn("text-lg font-mono", gradeConfig.color)}>{overallScore.toFixed(1)}%</p>
          </div>

          {/* Rules Stats */}
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <Target className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-3xl font-bold">{totalRules}</p>
            <p className="text-xs text-muted-foreground">Rules Executed</p>
          </div>

          <div className="p-4 bg-success/10 rounded-lg text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-success" />
            <p className="text-3xl font-bold text-success">{passedRules}</p>
            <p className="text-xs text-muted-foreground">Passed</p>
          </div>

          <div className="p-4 bg-destructive/10 rounded-lg text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-destructive" />
            <p className="text-3xl font-bold text-destructive">{failedRules}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>

          <div className={cn(
            "p-4 rounded-lg text-center",
            passedRules / totalRules >= 0.8 ? "bg-success/10" : "bg-warning/10"
          )}>
            <Gauge className="h-5 w-5 mx-auto mb-2" />
            <p className={cn(
              "text-3xl font-bold",
              passedRules / totalRules >= 0.8 ? "text-success" : "text-warning"
            )}>
              {totalRules > 0 ? ((passedRules / totalRules) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Pass Rate</p>
          </div>
        </div>

        {/* Dimension Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dimension Breakdown
          </h4>
          <div className="space-y-3">
            {dimensions.sort((a, b) => a.score - b.score).map((dim) => {
              const statusIcon = dim.score >= 85 ? '✅' : dim.score >= 70 ? '⚠️' : '❌';
              return (
                <div key={dim.dimension} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium flex items-center gap-2">
                      <span className={cn("w-3 h-3 rounded-full", getDimensionColor(dim.dimension))} />
                      {dim.dimension}
                      <span className="text-muted-foreground">({dim.rules_checked} rules)</span>
                    </span>
                    <span className={cn(
                      "font-bold",
                      dim.score >= 85 ? "text-success" : 
                      dim.score >= 70 ? "text-warning" : "text-destructive"
                    )}>
                      {statusIcon} {dim.score.toFixed(1)}%
                      {dim.violations > 0 && (
                        <span className="text-destructive ml-2">({dim.violations} violations)</span>
                      )}
                    </span>
                  </div>
                  <Progress 
                    value={dim.score} 
                    className="h-3"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Hotspots Table */}
        {hotspots.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-destructive uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Hotspots (Top Issues)
            </h4>
            <div className="border border-destructive/30 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-destructive/5">
                    <TableHead className="font-semibold">Rule</TableHead>
                    <TableHead className="font-semibold">Dimension</TableHead>
                    <TableHead className="font-semibold text-right">Score</TableHead>
                    <TableHead className="font-semibold text-right">Threshold</TableHead>
                    <TableHead className="font-semibold text-right">Gap</TableHead>
                    <TableHead className="font-semibold">Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotspots.map((hotspot, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{hotspot.rule_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-xs">
                          {hotspot.dimension}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive font-bold">
                        {hotspot.score.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {hotspot.threshold.toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive font-bold">
                        -{hotspot.gap.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          hotspot.severity === 'critical' && 'bg-destructive/10 text-destructive',
                          hotspot.severity === 'warning' && 'bg-warning/10 text-warning',
                          hotspot.severity === 'info' && 'bg-primary/10 text-primary'
                        )}>
                          {hotspot.severity === 'critical' ? '🔴 CRITICAL' : 
                           hotspot.severity === 'warning' ? '🟡 WARNING' : '🔵 INFO'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Quality Metrics Summary Table */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Quality Metrics Summary
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Metric</TableHead>
                  <TableHead className="font-semibold">Value</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Total Records Analyzed</TableCell>
                  <TableCell className="font-mono">{totalRecords.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Baseline</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Error Rate</TableCell>
                  <TableCell className={cn("font-mono", errorRate > 5 && "text-destructive")}>
                    {errorRate.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Badge className={errorRate <= 5 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                      {errorRate <= 5 ? '✓ Acceptable' : '✗ High'}
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Null/Blank Percentage</TableCell>
                  <TableCell className={cn("font-mono", nullBlankPercent > 5 && "text-warning")}>
                    {nullBlankPercent.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Badge className={nullBlankPercent <= 5 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                      {nullBlankPercent <= 5 ? '✓ Complete' : '⚠ Missing Data'}
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Duplicate Rate</TableCell>
                  <TableCell className={cn("font-mono", duplicateRate > 1 && "text-warning")}>
                    {duplicateRate.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Badge className={duplicateRate <= 1 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                      {duplicateRate <= 1 ? '✓ Unique' : '⚠ Duplicates'}
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Freshness Score</TableCell>
                  <TableCell className="font-mono">
                    {freshnessScore !== null ? `${freshnessScore.toFixed(1)}%` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {freshnessScore !== null ? (
                      <Badge className={freshnessScore >= 80 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                        {freshnessScore >= 80 ? '✓ Current' : '⚠ Stale'}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Evaluated</Badge>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Consistency Score</TableCell>
                  <TableCell className="font-mono">
                    {consistencyScore !== null ? `${consistencyScore.toFixed(1)}%` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {consistencyScore !== null ? (
                      <Badge className={consistencyScore >= 90 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                        {consistencyScore >= 90 ? '✓ Consistent' : '⚠ Inconsistent'}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Evaluated</Badge>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
