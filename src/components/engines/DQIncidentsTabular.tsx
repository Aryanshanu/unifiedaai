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
  // Enhanced fields
  rule_name?: string;
  column_name?: string;
  dataset_name?: string;
  description?: string;
  impact_statement?: string;
  affected_records_count?: number;
  affected_records_percentage?: number;
  root_cause?: string;
  recommendation?: string;
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

// Generate human-readable description based on incident data
function generateIncidentDescription(incident: DQIncident): string {
  if (incident.description) return incident.description;
  
  const dim = incident.dimension.toLowerCase();
  const col = incident.column_name || 'data';
  const pct = incident.affected_records_percentage?.toFixed(1) || 'N/A';
  const count = incident.affected_records_count?.toLocaleString() || 'multiple';
  
  const templates: Record<string, string> = {
    completeness: `${pct}% of records have missing or null values in the "${col}" column, affecting ${count} records.`,
    validity: `${pct}% of records failed validation checks in the "${col}" column. Values are outside expected range or format.`,
    uniqueness: `Duplicate values detected in "${col}" column affecting ${pct}% of records. This may cause data integrity issues.`,
    timeliness: `Data freshness check failed. Records in "${col}" are stale and exceed the freshness threshold.`,
    consistency: `Inconsistent values detected in "${col}" column. Cross-reference validation failed for ${count} records.`,
    accuracy: `Accuracy check failed for "${col}". ${pct}% of values don't match expected reference data.`,
  };
  
  return templates[dim] || incident.action || 'Data quality issue detected requiring attention.';
}

// Generate root cause analysis
function generateRootCause(incident: DQIncident): string {
  if (incident.root_cause) return incident.root_cause;
  
  const dim = incident.dimension.toLowerCase();
  const rootCauses: Record<string, string> = {
    completeness: 'Missing data from source system or ETL pipeline failure',
    validity: 'Data format mismatch or out-of-range values from upstream source',
    uniqueness: 'Duplicate records from source or merge operation failure',
    timeliness: 'Data ingestion delay or stale source system',
    consistency: 'Cross-system synchronization failure',
    accuracy: 'Source data corruption or transformation error',
  };
  
  return rootCauses[dim] || 'Root cause analysis pending investigation';
}

// Generate recommendation based on incident
function generateRecommendation(incident: DQIncident): string {
  if (incident.recommendation) return incident.recommendation;
  
  const dim = incident.dimension.toLowerCase();
  const col = incident.column_name || 'affected column';
  
  const recommendations: Record<string, string> = {
    completeness: `1. Check source system for ${col} data availability\n2. Review ETL pipeline for extraction errors\n3. Consider adding default values or making field optional`,
    validity: `1. Review data validation rules for ${col}\n2. Check source system data types\n3. Add data transformation step to normalize values`,
    uniqueness: `1. Add deduplication step in ETL pipeline\n2. Review primary key constraints\n3. Investigate source system for duplicate generation`,
    timeliness: `1. Check data ingestion schedule\n2. Verify source system update frequency\n3. Review SLA with data provider`,
    consistency: `1. Align data formats across systems\n2. Review cross-reference mappings\n3. Implement reconciliation process`,
    accuracy: `1. Validate against authoritative source\n2. Review data transformation logic\n3. Implement data correction workflow`,
  };
  
  return recommendations[dim] || 'Review and investigate the data quality issue. Contact data engineering team if needed.';
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
                <TableHead className="font-semibold">Rule / Column</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Dimension</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
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
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-sm">
                                {incident.rule_name || incident.rule_id?.slice(0, 8) || 'N/A'}
                              </p>
                              {incident.column_name && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  Column: {incident.column_name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-sm truncate" title={generateIncidentDescription(incident)}>
                              {generateIncidentDescription(incident).slice(0, 60)}...
                            </p>
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
                              {/* Full Description */}
                              <div className="bg-card border rounded-lg p-4 space-y-3">
                                <h5 className="font-semibold text-sm flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-primary" />
                                  Incident Details
                                </h5>
                                <p className="text-sm leading-relaxed">
                                  {generateIncidentDescription(incident)}
                                </p>
                                
                                {/* Impact Statement */}
                                <div className="flex items-center gap-4 text-sm pt-2 border-t">
                                  <span className="text-muted-foreground">Impact:</span>
                                  <span className="font-medium text-destructive">
                                    {incident.affected_records_count?.toLocaleString() || 'Multiple'} records affected
                                    {incident.affected_records_percentage && ` (${incident.affected_records_percentage.toFixed(1)}%)`}
                                  </span>
                                </div>
                              </div>

                              {/* Root Cause & Recommendation */}
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 space-y-2">
                                  <h5 className="font-medium text-sm flex items-center gap-2 text-warning">
                                    <AlertTriangle className="h-4 w-4" />
                                    Root Cause Analysis
                                  </h5>
                                  <p className="text-sm">
                                    {generateRootCause(incident)}
                                  </p>
                                </div>
                                
                                <div className="bg-success/5 border border-success/20 rounded-lg p-4 space-y-2">
                                  <h5 className="font-medium text-sm flex items-center gap-2 text-success">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Recommended Actions
                                  </h5>
                                  <p className="text-sm whitespace-pre-line">
                                    {generateRecommendation(incident)}
                                  </p>
                                </div>
                              </div>

                              {/* IDs - Collapsed */}
                              <div className="grid grid-cols-4 gap-4 text-xs border-t pt-3">
                                <div>
                                  <span className="text-muted-foreground">Incident ID:</span>
                                  <p className="font-mono">{incident.id.slice(0, 8)}...</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Rule ID:</span>
                                  <p className="font-mono">{incident.rule_id?.slice(0, 8) || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Execution ID:</span>
                                  <p className="font-mono">{incident.execution_id?.slice(0, 8) || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Profiling Ref:</span>
                                  <p className="font-mono">{incident.profiling_reference?.slice(0, 8) || 'N/A'}</p>
                                </div>
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
