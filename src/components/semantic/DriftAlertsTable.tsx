import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSemanticDriftAlerts, useResolveDriftAlert } from '@/hooks/useSemanticDefinitions';
import { AlertTriangle, CheckCircle2, Clock, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const severityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  high: 'bg-destructive/10 text-destructive',
  critical: 'bg-destructive text-destructive-foreground',
};

const driftTypeLabels: Record<string, string> = {
  synonym_conflict: 'Synonym Conflict',
  logic_deviation: 'Logic Deviation',
  stale_definition: 'Stale Definition',
  schema_mismatch: 'Schema Mismatch',
};

export function DriftAlertsTable() {
  const { data: alerts, isLoading } = useSemanticDriftAlerts();
  const resolveMutation = useResolveDriftAlert();

  const handleResolve = async (id: string) => {
    try {
      await resolveMutation.mutateAsync(id);
      toast.success('Alert resolved');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resolve';
      toast.error(message);
    }
  };

  const openAlerts = alerts?.filter(a => a.status === 'open') ?? [];
  const resolvedAlerts = alerts?.filter(a => a.status === 'resolved') ?? [];

  return (
    <div className="space-y-6">
      {/* Open Alerts */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Open Drift Alerts
            {openAlerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">{openAlerts.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading...</p>
          ) : openAlerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-8 h-8 mx-auto text-success mb-2" />
              <p className="text-sm text-foreground font-medium">No open drift alerts</p>
              <p className="text-xs text-muted-foreground mt-1">Run drift detection to scan for semantic inconsistencies.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Severity</TableHead>
                  <TableHead className="text-xs">Details</TableHead>
                  <TableHead className="text-xs">Detected</TableHead>
                  <TableHead className="text-xs w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openAlerts.map(alert => (
                  <TableRow key={alert.id}>
                    <TableCell className="text-xs font-medium">
                      {driftTypeLabels[alert.drift_type] || alert.drift_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={severityColors[alert.severity]}>
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                      {(alert.details as Record<string, unknown>)?.message as string || JSON.stringify(alert.details)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolveMutation.isPending}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <Card className="border-border opacity-70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Resolved ({resolvedAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Severity</TableHead>
                  <TableHead className="text-xs">Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvedAlerts.slice(0, 10).map(alert => (
                  <TableRow key={alert.id}>
                    <TableCell className="text-xs">{driftTypeLabels[alert.drift_type] || alert.drift_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={severityColors[alert.severity]}>{alert.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {alert.resolved_at ? formatDistanceToNow(new Date(alert.resolved_at), { addSuffix: true }) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
