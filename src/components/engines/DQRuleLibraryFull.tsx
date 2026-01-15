import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Code,
  Target,
  Shield,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DQRule {
  id: string;
  dataset_id: string;
  profile_id: string | null;
  version: number;
  dimension: string;
  rule_name: string;
  logic_type: string;
  logic_code: string;
  column_name: string | null;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  confidence: number | null;
  business_impact: string | null;
  is_active: boolean;
  calibration_metadata?: {
    source: string;
    observedValue: number;
  };
}

interface DQRuleLibraryFullProps {
  rules: DQRule[];
  isLoading?: boolean;
  version?: number;
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertCircle,
        className: 'bg-destructive/10 text-destructive border-destructive/30',
        badge: 'destructive' as const,
        label: 'CRITICAL'
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        className: 'bg-warning/10 text-warning border-warning/30',
        badge: 'warning' as const,
        label: 'WARNING'
      };
    default:
      return {
        icon: Info,
        className: 'bg-primary/10 text-primary border-primary/30',
        badge: 'secondary' as const,
        label: 'INFO'
      };
  }
}

function getDimensionColor(dimension: string): string {
  switch (dimension.toLowerCase()) {
    case 'completeness':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    case 'uniqueness':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
    case 'validity':
      return 'bg-green-500/10 text-green-600 border-green-500/30';
    case 'accuracy':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
    case 'timeliness':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    case 'consistency':
      return 'bg-pink-500/10 text-pink-600 border-pink-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function DQRuleLibraryFull({ rules, isLoading, version }: DQRuleLibraryFullProps) {
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
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No rules generated yet</p>
          <p className="text-sm text-muted-foreground">Run the pipeline to auto-generate rules from profiling</p>
        </CardContent>
      </Card>
    );
  }

  // Get the latest version
  const latestVersion = version || Math.max(...rules.map(r => r.version));
  const activeRules = rules.filter(r => r.is_active !== false);

  // Group by dimension
  const rulesByDimension = activeRules.reduce((acc, rule) => {
    const dim = rule.dimension || 'other';
    if (!acc[dim]) acc[dim] = [];
    acc[dim].push(rule);
    return acc;
  }, {} as Record<string, DQRule[]>);

  const criticalCount = activeRules.filter(r => r.severity === 'critical').length;
  const warningCount = activeRules.filter(r => r.severity === 'warning').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            STEP 2: RULE LIBRARY
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">v{latestVersion}</Badge>
            <Badge variant="outline">{activeRules.length} Rules</Badge>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-destructive" />
            {criticalCount} Critical
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-warning" />
            {warningCount} Warning
          </span>
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3 text-primary" />
            {activeRules.length - criticalCount - warningCount} Info
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(rulesByDimension).map(([dimension, dimRules]) => (
          <div key={dimension} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={cn("uppercase text-xs", getDimensionColor(dimension))}>
                {dimension}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({dimRules.length} rules)
              </span>
            </div>

            {dimRules.map((rule) => {
              const severityConfig = getSeverityConfig(rule.severity);
              const SeverityIcon = severityConfig.icon;

              return (
                <div
                  key={rule.id}
                  className={cn(
                    "border rounded-lg overflow-hidden",
                    severityConfig.className.split(' ')[0]
                  )}
                >
                  {/* Rule Header */}
                  <div className={cn("p-4 flex items-center justify-between", severityConfig.className)}>
                    <div className="flex items-center gap-3">
                      <SeverityIcon className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">{rule.rule_name}</p>
                        <p className="text-xs opacity-80">
                          {rule.column_name ? `Column: ${rule.column_name}` : 'All columns'}
                        </p>
                      </div>
                    </div>
                    <Badge className={severityConfig.className}>
                      {severityConfig.label}
                    </Badge>
                  </div>

                  {/* Rule Details */}
                  <div className="p-4 bg-background space-y-4">
                    {/* IDs and Meta */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Rule ID:</span>
                        <p className="font-mono text-xs truncate" title={rule.id}>
                          {rule.id}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dimension:</span>
                        <p className="font-medium uppercase">{rule.dimension}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground text-xs">Threshold:</span>
                          <p className="font-bold text-lg">{(rule.threshold * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground text-xs">Confidence:</span>
                          <p className="font-bold text-lg">
                            {rule.confidence !== null ? `${(rule.confidence * 100).toFixed(0)}%` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Logic Type & Code */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Code className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Logic Type:</span>
                        <Badge variant="outline" className="font-mono">
                          {rule.logic_type}
                        </Badge>
                      </div>
                      <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                          {rule.logic_code || `-- ${rule.logic_type} check for ${rule.column_name || 'all columns'}
SELECT COUNT(*) as failed_count
FROM dataset
WHERE ${rule.column_name || 'column'} IS NULL 
   OR ${rule.column_name || 'column'} = ''`}
                        </pre>
                      </div>
                    </div>

                    {/* Business Impact */}
                    {rule.business_impact && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Business Impact:</span>
                        </div>
                        <p className="text-sm bg-muted/50 rounded p-3">
                          {rule.business_impact}
                        </p>
                      </div>
                    )}

                    {/* Calibration Source */}
                    <div className="text-xs text-muted-foreground border-t pt-3 mt-3">
                      <span className="font-medium">Calibration:</span>{' '}
                      {rule.calibration_metadata 
                        ? `Derived from profiling (observed: ${(rule.calibration_metadata.observedValue * 100).toFixed(1)}%, threshold: ${(rule.threshold * 100).toFixed(0)}%)`
                        : 'Auto-calibrated based on data profiling statistics'
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
