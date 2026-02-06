import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
  Activity,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { FreshnessIndicator } from './FreshnessIndicator';

interface DQMonitoringTabProps {
  datasetId?: string;
}

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
}

interface Anomaly {
  id: string;
  dataset_id: string;
  column_name: string;
  anomaly_type: string;
  severity: string;
  status: string;
  description: string | null;
  detected_at: string;
  detected_value: Record<string, unknown> | null;
  expected_range: Record<string, unknown> | null;
}

export function DQMonitoringTab({ datasetId }: DQMonitoringTabProps) {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'drift' | 'anomalies'>('drift');

  // Fetch drift alerts
  const { data: driftAlerts, isLoading: driftLoading } = useQuery({
    queryKey: ['data-drift-alerts', datasetId],
    queryFn: async () => {
      let query = supabase
        .from('data_drift_alerts')
        .select('*')
        .order('detected_at', { ascending: false });

      if (datasetId) {
        query = query.eq('dataset_id', datasetId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as DriftAlert[];
    },
  });

  // Fetch anomalies
  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['dataset-anomalies', datasetId],
    queryFn: async () => {
      let query = supabase
        .from('dataset_anomalies')
        .select('*')
        .order('detected_at', { ascending: false });

      if (datasetId) {
        query = query.eq('dataset_id', datasetId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as Anomaly[];
    },
  });

  // Fetch dataset freshness
  const { data: dataset } = useQuery({
    queryKey: ['dataset-freshness', datasetId],
    queryFn: async () => {
      if (!datasetId) return null;
      const { data, error } = await supabase
        .from('datasets')
        .select('id, name, last_data_update, freshness_threshold_days, staleness_status')
        .eq('id', datasetId)
        .single();
      if (error) throw error;
      return data as { 
        id: string; 
        name: string; 
        last_data_update: string | null; 
        freshness_threshold_days: number | null; 
        staleness_status: string | null;
      };
    },
    enabled: !!datasetId,
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
      queryClient.invalidateQueries({ queryKey: ['data-drift-alerts'] });
      toast.success('Drift alert resolved');
    },
    onError: () => toast.error('Failed to resolve alert'),
  });

  // Resolve anomaly mutation
  const resolveAnomaly = useMutation({
    mutationFn: async (anomalyId: string) => {
      const { error } = await supabase
        .from('dataset_anomalies')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', anomalyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataset-anomalies'] });
      toast.success('Anomaly resolved');
    },
    onError: () => toast.error('Failed to resolve anomaly'),
  });

  // Stats
  const openDriftCount = driftAlerts?.filter(a => a.status !== 'resolved').length || 0;
  const criticalDriftCount = driftAlerts?.filter(a => a.severity === 'critical' && a.status !== 'resolved').length || 0;
  const openAnomalyCount = anomalies?.filter(a => a.status !== 'resolved').length || 0;
  const criticalAnomalyCount = anomalies?.filter(a => a.severity === 'critical' && a.status !== 'resolved').length || 0;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'high': return 'bg-warning/10 text-warning border-warning/20';
      case 'medium': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'resolved') {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Resolved</Badge>;
    }
    return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Open</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-lg",
              openDriftCount === 0 ? "bg-success/10" : "bg-warning/10"
            )}>
              <TrendingUp className={cn(
                "h-5 w-5",
                openDriftCount === 0 ? "text-success" : "text-warning"
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold">{openDriftCount}</p>
              <p className="text-sm text-muted-foreground">Open Drift Alerts</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-lg",
              criticalDriftCount === 0 ? "bg-success/10" : "bg-destructive/10"
            )}>
              <AlertTriangle className={cn(
                "h-5 w-5",
                criticalDriftCount === 0 ? "text-success" : "text-destructive"
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold">{criticalDriftCount}</p>
              <p className="text-sm text-muted-foreground">Critical Drift</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-lg",
              openAnomalyCount === 0 ? "bg-success/10" : "bg-warning/10"
            )}>
              <Activity className={cn(
                "h-5 w-5",
                openAnomalyCount === 0 ? "text-success" : "text-warning"
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold">{openAnomalyCount}</p>
              <p className="text-sm text-muted-foreground">Open Anomalies</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-lg",
              criticalAnomalyCount === 0 ? "bg-success/10" : "bg-destructive/10"
            )}>
              <XCircle className={cn(
                "h-5 w-5",
                criticalAnomalyCount === 0 ? "text-success" : "text-destructive"
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold">{criticalAnomalyCount}</p>
              <p className="text-sm text-muted-foreground">Critical Anomalies</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Freshness Status */}
      {dataset && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Data Freshness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{dataset.name}</p>
                <p className="text-sm text-muted-foreground">
                  Threshold: {dataset.freshness_threshold_days || 7} days
                </p>
              </div>
              <FreshnessIndicator 
                lastDataUpdate={dataset.last_data_update} 
                stalenessStatus={dataset.staleness_status}
                freshnessThresholdDays={dataset.freshness_threshold_days || 7}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Drift and Anomalies */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'drift' | 'anomalies')}>
        <TabsList>
          <TabsTrigger value="drift" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Drift Alerts ({openDriftCount})
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Anomalies ({openAnomalyCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drift" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Drift Alerts</CardTitle>
              <CardDescription>
                Distribution shifts and statistical changes detected in your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {driftLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : !driftAlerts?.length ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-success/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No drift alerts detected</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Column</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase">Drift Value</th>
                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase">Severity</th>
                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Detected</th>
                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driftAlerts.map((alert) => (
                        <tr key={alert.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-mono text-sm">{alert.column_name}</td>
                          <td className="p-3">
                            <Badge variant="outline">{alert.drift_type}</Badge>
                          </td>
                          <td className="p-3 text-center font-mono">
                            {alert.drift_value !== null ? alert.drift_value.toFixed(3) : 'N/A'}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            {getStatusBadge(alert.status || 'open')}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {alert.detected_at 
                              ? formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })
                              : 'N/A'}
                          </td>
                          <td className="p-3 text-right">
                            {alert.status !== 'resolved' && (
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
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Anomalies</CardTitle>
              <CardDescription>
                Outliers, null spikes, and pattern breaks detected in your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {anomaliesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : !anomalies?.length ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-success/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No anomalies detected</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Column</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase">Severity</th>
                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Detected</th>
                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.map((anomaly) => (
                        <tr key={anomaly.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-mono text-sm">{anomaly.column_name}</td>
                          <td className="p-3">
                            <Badge variant="outline">{anomaly.anomaly_type}</Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
                            {anomaly.description || 'No description'}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={getSeverityColor(anomaly.severity)}>
                              {anomaly.severity}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            {getStatusBadge(anomaly.status || 'open')}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {anomaly.detected_at 
                              ? formatDistanceToNow(new Date(anomaly.detected_at), { addSuffix: true })
                              : 'N/A'}
                          </td>
                          <td className="p-3 text-right">
                            {anomaly.status !== 'resolved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveAnomaly.mutate(anomaly.id)}
                                disabled={resolveAnomaly.isPending}
                              >
                                {resolveAnomaly.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                Resolve
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
