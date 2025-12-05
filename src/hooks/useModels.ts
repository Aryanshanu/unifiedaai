import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ModelStatus = 'draft' | 'active' | 'deprecated' | 'archived';

export interface Model {
  id: string;
  name: string;
  description: string | null;
  model_type: string;
  version: string;
  status: ModelStatus;
  provider: string | null;
  use_case: string | null;
  endpoint: string | null;
  owner_id: string | null;
  fairness_score: number | null;
  robustness_score: number | null;
  privacy_score: number | null;
  toxicity_score: number | null;
  overall_score: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateModelInput {
  name: string;
  description?: string;
  model_type: string;
  version?: string;
  provider?: string;
  use_case?: string;
  endpoint?: string;
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Model[];
    },
  });
}

export function useModel(id: string) {
  return useQuery({
    queryKey: ['models', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Model;
    },
    enabled: !!id,
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateModelInput) => {
      const { data, error } = await supabase
        .from('models')
        .insert({
          ...input,
          owner_id: user?.id,
          status: 'draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Model;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useUpdateModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Model> & { id: string }) => {
      const { data, error } = await supabase
        .from('models')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Model;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['models', data.id] });
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useModelStats() {
  return useQuery({
    queryKey: ['models', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('models')
        .select('status');
      
      if (error) throw error;
      
      const total = data.length;
      const active = data.filter(m => m.status === 'active').length;
      const draft = data.filter(m => m.status === 'draft').length;
      const deprecated = data.filter(m => m.status === 'deprecated').length;
      
      return { total, active, draft, deprecated };
    },
  });
}
