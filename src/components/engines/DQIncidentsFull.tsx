import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  Eye, 
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertOctagon,
  Info,
  FileWarning
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

interface DQIncidentsFullProps {
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
        borderClass: 'border-destructive/50',
        bgClass: 'bg-destructive/5',
        label: 'P0 CRITICAL',
        description: 'Requires immediate action'
      };
    case 'P1':
      return {
        icon: AlertCircle,
        className: 'bg-warning text-warning-foreground',
        borderClass: 'border-warning/50',
        bgClass: 'bg-warning/5',
        label: 'P1 HIGH',
        description: 'Address within 24 hours'
      };
    default:
      return {
        icon: Info,
        className: 'bg-primary/80 text-primary-foreground',
        borderClass: 'border-primary/50',
        bgClass: 'bg-primary/5',
        label: 'P2 MEDIUM',
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
        label: 'ACKNOWLEDGED'
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

export function DQIncidentsFull({ 
  incidents, 
  isLoading,
  onAcknowledge,
  onResolve
}: DQIncidentsFullProps) {
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
            <Skeleton key={i} className="h-48" />
          ))}
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
              {acknowledgedIncidents.length} Acknowledged
            </Badge>
            <Badge className="bg-success/10 text-success border-success/30">
              {resolvedIncidents.length} Resolved
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Open Incidents First */}
        {openIncidents.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Open Incidents ({openIncidents.length})
            </h4>
            {openIncidents.map((incident) => (
              <IncidentCard 
                key={incident.id} 
                incident={incident} 
                onAcknowledge={onAcknowledge}
                onResolve={onResolve}
              />
            ))}
          </div>
        )}

        {/* Acknowledged Incidents */}
        {acknowledgedIncidents.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-warning flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Acknowledged ({acknowledgedIncidents.length})
            </h4>
            {acknowledgedIncidents.map((incident) => (
              <IncidentCard 
                key={incident.id} 
                incident={incident} 
                onResolve={onResolve}
              />
            ))}
          </div>
        )}

        {/* Resolved Incidents */}
        {resolvedIncidents.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-success flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Resolved ({resolvedIncidents.length})
            </h4>
            {resolvedIncidents.slice(0, 3).map((incident) => (
              <IncidentCard 
                key={incident.id} 
                incident={incident} 
                compact
              />
            ))}
            {resolvedIncidents.length > 3 && (
              <p className="text-sm text-muted-foreground text-center">
                +{resolvedIncidents.length - 3} more resolved incidents
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IncidentCard({ 
  incident, 
  onAcknowledge, 
  onResolve,
  compact = false
}: { 
  incident: DQIncident; 
  onAcknowledge?: (id: string) => Promise<void>; 
  onResolve?: (id: string) => Promise<void>;
  compact?: boolean;
}) {
  const severityConfig = getSeverityConfig(incident.severity);
  const statusConfig = getStatusConfig(incident.status);
  const SeverityIcon = severityConfig.icon;

  const timeOpen = formatDistanceToNow(new Date(incident.created_at), { addSuffix: false });

  if (compact) {
    return (
      <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <Badge className={severityConfig.className}>{incident.severity}</Badge>
          <span className="font-medium">{incident.dimension}</span>
          <span className="text-sm text-muted-foreground">
            Resolved {incident.resolved_at && formatDistanceToNow(new Date(incident.resolved_at), { addSuffix: true })}
          </span>
        </div>
        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
      </div>
    );
  }

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      severityConfig.borderClass
    )}>
      {/* Header */}
      <div className={cn("p-4 flex items-center justify-between", severityConfig.bgClass)}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", severityConfig.className)}>
            <SeverityIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge className={severityConfig.className}>{severityConfig.label}</Badge>
              <span className="font-semibold">{incident.dimension}</span>
            </div>
            <p className="text-xs text-muted-foreground">{severityConfig.description}</p>
          </div>
        </div>
        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4">
        {/* IDs and Timing */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Incident ID:</span>
            <p className="font-mono text-xs truncate">{incident.id.slice(0, 16)}...</p>
          </div>
          <div>
            <span className="text-muted-foreground">Rule ID:</span>
            <p className="font-mono text-xs truncate">
              {incident.rule_id ? `${incident.rule_id.slice(0, 16)}...` : 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground text-xs">Created:</span>
              <p className="font-medium">{format(new Date(incident.created_at), 'MMM d, HH:mm')}</p>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Time Open:</span>
            <p className={cn(
              "font-medium",
              incident.status === 'open' && "text-destructive"
            )}>
              {timeOpen}
            </p>
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
            <div className="bg-muted rounded-lg p-3 max-h-40 overflow-y-auto">
              <pre className="text-xs font-mono">
                {JSON.stringify(incident.example_failed_rows, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Failure Signature */}
        {incident.failure_signature && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            <span className="font-medium">Failure Signature:</span>{' '}
            <code className="bg-muted px-1 rounded">{incident.failure_signature}</code>
          </div>
        )}

        {/* Action Buttons */}
        {incident.status !== 'resolved' && (onAcknowledge || onResolve) && (
          <div className="flex gap-3 pt-2 border-t">
            {incident.status === 'open' && onAcknowledge && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAcknowledge(incident.id)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Acknowledge
              </Button>
            )}
            {onResolve && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolve(incident.id)}
                className="gap-2 text-success hover:text-success"
              >
                <CheckCircle2 className="h-4 w-4" />
                Resolve
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
