import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Shield,
  Sparkles,
  Target,
  Layers,
  Clock,
  Code,
  ChevronDown,
  ChevronRight,
  Star,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
  business_impact: 'high' | 'medium' | 'low' | string | null;
  is_active: boolean;
  is_critical_element?: boolean;
  calibration_metadata?: {
    source: string;
    observedValue: number;
  };
}

interface DQProfile {
  id: string;
  profile_ts: string;
  row_count: number;
  dataset_id: string;
}

interface DQRulesUnifiedProps {
  rules: DQRule[];
  profile?: DQProfile | null;
  isLoading?: boolean;
  onRuleUpdate?: (ruleId: string, updates: Partial<DQRule>) => void;
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertCircle,
        className: 'bg-destructive/10 text-destructive border-destructive/30',
        label: 'CRITICAL'
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        className: 'bg-warning/10 text-warning border-warning/30',
        label: 'WARNING'
      };
    default:
      return {
        icon: Info,
        className: 'bg-primary/10 text-primary border-primary/30',
        label: 'INFO'
      };
  }
}

function getDimensionBadge(dimension: string) {
  const colors: Record<string, string> = {
    completeness: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    uniqueness: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    validity: 'bg-green-500/10 text-green-600 border-green-500/30',
    accuracy: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    timeliness: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    consistency: 'bg-pink-500/10 text-pink-600 border-pink-500/30',
  };
  return colors[dimension.toLowerCase()] || 'bg-muted text-muted-foreground';
}

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

// Business impact badge styling
function getBusinessImpactBadge(impact: string | null) {
  switch (impact) {
    case 'high':
      return { className: 'bg-destructive/10 text-destructive border-destructive/30', label: 'High', icon: TrendingUp };
    case 'medium':
      return { className: 'bg-warning/10 text-warning border-warning/30', label: 'Medium', icon: TrendingUp };
    case 'low':
      return { className: 'bg-muted text-muted-foreground border-muted', label: 'Low', icon: TrendingUp };
    default:
      return null;
  }
}

export function DQRulesUnified({ rules, profile, isLoading, onRuleUpdate }: DQRulesUnifiedProps) {
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

  const handleCriticalToggle = (ruleId: string, checked: boolean) => {
    onRuleUpdate?.(ruleId, { is_critical_element: checked });
  };

  const handleBusinessImpactChange = (ruleId: string, value: string) => {
    const impact = value === 'none' ? null : value as 'high' | 'medium' | 'low';
    onRuleUpdate?.(ruleId, { business_impact: impact });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 mb-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
          <Skeleton className="h-64" />
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

  const activeRules = rules.filter(r => r.is_active !== false);
  const criticalCount = activeRules.filter(r => r.severity === 'critical').length;
  const warningCount = activeRules.filter(r => r.severity === 'warning').length;
  const infoCount = activeRules.length - criticalCount - warningCount;
  const latestVersion = Math.max(...rules.map(r => r.version));
  
  // CDE and business impact stats
  const cdeCount = activeRules.filter(r => r.is_critical_element).length;
  const highImpactCount = activeRules.filter(r => r.business_impact === 'high').length;

  // Group by dimension
  const dimensionGroups = activeRules.reduce((acc, rule) => {
    const dim = rule.dimension || 'unknown';
    if (!acc[dim]) acc[dim] = [];
    acc[dim].push(rule);
    return acc;
  }, {} as Record<string, DQRule[]>);

  // Calculate average confidence
  const rulesWithConfidence = activeRules.filter(r => r.confidence != null);
  const avgConfidence = rulesWithConfidence.length > 0
    ? rulesWithConfidence.reduce((sum, r) => sum + r.confidence!, 0) / rulesWithConfidence.length
    : null;

  // Get unique columns covered
  const uniqueColumns = new Set(activeRules.map(r => r.column_name).filter(Boolean));

  // Get dimension coverage stats
  const dimensionStats = Object.entries(dimensionGroups).map(([dim, dimRules]) => ({
    dimension: dim,
    count: dimRules.length,
    description: getDimensionDescription(dim)
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            STEP 2: RULES
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            v{latestVersion}
          </Badge>
        </div>
        {profile && (
          <p className="text-sm text-muted-foreground">
            Generated from profiling at{' '}
            <span className="font-mono">{format(new Date(profile.profile_ts), 'MMM d, yyyy HH:mm:ss')}</span>
            {' '}| {profile.row_count.toLocaleString()} rows analyzed
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overview Stats - Now with 7 columns including CDE and High Impact */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 bg-background/60 rounded-lg border text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{activeRules.length}</p>
            <p className="text-xs text-muted-foreground">Rules Generated</p>
          </div>

          <div className={cn(
            "p-3 rounded-lg border text-center",
            criticalCount > 0 ? "bg-destructive/10 border-destructive/30" : "bg-background/60"
          )}>
            <Shield className={cn("h-5 w-5 mx-auto mb-1", criticalCount > 0 ? "text-destructive" : "text-muted-foreground")} />
            <p className={cn("text-2xl font-bold", criticalCount > 0 && "text-destructive")}>{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Critical (block)</p>
          </div>

          <div className={cn(
            "p-3 rounded-lg border text-center",
            warningCount > 0 ? "bg-warning/10 border-warning/30" : "bg-background/60"
          )}>
            <AlertTriangle className={cn("h-5 w-5 mx-auto mb-1", warningCount > 0 ? "text-warning" : "text-muted-foreground")} />
            <p className={cn("text-2xl font-bold", warningCount > 0 && "text-warning")}>{warningCount}</p>
            <p className="text-xs text-muted-foreground">Warning (alert)</p>
          </div>

          <div className="p-3 bg-background/60 rounded-lg border text-center">
            <Info className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{infoCount}</p>
            <p className="text-xs text-muted-foreground">Info (monitor)</p>
          </div>

          <div className="p-3 bg-background/60 rounded-lg border text-center">
            <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{uniqueColumns.size}</p>
            <p className="text-xs text-muted-foreground">Columns Covered</p>
          </div>

          {/* New: CDE Count */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "p-3 rounded-lg border text-center cursor-help",
                  cdeCount > 0 ? "bg-primary/10 border-primary/30" : "bg-background/60"
                )}>
                  <Star className={cn("h-5 w-5 mx-auto mb-1", cdeCount > 0 ? "text-primary" : "text-muted-foreground")} />
                  <p className={cn("text-2xl font-bold", cdeCount > 0 && "text-primary")}>{cdeCount}</p>
                  <p className="text-xs text-muted-foreground">CDE Tagged</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Critical Data Elements</p>
                <p className="text-xs text-muted-foreground">Rules marked as critical for business operations</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* New: High Impact Count */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "p-3 rounded-lg border text-center cursor-help",
                  highImpactCount > 0 ? "bg-destructive/10 border-destructive/30" : "bg-background/60"
                )}>
                  <TrendingUp className={cn("h-5 w-5 mx-auto mb-1", highImpactCount > 0 ? "text-destructive" : "text-muted-foreground")} />
                  <p className={cn("text-2xl font-bold", highImpactCount > 0 && "text-destructive")}>{highImpactCount}</p>
                  <p className="text-xs text-muted-foreground">High Impact</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">High Business Impact</p>
                <p className="text-xs text-muted-foreground">Rules affecting revenue, compliance, or operations</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Dimension Coverage */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <Layers className="h-4 w-4" />
            Dimension Coverage
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {dimensionStats.map(({ dimension, count, description }) => (
              <div 
                key={dimension}
                className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg"
              >
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize truncate">{dimension}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} rules
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rules Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead className="font-semibold">Rule Name</TableHead>
                <TableHead className="font-semibold">Dimension</TableHead>
                <TableHead className="font-semibold">Column</TableHead>
                <TableHead className="font-semibold text-right">Threshold</TableHead>
                <TableHead className="font-semibold">Severity</TableHead>
                <TableHead className="font-semibold text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 mx-auto">
                        <Star className="h-3.5 w-3.5" />
                        CDE
                      </TooltipTrigger>
                      <TooltipContent>Critical Data Element</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="font-semibold">Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeRules.map((rule) => {
                const severityConfig = getSeverityConfig(rule.severity);
                const businessImpactConfig = getBusinessImpactBadge(rule.business_impact);
                const isExpanded = expandedRules.has(rule.id);
                
                return (
                  <Collapsible key={rule.id} open={isExpanded} onOpenChange={() => toggleRule(rule.id)} asChild>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/30">
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {rule.rule_name}
                              {rule.is_critical_element && (
                                <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("uppercase text-xs", getDimensionBadge(rule.dimension))}>
                              {rule.dimension}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {rule.column_name || 'All'}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {(rule.threshold * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell>
                            <Badge className={severityConfig.className}>
                              {severityConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={rule.is_critical_element ?? false}
                              onCheckedChange={(checked) => handleCriticalToggle(rule.id, checked)}
                              disabled={!onRuleUpdate}
                            />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {onRuleUpdate ? (
                              <Select
                                value={rule.business_impact || 'none'}
                                onValueChange={(value) => handleBusinessImpactChange(rule.id, value)}
                              >
                                <SelectTrigger className="h-7 w-24 text-xs">
                                  <SelectValue placeholder="Set" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : businessImpactConfig ? (
                              <Badge className={businessImpactConfig.className}>
                                {businessImpactConfig.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={8} className="p-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Rule ID:</span>
                                  <p className="font-mono text-xs">{rule.id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Profile ID:</span>
                                  <p className="font-mono text-xs">{rule.profile_id || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Confidence:</span>
                                  <p className="font-mono text-xs">
                                    {rule.confidence !== null 
                                      ? `${(rule.confidence * 100).toFixed(1)}%` 
                                      : 'N/A'}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Code className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Logic Code:</span>
                                </div>
                                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                                  <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                                    {rule.logic_code || `-- ${rule.logic_type} check for ${rule.column_name || 'all columns'}`}
                                  </pre>
                                </div>
                              </div>

                              {rule.business_impact && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Business Impact:</span>
                                  </div>
                                  <p className="text-sm bg-muted rounded p-3">
                                    {rule.business_impact}
                                  </p>
                                </div>
                              )}

                              <div className="text-xs text-muted-foreground border-t pt-3">
                                <span className="font-medium">Calibration:</span>{' '}
                                {rule.calibration_metadata 
                                  ? `Observed: ${(rule.calibration_metadata.observedValue * 100).toFixed(1)}%, Threshold: ${(rule.threshold * 100).toFixed(0)}%`
                                  : 'Auto-calibrated from profiling'
                                }
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Calibration Info */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Calibration</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Avg Confidence</p>
              {avgConfidence !== null ? (
                <p className="text-sm font-mono font-bold">{(avgConfidence * 100).toFixed(1)}%</p>
              ) : (
                <p className="text-sm font-mono text-muted-foreground">Default</p>
              )}
            </div>
            <Progress value={avgConfidence !== null ? avgConfidence * 100 : 0} className="w-24 h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
