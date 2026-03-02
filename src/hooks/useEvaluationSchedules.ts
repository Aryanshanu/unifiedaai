import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface EvaluationSchedule {
  id: string;
  name: string;
  model_id: string;
  engine_types: string[];
  cron_expression: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  failure_count: number;
  notification_emails: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useEvaluationSchedules() {
  return useQuery({
    queryKey: ['evaluation-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as EvaluationSchedule[];
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (schedule: Partial<EvaluationSchedule>) => {
      const { data, error } = await supabase
        .from('evaluation_schedules')
        .insert({ ...schedule, created_by: user?.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-schedules'] });
      toast.success('Schedule created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('evaluation_schedules')
        .update({ is_active } as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-schedules'] });
      toast.success('Schedule updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
