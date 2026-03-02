import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ShadowAIDiscovery {
  id: string;
  discovery_method: string;
  ai_system_name: string;
  ai_system_type: string;
  department: string | null;
  discovered_by: string | null;
  risk_assessment: string;
  status: string;
  evidence: Record<string, unknown>;
  remediation_notes: string | null;
  registered_as_system_id: string | null;
  registered_as_agent_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export function useShadowAIDiscoveries() {
  return useQuery({
    queryKey: ['shadow-ai-discoveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shadow_ai_discoveries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ShadowAIDiscovery[];
    },
  });
}

export function useReportShadowAI() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (discovery: Partial<ShadowAIDiscovery>) => {
      const { data, error } = await supabase
        .from('shadow_ai_discoveries')
        .insert({ ...discovery, discovered_by: user?.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shadow-ai-discoveries'] });
      toast.success('Shadow AI reported');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateShadowAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ShadowAIDiscovery>) => {
      const { data, error } = await supabase
        .from('shadow_ai_discoveries')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shadow-ai-discoveries'] });
      toast.success('Discovery updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
