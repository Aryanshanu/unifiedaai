import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useThreatModels(modelId?: string) {
  return useQuery({
    queryKey: ['threat-models', modelId],
    queryFn: async () => {
      let query = supabase
        .from('threat_models')
        .select('*, threat_vectors(*)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (modelId) query = query.eq('model_id', modelId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}
