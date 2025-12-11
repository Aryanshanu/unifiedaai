import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DriftAlert {
  id: string;
  model_id: string;
  drift_type: string;
  drift_value: number;
  feature: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'mitigating' | 'resolved';
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface DriftDetectionResult {
  success: boolean;
  execution_time_ms: number;
  systems_analyzed: number;
  alerts_created: number;
  incidents_created: number;
  details: {
    alerts: DriftAlert[];
    incidents: any[];
  };
}

export function useDriftAlerts(systemId?: string) {
  return useQuery({
    queryKey: ['drift-alerts', systemId],
    queryFn: async () => {
      let query = supabase
        .from('drift_alerts')
        .select('*')
        .order('detected_at', { ascending: false });
      
      if (systemId) {
        query = query.eq('model_id', systemId);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      return data as DriftAlert[];
    },
  });
}

export function useRunDriftDetection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('detect-drift');
      
      if (error) throw error;
      return data as DriftDetectionResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drift-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      
      if (data.alerts_created > 0) {
        toast.warning(`Drift detected: ${data.alerts_created} alerts created`, {
          description: `${data.incidents_created} critical incidents auto-escalated`,
          duration: 5000,
        });
      } else {
        toast.success('Drift detection complete', {
          description: `${data.systems_analyzed} systems analyzed, no drift detected`,
        });
      }
    },
    onError: (error: any) => {
      toast.error('Drift detection failed', {
        description: error.message,
      });
    },
  });
}

export function useResolveDriftAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('drift_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drift-alerts'] });
      toast.success('Drift alert resolved');
    },
  });
}

export function useDriftStats() {
  return useQuery({
    queryKey: ['drift-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drift_alerts')
        .select('severity, status');
      
      if (error) throw error;
      
      const open = data.filter(a => a.status === 'open').length;
      const critical = data.filter(a => a.severity === 'critical' && a.status === 'open').length;
      const investigating = data.filter(a => a.status === 'investigating').length;
      const resolved24h = data.filter(a => {
        // This would need resolved_at timestamp check in real implementation
        return a.status === 'resolved';
      }).length;
      
      return {
        total: data.length,
        open,
        critical,
        investigating,
        resolved24h,
      };
    },
  });
}
