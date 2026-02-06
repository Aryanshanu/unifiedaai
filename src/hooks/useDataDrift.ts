import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DataDriftAlert {
  id: string;
  dataset_id: string;
  column_name: string;
  drift_type: string;
  baseline_profile_id: string | null;
  current_profile_id: string | null;
  baseline_value: Record<string, unknown> | null;
  current_value: Record<string, unknown> | null;
  drift_value: number | null;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved' | 'ignored';
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  incident_id: string | null;
  created_at: string;
}

interface DatasetAnomaly {
  id: string;
  dataset_id: string;
  column_name: string;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_value: Record<string, unknown> | null;
  expected_range: Record<string, unknown> | null;
  description: string | null;
  detected_at: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'ignored';
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

// Fetch data drift alerts for a dataset
export function useDataDriftAlerts(datasetId?: string) {
  return useQuery({
    queryKey: ['data-drift-alerts', datasetId],
    queryFn: async () => {
      let query = supabase
        .from('data_drift_alerts')
        .select('*')
        .order('detected_at', { ascending: false });
      
      if (datasetId) {
        query = query.eq('dataset_id', datasetId);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as DataDriftAlert[];
    },
  });
}

// Fetch dataset anomalies
export function useDatasetAnomalies(datasetId?: string) {
  return useQuery({
    queryKey: ['dataset-anomalies', datasetId],
    queryFn: async () => {
      let query = supabase
        .from('dataset_anomalies')
        .select('*')
        .order('detected_at', { ascending: false });
      
      if (datasetId) {
        query = query.eq('dataset_id', datasetId);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as DatasetAnomaly[];
    },
  });
}

// Resolve a data drift alert
export function useResolveDriftAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('data_drift_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-drift-alerts'] });
      toast.success('Drift alert resolved');
    },
    onError: (error: Error) => {
      toast.error('Failed to resolve alert', { description: error.message });
    },
  });
}

// Resolve an anomaly
export function useResolveAnomaly() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ anomalyId, notes }: { anomalyId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('dataset_anomalies')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', anomalyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataset-anomalies'] });
      toast.success('Anomaly resolved');
    },
    onError: (error: Error) => {
      toast.error('Failed to resolve anomaly', { description: error.message });
    },
  });
}

// Get drift stats summary
export function useDataDriftStats(datasetId?: string) {
  return useQuery({
    queryKey: ['data-drift-stats', datasetId],
    queryFn: async () => {
      let alertsQuery = supabase
        .from('data_drift_alerts')
        .select('severity, status');
      
      let anomaliesQuery = supabase
        .from('dataset_anomalies')
        .select('severity, status');
      
      if (datasetId) {
        alertsQuery = alertsQuery.eq('dataset_id', datasetId);
        anomaliesQuery = anomaliesQuery.eq('dataset_id', datasetId);
      }
      
      const [alertsResult, anomaliesResult] = await Promise.all([
        alertsQuery,
        anomaliesQuery,
      ]);
      
      const alerts = alertsResult.data || [];
      const anomalies = anomaliesResult.data || [];
      
      const openAlerts = alerts.filter(a => a.status === 'open');
      const openAnomalies = anomalies.filter(a => a.status === 'open');
      
      return {
        totalAlerts: alerts.length,
        openAlerts: openAlerts.length,
        criticalAlerts: openAlerts.filter(a => a.severity === 'critical').length,
        highAlerts: openAlerts.filter(a => a.severity === 'high').length,
        totalAnomalies: anomalies.length,
        openAnomalies: openAnomalies.length,
        criticalAnomalies: openAnomalies.filter(a => a.severity === 'critical').length,
        highAnomalies: openAnomalies.filter(a => a.severity === 'high').length,
      };
    },
  });
}

// Acknowledge (but not resolve) an alert
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ alertId, type }: { alertId: string; type: 'drift' | 'anomaly' }) => {
      const table = type === 'drift' ? 'data_drift_alerts' : 'dataset_anomalies';
      
      const { error } = await supabase
        .from(table)
        .update({ status: 'acknowledged' })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      const queryKey = type === 'drift' ? 'data-drift-alerts' : 'dataset-anomalies';
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success('Alert acknowledged');
    },
  });
}
