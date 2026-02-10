import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useThreatModels(modelId?: string) {
  return useQuery({
    queryKey: ['threat-models', modelId],
    queryFn: async () => {
      const q = supabase
        .from('threat_models')
        .select('*, threat_vectors(*)')
        .order('created_at', { ascending: false })
        .limit(20);
      const { data, error } = modelId ? await q.eq('model_id', modelId) : await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}
