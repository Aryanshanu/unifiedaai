import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AIAgent {
  id: string;
  name: string;
  agent_type: string;
  description: string | null;
  status: string;
  risk_tier: string;
  model_id: string | null;
  system_id: string | null;
  vendor_id: string | null;
  capabilities: string[];
  permissions: string[];
  max_autonomy_level: string;
  environment: string;
  last_activity_at: string | null;
  trace_enabled: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AgentTrace {
  id: string;
  agent_id: string;
  trace_type: string;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  duration_ms: number | null;
  status: string;
  policy_violations: string[];
  metadata: Record<string, unknown>;
  parent_trace_id: string | null;
  created_at: string;
}

export function useAgents() {
  return useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as AIAgent[];
    },
  });
}

export function useAgentTraces(agentId?: string) {
  return useQuery({
    queryKey: ['agent-traces', agentId],
    queryFn: async () => {
      let query = supabase
        .from('agent_traces')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (agentId) query = query.eq('agent_id', agentId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AgentTrace[];
    },
    enabled: !!agentId || agentId === undefined,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (agent: Partial<AIAgent>) => {
      const { data, error } = await supabase
        .from('ai_agents')
        .insert({ ...agent, created_by: user?.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agent registered');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
