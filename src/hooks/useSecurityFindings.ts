import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SecurityFinding {
  id: string;
  test_run_id: string | null;
  system_id: string;
  vulnerability_id: string;
  title: string;
  description: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'open' | 'acknowledged' | 'mitigated' | 'false_positive';
  mitigation: string | null;
  exploitability_score: number | null;
  business_impact_score: number | null;
  fractal_risk_index: number | null;
  evidence: Record<string, any>;
  framework_mappings: Record<string, any>;
  owasp_category: string | null;
  created_at: string;
  updated_at: string;
}

export function useSecurityFindings(systemId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['security-findings', systemId],
    queryFn: async () => {
      let query = supabase
        .from('security_findings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (systemId) {
        query = query.eq('system_id', systemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SecurityFinding[];
    },
  });

  const updateFinding = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SecurityFinding> }) => {
      const { data, error } = await supabase
        .from('security_findings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-findings'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast.success('Finding updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update finding');
      console.error(error);
    },
  });

  const createFinding = useMutation({
    mutationFn: async (finding: Omit<SecurityFinding, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('security_findings')
        .insert(finding)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-findings'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast.success('Finding created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create finding');
      console.error(error);
    },
  });

  return {
    findings: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    updateFinding,
    createFinding,
    refetch: query.refetch,
  };
}
