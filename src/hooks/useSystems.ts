import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database, Json } from "@/integrations/supabase/types";

type SystemType = Database["public"]["Enums"]["system_type"];
type ModelStatus = Database["public"]["Enums"]["model_status"];
type DeploymentStatus = Database["public"]["Enums"]["deployment_status"];

export interface System {
  id: string;
  project_id: string;
  name: string;
  system_type: SystemType;
  provider: string;
  model_name: string | null;
  endpoint: string | null;
  api_headers: Record<string, unknown> | null;
  api_token_encrypted: string | null;
  use_case: string | null;
  status: ModelStatus;
  deployment_status: DeploymentStatus;
  requires_approval: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  uri_score: number | null;
  runtime_risk_score: number | null;
  last_risk_calculation: string | null;
  // Governance enforcement fields
  registry_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  lock_reason: string | null;
}

export interface CreateSystemInput {
  project_id: string;
  name: string;
  system_type?: SystemType;
  provider: string;
  model_name?: string;
  endpoint?: string;
  api_headers?: Record<string, unknown>;
  api_token_encrypted?: string;
  use_case?: string;
}

export function useSystems(projectId?: string) {
   return useQuery({
     queryKey: ["systems", projectId],
     queryFn: async () => {
       // SECURITY: Never select api_token_encrypted - tokens must stay server-side only
       let query = supabase
         .from("systems")
         .select(`
           id,
           project_id,
           name,
           system_type,
           provider,
           model_name,
           endpoint,
           use_case,
           status,
           deployment_status,
           requires_approval,
           owner_id,
           created_at,
           updated_at,
           uri_score,
           runtime_risk_score,
           last_risk_calculation,
           registry_locked,
           locked_at,
           locked_by,
           lock_reason
         `)
         .order("created_at", { ascending: false });
       
       if (projectId) {
         query = query.eq("project_id", projectId);
       }
       
       const { data, error } = await query;
       
       if (error) throw error;
       
       // Map to System interface (api_headers and api_token_encrypted will be null from client-side)
       return (data || []).map(s => ({
         ...s,
         api_headers: null,
         api_token_encrypted: null,
       })) as System[];
     },
   });
}

export function useSystem(id: string) {
  return useQuery({
    queryKey: ["systems", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("systems")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as System;
    },
    enabled: !!id,
  });
}

export function useCreateSystem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSystemInput) => {
      // FIX #8: Auto-set requires_approval and pending_approval for production
      const isProduction = input.use_case?.toLowerCase().includes("production") || false;
      
      const { data, error } = await supabase
        .from("systems")
        .insert([{
          ...input,
          api_headers: input.api_headers as unknown as Json,
          owner_id: user?.id,
          // FIX #8: If this looks like production, enforce approval
          requires_approval: isProduction ? true : undefined,
          deployment_status: isProduction ? "pending_approval" : "draft",
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data as System;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["systems"] });
      queryClient.invalidateQueries({ queryKey: ["systems", data.project_id] });
    },
  });
}

export function useUpdateSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, api_headers, ...input }: Partial<System> & { id: string }) => {
      const { data, error } = await supabase
        .from("systems")
        .update({
          ...input,
          ...(api_headers && { api_headers: api_headers as unknown as Json }),
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as System;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["systems"] });
      queryClient.invalidateQueries({ queryKey: ["systems", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["systems", "detail", data.id] });
    },
  });
}

export function useDeleteSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("systems")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });
}

// Lock a system (Point of No Return - requires admin to unlock)
export function useLockSystem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ systemId, reason }: { systemId: string; reason: string }) => {
      const { data, error } = await supabase
        .from("systems")
        .update({
          registry_locked: true,
          locked_at: new Date().toISOString(),
          locked_by: user?.id,
          lock_reason: reason,
          deployment_status: "blocked" as DeploymentStatus,
        })
        .eq("id", systemId)
        .select()
        .single();
      
      if (error) throw error;
      return data as System;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["systems"] });
      queryClient.invalidateQueries({ queryKey: ["systems", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["systems", "detail", data.id] });
    },
  });
}

// Unlock a system (Admin only, requires justification)
export function useUnlockSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ systemId, justification }: { systemId: string; justification: string }) => {
      if (justification.length < 20) {
        throw new Error("Justification must be at least 20 characters");
      }
      
      const { data, error } = await supabase
        .from("systems")
        .update({
          registry_locked: false,
          deployment_status: "draft" as DeploymentStatus,
        })
        .eq("id", systemId)
        .select()
        .single();
      
      if (error) throw error;
      return data as System;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["systems"] });
      queryClient.invalidateQueries({ queryKey: ["systems", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["systems", "detail", data.id] });
    },
  });
}
