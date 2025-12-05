import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface EvaluationSuite {
  id: string;
  name: string;
  description: string | null;
  test_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationRun {
  id: string;
  model_id: string;
  suite_id: string | null;
  status: EvaluationStatus;
  fairness_score: number | null;
  robustness_score: number | null;
  privacy_score: number | null;
  toxicity_score: number | null;
  factuality_score: number | null;
  overall_score: number | null;
  details: Record<string, any>;
  triggered_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useEvaluationSuites() {
  return useQuery({
    queryKey: ['evaluation-suites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_suites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EvaluationSuite[];
    },
  });
}

export function useEvaluationRuns(modelId?: string) {
  return useQuery({
    queryKey: ['evaluation-runs', modelId],
    queryFn: async () => {
      let query = supabase
        .from('evaluation_runs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (modelId) {
        query = query.eq('model_id', modelId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as EvaluationRun[];
    },
  });
}

export function useEvaluationStats() {
  return useQuery({
    queryKey: ['evaluation-runs', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_runs')
        .select('status, overall_score');
      
      if (error) throw error;
      
      const total = data.length;
      const completed = data.filter(e => e.status === 'completed').length;
      const running = data.filter(e => e.status === 'running').length;
      const avgScore = data
        .filter(e => e.overall_score !== null)
        .reduce((acc, e) => acc + (e.overall_score || 0), 0) / (completed || 1);
      
      return { total, completed, running, avgScore: Math.round(avgScore) };
    },
  });
}

export function useCreateEvaluationRun() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { model_id: string; suite_id?: string }) => {
      const { data, error } = await supabase
        .from('evaluation_runs')
        .insert({
          ...input,
          triggered_by: user?.id,
          status: 'pending',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as EvaluationRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-runs'] });
    },
  });
}

export function useCreateEvaluationSuite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; test_count?: number }) => {
      const { data, error } = await supabase
        .from('evaluation_suites')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as EvaluationSuite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-suites'] });
    },
  });
}
