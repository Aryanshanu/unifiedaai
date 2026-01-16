import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Info,
  Shield,
  Sparkles,
  Target,
  Layers,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DQRule {
  id: string;
  rule_name: string;
  dimension: string;
  severity: string;
  threshold: number;
  is_active: boolean;
  confidence?: number;
  column_name?: string;
  logic_type?: string;
  business_impact?: string;
}

interface DQProfile {
  id: string;
  profile_ts: string;
  row_count: number;
  dataset_id: string;
}

interface DQRuleSummaryProps {
  rules: DQRule[];
  profile?: DQProfile | null;
  isLoading?: boolean;
  version?: number;
}

export function DQRuleSummary({ rules, profile, isLoading, version = 1 }: DQRuleSummaryProps) {
  if (isLoading) {
    return (
      <Card className="mb-4 bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rules || rules.length === 0) {
    return null;
  }

  const activeRules = rules.filter(r => r.is_active !== false);
  const criticalCount = activeRules.filter(r => r.severity === 'critical').length;
  const warningCount = activeRules.filter(r => r.severity === 'warning').length;
  const infoCount = activeRules.filter(r => r.severity === 'info').length;

  // Group by dimension
  const dimensionGroups = activeRules.reduce((acc, rule) => {
    const dim = rule.dimension || 'unknown';
    if (!acc[dim]) acc[dim] = [];
    acc[dim].push(rule);
    return acc;
  }, {} as Record<string, DQRule[]>);

  // Calculate average confidence
  const avgConfidence = activeRules.reduce((sum, r) => sum + (r.confidence || 0.85), 0) / activeRules.length;

  // Get unique columns covered
  const uniqueColumns = new Set(activeRules.map(r => r.column_name).filter(Boolean));

  // Get dimension coverage stats
  const dimensionStats = Object.entries(dimensionGroups).map(([dim, dimRules]) => ({
    dimension: dim,
    count: dimRules.length,
    description: getDimensionDescription(dim)
  }));

  function getDimensionDescription(dim: string): string {
    const descriptions: Record<string, string> = {
      completeness: 'null/empty checks',
      validity: 'format and range checks',
      uniqueness: 'duplicate detection',
      timeliness: 'freshness check',
      consistency: 'cross-field validation',
      accuracy: 'reference data matching'
    };
    return descriptions[dim.toLowerCase()] || 'quality checks';
  }

  return (
    <Card className="mb-4 bg-gradient-to-br from-primary/5 via-background to-transparent border-primary/30 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            RULE GENERATION SUMMARY
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            v{version}
          </Badge>
        </div>
        {profile && (
          <p className="text-sm text-muted-foreground">
            Generated from profiling run at{' '}
            <span className="font-mono">{format(new Date(profile.profile_ts), 'MMM d, yyyy HH:mm:ss')}</span>
            {' '}| Based on dataset with{' '}
            <span className="font-bold">{profile.row_count.toLocaleString()}</span> rows
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Total Rules */}
          <div className="p-3 bg-background/60 rounded-lg border text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{activeRules.length}</p>
            <p className="text-xs text-muted-foreground">Rules Generated</p>
          </div>

          {/* Critical */}
          <div className={cn(
            "p-3 rounded-lg border text-center",
            criticalCount > 0 ? "bg-destructive/10 border-destructive/30" : "bg-background/60"
          )}>
            <Shield className={cn("h-5 w-5 mx-auto mb-1", criticalCount > 0 ? "text-destructive" : "text-muted-foreground")} />
            <p className={cn("text-2xl font-bold", criticalCount > 0 && "text-destructive")}>{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Critical (block)</p>
          </div>

          {/* Warning */}
          <div className={cn(
            "p-3 rounded-lg border text-center",
            warningCount > 0 ? "bg-warning/10 border-warning/30" : "bg-background/60"
          )}>
            <AlertTriangle className={cn("h-5 w-5 mx-auto mb-1", warningCount > 0 ? "text-warning" : "text-muted-foreground")} />
            <p className={cn("text-2xl font-bold", warningCount > 0 && "text-warning")}>{warningCount}</p>
            <p className="text-xs text-muted-foreground">Warning (alert)</p>
          </div>

          {/* Info */}
          <div className="p-3 bg-background/60 rounded-lg border text-center">
            <Info className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{infoCount}</p>
            <p className="text-xs text-muted-foreground">Info (monitor)</p>
          </div>

          {/* Columns Covered */}
          <div className="p-3 bg-background/60 rounded-lg border text-center">
            <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{uniqueColumns.size}</p>
            <p className="text-xs text-muted-foreground">Columns Covered</p>
          </div>
        </div>

        {/* Dimension Coverage */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <Layers className="h-4 w-4" />
            Dimension Coverage
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {dimensionStats.map(({ dimension, count, description }) => (
              <div 
                key={dimension}
                className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg"
              >
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize truncate">{dimension}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} rules - {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calibration Info */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Calibration</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Avg Confidence</p>
              <p className="text-sm font-mono font-bold">{(avgConfidence * 100).toFixed(1)}%</p>
            </div>
            <Progress value={avgConfidence * 100} className="w-24 h-2" />
          </div>
        </div>

        {/* Generation Note */}
        <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Auto-calibrated thresholds:</span>{' '}
              Thresholds are set 5% below observed values to catch degradation while avoiding false positives.
              Critical rules will block data pipeline execution if failed.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
