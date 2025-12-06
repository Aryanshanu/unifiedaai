import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type ApprovalStatus = Database["public"]["Enums"]["approval_status"];

export interface SystemApproval {
  id: string;
  system_id: string;
  requested_by: string | null;
  approver_id: string | null;
  status: ApprovalStatus;
  reason: string | null;
  approved_at: string | null;
  created_at: string;
}

export function useSystemApprovals(systemId?: string) {
  return useQuery({
    queryKey: ["system-approvals", systemId],
    queryFn: async () => {
      let query = supabase
        .from("system_approvals")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (systemId) {
        query = query.eq("system_id", systemId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SystemApproval[];
    },
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ["system-approvals", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_approvals")
        .select(`
          *,
          systems (
            id,
            name,
            provider,
            system_type,
            project_id,
            projects (name)
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useLatestApproval(systemId: string) {
  return useQuery({
    queryKey: ["system-approvals", systemId, "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_approvals")
        .select("*")
        .eq("system_id", systemId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as SystemApproval | null;
    },
    enabled: !!systemId,
  });
}

export function useRequestApproval() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (systemId: string) => {
      // Update system status
      await supabase
        .from("systems")
        .update({ deployment_status: "pending_approval" })
        .eq("id", systemId);

      // Create approval request
      const { data, error } = await supabase
        .from("system_approvals")
        .insert([{
          system_id: systemId,
          requested_by: user?.id,
          status: "pending",
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data as SystemApproval;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["system-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });
}

export function useProcessApproval() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      approvalId, 
      systemId,
      status, 
      reason 
    }: { 
      approvalId: string; 
      systemId: string;
      status: "approved" | "rejected"; 
      reason?: string;
    }) => {
      // Update approval
      const { data, error } = await supabase
        .from("system_approvals")
        .update({
          status,
          reason,
          approver_id: user?.id,
          approved_at: status === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", approvalId)
        .select()
        .single();
      
      if (error) throw error;

      // Update system deployment status
      await supabase
        .from("systems")
        .update({ 
          deployment_status: status === "approved" ? "approved" : "blocked"
        })
        .eq("id", systemId);

      return data as SystemApproval;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });
}
