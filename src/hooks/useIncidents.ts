import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  archived_at?: string | null;
  archived_by?: string | null;
}

export function useIncidents(filters?: { status?: IncidentStatus; severity?: SeverityLevel }) {
  return useQuery({
    queryKey: ['incidents', filters],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('*')
        .is('archived_at', null) // Exclude archived incidents
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
        .select('status, severity')
        .is('archived_at', null); // Exclude archived
      
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

export function useBulkArchiveIncidents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      olderThanDays, 
      status, 
      severity 
    }: { 
      olderThanDays?: number; 
      status?: IncidentStatus; 
      severity?: SeverityLevel;
    }) => {
      let query = supabase
        .from('incidents')
        .update({ 
          status: 'resolved' as any,
          resolved_at: new Date().toISOString(),
          archived_at: new Date().toISOString(),
        })
        .is('archived_at', null); // Only non-archived

      if (olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        query = query.lt('created_at', cutoffDate.toISOString());
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (severity) {
        query = query.eq('severity', severity);
      }

      const { error, count } = await query;
      if (error) throw error;
      return { archived: count || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(`Archived ${data.archived} incidents`);
    },
    onError: (error: any) => {
      toast.error('Failed to archive incidents: ' + error.message);
    },
  });
}

export function useBulkResolveIncidents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incidentIds: string[]) => {
      const { error } = await supabase
        .from('incidents')
        .update({ 
          status: 'resolved' as any,
          resolved_at: new Date().toISOString(),
        })
        .in('id', incidentIds);
      
      if (error) throw error;
      return { resolved: incidentIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(`Resolved ${data.resolved} incidents`);
    },
    onError: (error: any) => {
      toast.error('Failed to resolve incidents: ' + error.message);
    },
  });
}
