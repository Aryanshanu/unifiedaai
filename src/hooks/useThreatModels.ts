import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ThreatModel {
  id: string;
  system_id: string;
  name: string;
  description: string | null;
  framework: 'STRIDE' | 'MAESTRO' | 'ATLAS' | 'OWASP' | null;
  architecture_graph: Record<string, any>;
  risk_score: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreatVector {
  id: string;
  threat_model_id: string;
  title: string;
  description: string | null;
  atlas_tactic: string | null;
  owasp_category: string | null;
  maestro_layer: string | null;
  likelihood: number | null;
  impact: number | null;
  confidence_level: 'high' | 'medium' | 'low';
  is_accepted: boolean;
  mitigation_checklist: any[];
  created_at: string;
  updated_at: string;
}

export function useThreatModels(systemId?: string) {
  const queryClient = useQueryClient();

  const modelsQuery = useQuery({
    queryKey: ['threat-models', systemId],
    queryFn: async () => {
      let query = supabase
        .from('threat_models')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (systemId) {
        query = query.eq('system_id', systemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ThreatModel[];
    },
  });

  const vectorsQuery = useQuery({
    queryKey: ['threat-vectors', systemId],
    queryFn: async () => {
      const modelIds = modelsQuery.data?.map(m => m.id) || [];
      if (modelIds.length === 0) return [];

      const { data, error } = await supabase
        .from('threat_vectors')
        .select('*')
        .in('threat_model_id', modelIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ThreatVector[];
    },
    enabled: !!modelsQuery.data && modelsQuery.data.length > 0,
  });

  const createThreatModel = useMutation({
    mutationFn: async (model: Omit<ThreatModel, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('threat_models')
        .insert(model)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-models'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast.success('Threat model created');
    },
    onError: (error) => {
      toast.error('Failed to create threat model');
      console.error(error);
    },
  });

  const createThreatVector = useMutation({
    mutationFn: async (vector: Omit<ThreatVector, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('threat_vectors')
        .insert(vector)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-vectors'] });
      toast.success('Threat vector added');
    },
    onError: (error) => {
      toast.error('Failed to add threat vector');
      console.error(error);
    },
  });

  const updateThreatVector = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ThreatVector> }) => {
      const { data, error } = await supabase
        .from('threat_vectors')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-vectors'] });
    },
    onError: (error) => {
      toast.error('Failed to update threat vector');
      console.error(error);
    },
  });

  return {
    models: modelsQuery.data || [],
    vectors: vectorsQuery.data || [],
    isLoading: modelsQuery.isLoading || vectorsQuery.isLoading,
    error: modelsQuery.error || vectorsQuery.error,
    createThreatModel,
    createThreatVector,
    updateThreatVector,
    refetch: () => {
      modelsQuery.refetch();
      vectorsQuery.refetch();
    },
  };
}
