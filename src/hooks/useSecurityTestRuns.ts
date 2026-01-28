import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SecurityTestRun {
  id: string;
  system_id: string;
  test_type: 'pentesting' | 'jailbreak' | 'threat_model';
  status: 'pending' | 'running' | 'completed' | 'failed';
  tests_total: number;
  tests_passed: number;
  tests_failed: number;
  coverage_percentage: number | null;
  started_at: string | null;
  completed_at: string | null;
  triggered_by: string | null;
  summary: Record<string, any>;
  created_at: string;
}

export function useSecurityTestRuns(systemId?: string, testType?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['security-test-runs', systemId, testType],
    queryFn: async () => {
      let query = supabase
        .from('security_test_runs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (systemId) {
        query = query.eq('system_id', systemId);
      }
      if (testType) {
        query = query.eq('test_type', testType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SecurityTestRun[];
    },
  });

  const createTestRun = useMutation({
    mutationFn: async (testRun: Omit<SecurityTestRun, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('security_test_runs')
        .insert(testRun)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast.success('Test run created');
    },
    onError: (error) => {
      toast.error('Failed to create test run');
      console.error(error);
    },
  });

  const updateTestRun = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SecurityTestRun> }) => {
      const { data, error } = await supabase
        .from('security_test_runs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
    },
    onError: (error) => {
      toast.error('Failed to update test run');
      console.error(error);
    },
  });

  return {
    testRuns: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createTestRun,
    updateTestRun,
    refetch: query.refetch,
  };
}
