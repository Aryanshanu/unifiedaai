/**
 * @status ORPHANED - No page/route currently imports this hook
 * @todo Create UI route or deprecate this hook in next sprint
 * @tracked-in audit-report-2026-03-30
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useThreatModels(modelId?: string) {
  return useQuery({
    queryKey: ['threat-models', modelId],
    queryFn: async () => {
      if (modelId) {
        const { data, error } = await supabase
          .from('threat_models' as any)
          .select('*, threat_vectors(*)')
          .eq('model_id', modelId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        return (data as any[]) ?? [];
      }
      const { data, error } = await supabase
        .from('threat_models' as any)
        .select('*, threat_vectors(*)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 30_000,
  });
}
