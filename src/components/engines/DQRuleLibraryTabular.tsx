import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  BookOpen, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Code,
  Target,
  Shield,
  Gauge,
  ChevronDown,
  ChevronRight
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

interface DQRuleLibraryTabularProps {
  rules: DQRule[];
  isLoading?: boolean;
  version?: number;
  deduplicatedCount?: number;
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertCircle,
        className: 'bg-destructive/10 text-destructive border-destructive/30',
        label: '🔴 CRITICAL'
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        className: 'bg-warning/10 text-warning border-warning/30',
        label: '🟡 WARNING'
      };
    default:
      return {
        icon: Info,
        className: 'bg-primary/10 text-primary border-primary/30',
        label: '🔵 INFO'
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

export function DQRuleLibraryTabular({ rules, isLoading, version }: DQRuleLibraryTabularProps) {
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
        <CardContent>
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

  const latestVersion = version || Math.max(...rules.map(r => r.version));
  const activeRules = rules.filter(r => r.is_active !== false);
  const criticalCount = activeRules.filter(r => r.severity === 'critical').length;
  const warningCount = activeRules.filter(r => r.severity === 'warning').length;
  const infoCount = activeRules.length - criticalCount - warningCount;

  // Group by dimension
  const rulesByDimension = activeRules.reduce((acc, rule) => {
    const dim = rule.dimension || 'other';
    if (!acc[dim]) acc[dim] = [];
    acc[dim].push(rule);
    return acc;
  }, {} as Record<string, DQRule[]>);

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
        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-sm">
          <Badge className="bg-destructive/10 text-destructive border-destructive/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            {criticalCount} Critical
          </Badge>
          <Badge className="bg-warning/10 text-warning border-warning/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {warningCount} Warning
          </Badge>
          <Badge className="bg-primary/10 text-primary border-primary/30">
            <Info className="h-3 w-3 mr-1" />
            {infoCount} Info
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rules Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead className="font-semibold">Rule Name</TableHead>
                <TableHead className="font-semibold">Dimension</TableHead>
                <TableHead className="font-semibold">Logic Type</TableHead>
                <TableHead className="font-semibold">Column</TableHead>
                <TableHead className="font-semibold text-right">Threshold</TableHead>
                <TableHead className="font-semibold">Severity</TableHead>
                <TableHead className="font-semibold text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeRules.map((rule) => {
                const severityConfig = getSeverityConfig(rule.severity);
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
                          <TableCell className="font-medium">{rule.rule_name}</TableCell>
                          <TableCell>
                            <Badge className={cn("uppercase text-xs", getDimensionBadge(rule.dimension))}>
                              {rule.dimension}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {rule.logic_type}
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
                          <TableCell className="text-right font-mono">
                            {rule.confidence !== null 
                              ? `${(rule.confidence * 100).toFixed(0)}%` 
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={8} className="p-4">
                            <div className="space-y-4">
                              {/* Rule ID */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Full Rule ID:</span>
                                  <p className="font-mono text-xs">{rule.id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Profile ID:</span>
                                  <p className="font-mono text-xs">{rule.profile_id || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Logic Code */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Code className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Logic Code:</span>
                                </div>
                                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                                  <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                                    {rule.logic_code || `-- ${rule.logic_type} check for ${rule.column_name || 'all columns'}\nSELECT COUNT(*) as failed_count\nFROM dataset\nWHERE ${rule.column_name || 'column'} IS NULL OR ${rule.column_name || 'column'} = ''`}
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
                                  <p className="text-sm bg-muted rounded p-3">
                                    {rule.business_impact}
                                  </p>
                                </div>
                              )}

                              {/* Calibration Source */}
                              <div className="text-xs text-muted-foreground border-t pt-3">
                                <span className="font-medium">Calibration Source:</span>{' '}
                                {rule.calibration_metadata 
                                  ? `Derived from profiling (observed: ${(rule.calibration_metadata.observedValue * 100).toFixed(1)}%, threshold: ${(rule.threshold * 100).toFixed(0)}%)`
                                  : 'Auto-calibrated based on data profiling statistics'
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

        {/* Summary by Dimension */}
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(rulesByDimension).map(([dim, dimRules]) => (
            <div key={dim} className="p-3 border rounded-lg text-center">
              <Badge className={cn("uppercase text-xs mb-2", getDimensionBadge(dim))}>
                {dim}
              </Badge>
              <p className="text-lg font-bold">{dimRules.length}</p>
              <p className="text-xs text-muted-foreground">rules</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
