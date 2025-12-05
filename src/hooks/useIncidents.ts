import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'mitigating' | 'resolved';

export interface Incident {
  id: string;
  model_id: string | null;
  incident_type: string;
  title: string;
  description: string | null;
  severity: SeverityLevel;
  status: IncidentStatus;
  assignee_id: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export function useIncidents(filters?: { status?: IncidentStatus; severity?: SeverityLevel }) {
  return useQuery({
    queryKey: ['incidents', filters],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Incident[];
    },
  });
}

export function useIncidentStats() {
  return useQuery({
    queryKey: ['incidents', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('status, severity');
      
      if (error) throw error;
      
      const total = data.length;
      const open = data.filter(i => i.status === 'open').length;
      const critical = data.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;
      const high = data.filter(i => i.severity === 'high' && i.status !== 'resolved').length;
      
      return { total, open, critical, high };
    },
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<Incident, 'id' | 'created_at' | 'resolved_at' | 'resolved_by'>) => {
      const { data, error } = await supabase
        .from('incidents')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as Incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Incident> & { id: string }) => {
      const { data, error } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}
