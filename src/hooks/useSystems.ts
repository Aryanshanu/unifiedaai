import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database, Json } from "@/integrations/supabase/types";

type SystemType = Database["public"]["Enums"]["system_type"];
type ModelStatus = Database["public"]["Enums"]["model_status"];

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
  owner_id: string | null;
  created_at: string;
  updated_at: string;
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
      let query = supabase
        .from("systems")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as System[];
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
      const { data, error } = await supabase
        .from("systems")
        .insert([{
          ...input,
          api_headers: input.api_headers as unknown as Json,
          owner_id: user?.id,
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
