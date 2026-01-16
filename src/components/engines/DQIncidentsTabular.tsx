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
  AlertTriangle, 
  Eye, 
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertOctagon,
  Info,
  FileWarning,
  ChevronDown,
  ChevronRight,
  Link2,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface DQIncident {
  id: string;
  dataset_id: string;
  rule_id: string | null;
  execution_id: string | null;
  dimension: string;
  severity: 'P0' | 'P1' | 'P2';
  action: string;
  example_failed_rows: unknown[] | null;
  profiling_reference: string | null;
  failure_signature: string | null;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
  resolved_at: string | null;
}

interface DQIncidentsTabularProps {
  incidents: DQIncident[];
  isLoading?: boolean;
  onAcknowledge?: (incidentId: string) => Promise<void>;
  onResolve?: (incidentId: string) => Promise<void>;
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'P0':
      return {
        icon: AlertOctagon,
        className: 'bg-destructive text-destructive-foreground',
        label: '🔴 P0',
        description: 'Immediate action required'
      };
    case 'P1':
      return {
        icon: AlertCircle,
        className: 'bg-warning text-warning-foreground',
        label: '🟡 P1',
        description: 'Address within 24 hours'
      };
    default:
      return {
        icon: Info,
        className: 'bg-primary/80 text-primary-foreground',
        label: '🟢 P2',
        description: 'Review when possible'
      };
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'open':
      return {
        className: 'bg-destructive/10 text-destructive border-destructive/30',
        label: 'OPEN'
      };
    case 'acknowledged':
      return {
        className: 'bg-warning/10 text-warning border-warning/30',
        label: 'ACK'
      };
    case 'resolved':
      return {
        className: 'bg-success/10 text-success border-success/30',
        label: 'RESOLVED'
      };
    default:
      return {
        className: 'bg-muted text-muted-foreground',
        label: status.toUpperCase()
      };
  }
}

export function DQIncidentsTabular({ 
  incidents, 
  isLoading,
  onAcknowledge,
  onResolve
}: DQIncidentsTabularProps) {
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());

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

  const openIncidents = incidents.filter(i => i.status === 'open');
  const acknowledgedIncidents = incidents.filter(i => i.status === 'acknowledged');
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved');

  if (!incidents || incidents.length === 0) {
    return (
      <Card className="border-dashed border-success/30 bg-success/5">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
          <p className="text-success font-medium">No Incidents</p>
          <p className="text-sm text-muted-foreground">All data quality checks passed without issues</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileWarning className="h-5 w-5 text-primary" />
            STEP 5: INCIDENTS & ALERTS
          </CardTitle>
          <div className="flex gap-2">
            <Badge className="bg-destructive/10 text-destructive border-destructive/30">
              {openIncidents.length} Open
            </Badge>
            <Badge className="bg-warning/10 text-warning border-warning/30">
              {acknowledgedIncidents.length} Ack
            </Badge>
            <Badge className="bg-success/10 text-success border-success/30">
              {resolvedIncidents.length} Resolved
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Incidents Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead className="font-semibold">Severity</TableHead>
                <TableHead className="font-semibold">Rule</TableHead>
                <TableHead className="font-semibold">Dimension</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                <TableHead className="font-semibold">Time Open</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => {
                const severityConfig = getSeverityConfig(incident.severity);
                const statusConfig = getStatusConfig(incident.status);
                const isExpanded = expandedIncidents.has(incident.id);
                const timeOpen = formatDistanceToNow(new Date(incident.created_at), { addSuffix: false });
                
                return (
                  <Collapsible 
                    key={incident.id} 
                    open={isExpanded} 
                    onOpenChange={() => toggleIncident(incident.id)} 
                    asChild
                  >
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className={cn(
                          "cursor-pointer hover:bg-muted/30",
                          incident.status === 'open' && "bg-destructive/5"
                        )}>
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={severityConfig.className}>
                              {severityConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {incident.rule_id?.slice(0, 8) || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase text-xs">
                              {incident.dimension}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig.className}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(incident.created_at), 'HH:mm:ss')}
                          </TableCell>
                          <TableCell className={cn(
                            "font-medium",
                            incident.status === 'open' && "text-destructive"
                          )}>
                            {incident.status === 'resolved' ? '-' : timeOpen}
                          </TableCell>
                          <TableCell>
                            {incident.status !== 'resolved' && (
                              <div className="flex gap-1">
                                {incident.status === 'open' && onAcknowledge && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAcknowledge(incident.id);
                                    }}
                                    className="h-7 text-xs"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Ack
                                  </Button>
                                )}
                                {onResolve && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onResolve(incident.id);
                                    }}
                                    className="h-7 text-xs text-success hover:text-success"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Resolve
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={8} className="p-4">
                            <div className="space-y-4">
                              {/* IDs */}
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Incident ID:</span>
                                  <p className="font-mono text-xs">{incident.id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Rule ID:</span>
                                  <p className="font-mono text-xs">{incident.rule_id || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Execution ID:</span>
                                  <p className="font-mono text-xs">{incident.execution_id || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Profiling Ref:</span>
                                  <p className="font-mono text-xs">{incident.profiling_reference || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Recommended Action */}
                              <div className="space-y-2">
                                <h5 className="font-medium text-sm flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-warning" />
                                  Recommended Action
                                </h5>
                                <p className="text-sm bg-muted rounded-lg p-3">
                                  {incident.action}
                                </p>
                              </div>

                              {/* Failed Row Samples */}
                              {incident.example_failed_rows && incident.example_failed_rows.length > 0 && (
                                <div className="space-y-2">
                                  <h5 className="font-medium text-sm text-destructive">
                                    Failed Row Samples ({incident.example_failed_rows.length}):
                                  </h5>
                                  <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-destructive/5">
                                          <TableHead className="font-semibold">Row</TableHead>
                                          <TableHead className="font-semibold">Data</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {incident.example_failed_rows.slice(0, 3).map((row, idx) => (
                                          <TableRow key={idx}>
                                            <TableCell className="font-mono">{idx + 1}</TableCell>
                                            <TableCell className="font-mono text-xs max-w-lg truncate">
                                              {JSON.stringify(row).slice(0, 150)}...
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}

                              {/* Traceability Links */}
                              <div className="flex items-center gap-4 text-xs border-t pt-3">
                                <span className="text-muted-foreground font-medium flex items-center gap-1">
                                  <Link2 className="h-3 w-3" />
                                  Traceability:
                                </span>
                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Rule (Step 2)
                                </Badge>
                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Execution (Step 3)
                                </Badge>
                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Dashboard (Step 4)
                                </Badge>
                              </div>

                              {/* Failure Signature */}
                              {incident.failure_signature && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">Failure Signature:</span>{' '}
                                  <code className="bg-muted px-1 rounded">{incident.failure_signature}</code>
                                </div>
                              )}
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
      </CardContent>
    </Card>
  );
}
