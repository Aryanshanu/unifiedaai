import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  ChevronDown, 
  AlertOctagon, 
  AlertCircle, 
  Info,
  CheckCircle2,
  Eye,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DQIncident } from '@/hooks/useDQControlPlane';
import { format, formatDistanceToNow } from 'date-fns';

interface DQIncidentPanelProps {
  incidents: DQIncident[];
  isLoading?: boolean;
  onAcknowledge?: (incidentId: string) => Promise<void>;
  onResolve?: (incidentId: string) => Promise<void>;
}

const SEVERITY_CONFIG = {
  P0: { 
    icon: AlertOctagon, 
    color: 'text-destructive', 
    bg: 'bg-destructive/10', 
    border: 'border-destructive/30',
    label: 'Critical'
  },
  P1: { 
    icon: AlertTriangle, 
    color: 'text-orange-500', 
    bg: 'bg-orange-500/10', 
    border: 'border-orange-500/30',
    label: 'High'
  },
  P2: { 
    icon: AlertCircle, 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-500/10', 
    border: 'border-yellow-500/30',
    label: 'Medium'
  }
};

const STATUS_CONFIG = {
  open: { color: 'text-destructive', bg: 'bg-destructive/10', label: 'OPEN' },
  acknowledged: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'ACK' },
  resolved: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'RESOLVED' }
};

export function DQIncidentPanel({ 
  incidents, 
  isLoading,
  onAcknowledge,
  onResolve 
}: DQIncidentPanelProps) {
  const [expandedIncidents, setExpandedIncidents] = React.useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = React.useState<Set<string>>(new Set());

  const toggleIncident = (incidentId: string) => {
    setExpandedIncidents(prev => {
      const next = new Set(prev);
      if (next.has(incidentId)) {
        next.delete(incidentId);
      } else {
        next.add(incidentId);
      }
      return next;
    });
  };

  const handleAcknowledge = async (incidentId: string) => {
    if (!onAcknowledge) return;
    setProcessingIds(prev => new Set(prev).add(incidentId));
    try {
      await onAcknowledge(incidentId);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(incidentId);
        return next;
      });
    }
  };

  const handleResolve = async (incidentId: string) => {
    if (!onResolve) return;
    setProcessingIds(prev => new Set(prev).add(incidentId));
    try {
      await onResolve(incidentId);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(incidentId);
        return next;
      });
    }
  };

  const openCount = incidents.filter(i => i.status === 'open').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  if (!incidents.length && !isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            INCIDENTS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-70" />
            <p className="text-sm text-green-500">No incidents detected</p>
            <p className="text-xs mt-1 text-muted-foreground">All data quality checks passed</p>
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
            <AlertTriangle className="h-4 w-4 text-primary animate-pulse" />
            INCIDENTS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-muted rounded" />
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
            <AlertTriangle className="h-4 w-4 text-primary" />
            INCIDENTS
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              Open: {openCount}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Resolved: {resolvedCount}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div className="space-y-2">
            {/* Sort by severity (P0 first) then by status (open first) */}
            {[...incidents]
              .sort((a, b) => {
                const severityOrder = { P0: 0, P1: 1, P2: 2 };
                const statusOrder = { open: 0, acknowledged: 1, resolved: 2 };
                const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
                if (severityDiff !== 0) return severityDiff;
                return statusOrder[a.status] - statusOrder[b.status];
              })
              .map((incident) => {
                const severityConfig = SEVERITY_CONFIG[incident.severity];
                const statusConfig = STATUS_CONFIG[incident.status];
                const SeverityIcon = severityConfig.icon;
                const isExpanded = expandedIncidents.has(incident.id);
                const isProcessing = processingIds.has(incident.id);

                return (
                  <Collapsible 
                    key={incident.id} 
                    open={isExpanded} 
                    onOpenChange={() => toggleIncident(incident.id)}
                  >
                    <div className={cn(
                      "border rounded-lg overflow-hidden",
                      severityConfig.bg,
                      severityConfig.border,
                      incident.status === 'resolved' && "opacity-60"
                    )}>
                      <CollapsibleTrigger className="w-full">
                        <div className="p-3 flex items-start justify-between hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <SeverityIcon className={cn("h-5 w-5 mt-0.5", severityConfig.color)} />
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline"
                                  className={cn("text-[10px] font-bold", severityConfig.color)}
                                >
                                  {incident.severity}
                                </Badge>
                                <span className="font-medium text-sm">
                                  {incident.dimension} Issue
                                </span>
                                <Badge 
                                  variant="outline"
                                  className={cn("text-[10px]", statusConfig.color, statusConfig.bg)}
                                >
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {incident.action}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
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
                          <div className="mt-3 space-y-3">
                            {/* Failed Rows Sample */}
                            {incident.example_failed_rows && Array.isArray(incident.example_failed_rows) && incident.example_failed_rows.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                  Failed Rows Sample:
                                </div>
                                <ScrollArea className="h-[80px]">
                                  <pre className="bg-muted/50 p-2 rounded text-[10px] font-mono overflow-x-auto">
                                    {JSON.stringify(incident.example_failed_rows, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>
                            )}

                            {/* Timestamps */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Created: </span>
                                <span>{format(new Date(incident.created_at), 'MMM d, HH:mm:ss')}</span>
                              </div>
                              {incident.resolved_at && (
                                <div>
                                  <span className="text-muted-foreground">Resolved: </span>
                                  <span>{format(new Date(incident.resolved_at), 'MMM d, HH:mm:ss')}</span>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            {incident.status !== 'resolved' && (
                              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                {incident.status === 'open' && onAcknowledge && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcknowledge(incident.id);
                                    }}
                                    disabled={isProcessing}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Acknowledge
                                  </Button>
                                )}
                                {onResolve && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-7 text-xs bg-green-500 hover:bg-green-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResolve(incident.id);
                                    }}
                                    disabled={isProcessing}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Resolve
                                  </Button>
                                )}
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
