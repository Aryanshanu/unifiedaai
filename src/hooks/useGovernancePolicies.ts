import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  condition_type: string;
  condition_config: Record<string, unknown>;
  action_type: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GovernanceEnforcement {
  id: string;
  policy_id: string | null;
  target_type: string;
  target_id: string | null;
  attempted_action: string;
  decision: string;
  reason: string | null;
  overridden_by: string | null;
  override_justification: string | null;
  created_at: string;
}

export function useGovernancePolicies() {
  return useQuery({
    queryKey: ["governance-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_policies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GovernancePolicy[];
    },
  });
}

export function useCreateGovernancePolicy() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      scope?: string;
      condition_type: string;
      condition_config: Record<string, unknown>;
      action_type: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("governance_policies")
        .insert({ ...input, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as GovernancePolicy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-policies"] });
    },
  });
}

export function useToggleGovernancePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("governance_policies")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-policies"] });
    },
  });
}

export function useDeleteGovernancePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("governance_policies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-policies"] });
    },
  });
}

export function useGovernanceEnforcements() {
  return useQuery({
    queryKey: ["governance-enforcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_enforcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as GovernanceEnforcement[];
    },
  });
}
