import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  TrendingUp
} from 'lucide-react';
import { useDriftAlerts, useRunDriftDetection, useDriftStats } from '@/hooks/useDriftDetection';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const severityColors = {
  critical: 'bg-danger/10 text-danger border-danger/30',
  high: 'bg-warning/10 text-warning border-warning/30',
  medium: 'bg-primary/10 text-primary border-primary/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const statusColors = {
  open: 'bg-danger/10 text-danger',
  investigating: 'bg-warning/10 text-warning',
  mitigating: 'bg-primary/10 text-primary',
  resolved: 'bg-success/10 text-success',
};

export function DriftDetector() {
  const { data: alerts, isLoading } = useDriftAlerts();
  const { data: stats } = useDriftStats();
  const runDetection = useRunDriftDetection();

  const openAlerts = alerts?.filter(a => a.status === 'open') || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-warning" />
              Drift Detection
            </CardTitle>
            <CardDescription>
              Real-time PSI and KL divergence monitoring
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runDetection.mutate()}
            disabled={runDetection.isPending}
          >
            {runDetection.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run Now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-foreground">{stats?.open || 0}</div>
            <div className="text-xs text-muted-foreground">Open Alerts</div>
          </div>
          <div className="p-3 bg-danger/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-danger">{stats?.critical || 0}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </div>
          <div className="p-3 bg-warning/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-warning">{stats?.investigating || 0}</div>
            <div className="text-xs text-muted-foreground">Investigating</div>
          </div>
          <div className="p-3 bg-success/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-success">{stats?.resolved24h || 0}</div>
            <div className="text-xs text-muted-foreground">Resolved (24h)</div>
          </div>
        </div>

        {/* Alert list */}
        <ScrollArea className="h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : openAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
              <p className="text-sm text-muted-foreground">No active drift alerts</p>
              <p className="text-xs text-muted-foreground mt-1">
                All systems operating within normal parameters
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {openAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    severityColors[alert.severity as keyof typeof severityColors]
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {alert.drift_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn('text-[10px] h-4', statusColors[alert.status])}
                        >
                          {alert.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Feature: {alert.feature} • Value: {alert.drift_value.toFixed(4)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[10px] mb-1">
                        {alert.severity}
                      </Badge>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Info footer */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/30 rounded-lg">
          <Activity className="w-3 h-3" />
          <span>
            Drift detection runs every 5 minutes. PSI threshold: 0.25 • KL threshold: 0.1
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
