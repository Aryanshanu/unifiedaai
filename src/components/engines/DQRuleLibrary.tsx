import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BookOpen, ChevronDown, AlertTriangle, AlertCircle, Info, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DQRule } from '@/hooks/useDQControlPlane';

interface DQRuleLibraryProps {
  rules: DQRule[];
  isLoading?: boolean;
}

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const },
  warning: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', badge: 'secondary' as const },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'outline' as const }
};

const DIMENSION_COLORS: Record<string, string> = {
  completeness: 'bg-blue-500',
  validity: 'bg-green-500',
  accuracy: 'bg-purple-500',
  uniqueness: 'bg-orange-500',
  timeliness: 'bg-pink-500',
  consistency: 'bg-cyan-500'
};

export function DQRuleLibrary({ rules, isLoading }: DQRuleLibraryProps) {
  const [expandedRules, setExpandedRules] = React.useState<Set<string>>(new Set());

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

  const latestVersion = rules.length > 0 ? Math.max(...rules.map(r => r.version)) : 0;
  const activeRules = rules.filter(r => r.is_active);

  if (!rules.length && !isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            RULE LIBRARY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No rules generated yet</p>
            <p className="text-xs mt-1">Rules are auto-calibrated from profiling data</p>
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
            <BookOpen className="h-4 w-4 text-primary animate-pulse" />
            RULE LIBRARY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            RULE LIBRARY
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Version: {latestVersion}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {activeRules.length} rules
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px]">
          <div className="space-y-2">
            {activeRules.map((rule) => {
              const severityConfig = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.info;
              const SeverityIcon = severityConfig.icon;
              const isExpanded = expandedRules.has(rule.id);

              return (
                <Collapsible key={rule.id} open={isExpanded} onOpenChange={() => toggleRule(rule.id)}>
                  <div className={cn("border rounded-lg overflow-hidden", severityConfig.bg)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="p-3 flex items-start justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <SeverityIcon className={cn("h-4 w-4 mt-0.5", severityConfig.color)} />
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{rule.rule_name}</span>
                              <Badge 
                                variant={severityConfig.badge}
                                className="text-[10px] uppercase"
                              >
                                {rule.severity}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <div className={cn("w-2 h-2 rounded-full", DIMENSION_COLORS[rule.dimension] || 'bg-gray-500')} />
                                {rule.dimension}
                              </div>
                              {rule.column_name && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{rule.column_name}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>Threshold: {(rule.threshold * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t border-border/50">
                        <div className="mt-3 space-y-2">
                          {rule.business_impact && (
                            <div className="text-xs">
                              <span className="font-medium text-muted-foreground">Business Impact: </span>
                              <span>{rule.business_impact}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs">
                            <Code className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground">Logic:</span>
                            <code className="bg-muted px-2 py-0.5 rounded font-mono text-[10px]">
                              {rule.logic_type}
                            </code>
                          </div>
                          {rule.logic_code && (
                            <pre className="bg-muted/50 p-2 rounded text-[10px] font-mono overflow-x-auto">
                              {rule.logic_code}
                            </pre>
                          )}
                          {rule.confidence && (
                            <div className="text-xs text-muted-foreground">
                              Confidence: {(rule.confidence * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
