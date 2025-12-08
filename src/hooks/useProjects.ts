import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type EnvironmentType = Database["public"]["Enums"]["environment_type"];
type SensitivityLevel = Database["public"]["Enums"]["sensitivity_level"];

export interface Project {
  id: string;
  name: string;
  description: string | null;
  organization: string | null;
  business_sensitivity: SensitivityLevel;
  data_sensitivity: SensitivityLevel;
  criticality: number;
  environment: EnvironmentType;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  // Governance fields
  data_residency?: string | null;
  primary_owner_email?: string | null;
  compliance_frameworks?: string[] | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  organization?: string;
  business_sensitivity?: SensitivityLevel;
  data_sensitivity?: SensitivityLevel;
  criticality?: number;
  environment?: EnvironmentType;
  // Governance fields
  data_residency?: string;
  primary_owner_email?: string;
  compliance_frameworks?: string[];
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data, error } = await supabase
        .from("projects")
        .insert([{
          ...input,
          owner_id: user?.id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", data.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
