import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { safeValidateArray, PolicyPackSchema } from '@/lib/api-validators';

export type PolicyStatus = 'draft' | 'active' | 'disabled';
export type CampaignStatus = 'draft' | 'running' | 'completed' | 'paused';

export interface PolicyPack {
  id: string;
  name: string;
  description: string | null;
  rules: any[];
  status: PolicyStatus;
  version: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RedTeamCampaign {
  id: string;
  name: string;
  description: string | null;
  model_id: string | null;
  attack_types: any[];
  status: CampaignStatus;
  coverage: number;
  findings_count: number;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PolicyViolation {
  id: string;
  model_id: string;
  policy_id: string | null;
  violation_type: string;
  severity: string;
  details: Record<string, any>;
  blocked: boolean;
  created_at: string;
}

export function usePolicyPacks() {
  return useQuery({
    queryKey: ['policy-packs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_packs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return safeValidateArray(PolicyPackSchema, data ?? [], 'policy-packs');
    },
  });
}

export function useRedTeamCampaigns() {
  return useQuery({
    queryKey: ['red-team-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('red_team_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RedTeamCampaign[];
    },
  });
}

export function usePolicyViolations(modelId?: string) {
  return useQuery({
    queryKey: ['policy-violations', modelId],
    queryFn: async () => {
      let query = supabase
        .from('policy_violations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (modelId) {
        query = query.eq('model_id', modelId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PolicyViolation[];
    },
  });
}

export function usePolicyStats() {
  return useQuery({
    queryKey: ['policy', 'stats'],
    queryFn: async () => {
      const [packsRes, campaignsRes, violationsRes] = await Promise.all([
        supabase.from('policy_packs').select('status'),
        supabase.from('red_team_campaigns').select('status, findings_count'),
        supabase.from('policy_violations').select('blocked'),
      ]);
      
      if (packsRes.error) throw packsRes.error;
      if (campaignsRes.error) throw campaignsRes.error;
      if (violationsRes.error) throw violationsRes.error;
      
      const activePolicies = packsRes.data.filter(p => p.status === 'active').length;
      const runningCampaigns = campaignsRes.data.filter(c => c.status === 'running').length;
      const totalFindings = campaignsRes.data.reduce((acc, c) => acc + (c.findings_count || 0), 0);
      const blockedViolations = violationsRes.data.filter(v => v.blocked).length;
      
      return { activePolicies, runningCampaigns, totalFindings, blockedViolations };
    },
  });
}

export function useCreatePolicyPack() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; rules?: any[] }) => {
      const { data, error } = await supabase
        .from('policy_packs')
        .insert({
          ...input,
          created_by: user?.id,
          status: 'draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as PolicyPack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-packs'] });
    },
  });
}

export function useCreateRedTeamCampaign() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; model_id?: string; attack_types?: any[] }) => {
      const { data, error } = await supabase
        .from('red_team_campaigns')
        .insert({
          ...input,
          created_by: user?.id,
          status: 'draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as RedTeamCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['red-team-campaigns'] });
    },
  });
}
