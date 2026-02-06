import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Database,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface DriftAlert {
  id: string;
  dataset_id: string;
  column_name: string;
  drift_type: string;
  drift_value: number | null;
  severity: string;
  status: string;
  detected_at: string;
  threshold: number | null;
  dataset?: {
    name: string;
  };
}

export function DataDriftMonitor() {
  const queryClient = useQueryClient();

  // Fetch all data drift alerts with dataset names
  const { data: driftAlerts, isLoading, refetch } = useQuery({
    queryKey: ['all-data-drift-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_drift_alerts')
        .select(`
          *,
          dataset:datasets(name)
        `)
        .order('detected_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as DriftAlert[];
    },
  });

  // Resolve drift alert mutation
  const resolveDrift = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('data_drift_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-data-drift-alerts'] });
      toast.success('Drift alert resolved');
    },
    onError: () => toast.error('Failed to resolve alert'),
  });

  // Stats
  const openCount = driftAlerts?.filter(a => a.status !== 'resolved').length || 0;
  const criticalCount = driftAlerts?.filter(a => a.severity === 'critical' && a.status !== 'resolved').length || 0;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'high': return 'bg-warning/10 text-warning border-warning/20';
      case 'medium': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Data Drift Monitor</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {openCount > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                {openCount} Open
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                {criticalCount} Critical
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          Distribution shifts detected across datasets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : !driftAlerts?.length ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-10 w-10 text-success/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No data drift detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              All datasets are stable
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {driftAlerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  alert.status === 'resolved' ? 'bg-muted/20' : 'bg-card'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    alert.status === 'resolved' ? 'bg-success/10' : 
                    alert.severity === 'critical' ? 'bg-destructive/10' : 'bg-warning/10'
                  )}>
                    <TrendingUp className={cn(
                      "h-4 w-4",
                      alert.status === 'resolved' ? 'text-success' : 
                      alert.severity === 'critical' ? 'text-destructive' : 'text-warning'
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {(alert.dataset as any)?.name || 'Unknown Dataset'}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {alert.column_name}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {alert.drift_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Drift: {alert.drift_value?.toFixed(3) || 'N/A'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {alert.detected_at 
                          ? formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  {alert.status !== 'resolved' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveDrift.mutate(alert.id)}
                      disabled={resolveDrift.isPending}
                    >
                      {resolveDrift.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      Resolve
                    </Button>
                  ) : (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
