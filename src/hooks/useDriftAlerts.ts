import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'mitigating' | 'resolved';

export interface DriftAlert {
  id: string;
  model_id: string;
  feature: string;
  drift_type: string;
  drift_value: number;
  severity: SeverityLevel;
  status: IncidentStatus;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export function useDriftAlerts(filters?: { status?: IncidentStatus }) {
  return useQuery({
    queryKey: ['drift-alerts', filters],
    queryFn: async () => {
      let query = supabase
        .from('drift_alerts')
        .select('*')
        .order('detected_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DriftAlert[];
    },
  });
}

export function useDriftAlertStats() {
  return useQuery({
    queryKey: ['drift-alerts', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drift_alerts')
        .select('status, severity');
      
      if (error) throw error;
      
      const total = data.length;
      const open = data.filter(d => d.status === 'open').length;
      const critical = data.filter(d => d.severity === 'critical' && d.status !== 'resolved').length;
      
      return { total, open, critical };
    },
  });
}

export function useResolveDriftAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('drift_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as DriftAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drift-alerts'] });
    },
  });
}
