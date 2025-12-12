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
      console.log(`[useDeleteProject] Starting cascade delete for project: ${id}`);
      
      // Step 1: Get all systems in this project
      const { data: systems, error: systemsError } = await supabase
        .from("systems")
        .select("id")
        .eq("project_id", id);
      
      if (systemsError) {
        console.error(`[useDeleteProject] Failed to fetch systems for project ${id}:`, systemsError);
        throw new Error(`Failed to fetch project systems: ${systemsError.message}`);
      }
      
      const systemIds = systems?.map(s => s.id) || [];
      console.log(`[useDeleteProject] Found ${systemIds.length} systems to delete`);
      
      // Step 2: Delete all models linked to these systems (or directly to project)
      if (systemIds.length > 0) {
        const { error: modelsError } = await supabase
          .from("models")
          .delete()
          .in("system_id", systemIds);
        
        if (modelsError) {
          console.error(`[useDeleteProject] Failed to delete models:`, modelsError);
          throw new Error(`Failed to delete project models: ${modelsError.message}`);
        }
        console.log(`[useDeleteProject] Deleted models for ${systemIds.length} systems`);
      }
      
      // Also delete any models directly linked to project_id
      const { error: directModelsError } = await supabase
        .from("models")
        .delete()
        .eq("project_id", id);
      
      if (directModelsError) {
        console.error(`[useDeleteProject] Failed to delete direct models:`, directModelsError);
        throw new Error(`Failed to delete project models: ${directModelsError.message}`);
      }
      
      // Step 3: Delete related data for systems (risk_assessments, impact_assessments, request_logs, etc.)
      if (systemIds.length > 0) {
        // Delete risk assessments
        const { error: riskError } = await supabase
          .from("risk_assessments")
          .delete()
          .in("system_id", systemIds);
        if (riskError) console.warn(`[useDeleteProject] Warning - risk_assessments delete:`, riskError.message);
        
        // Delete impact assessments
        const { error: impactError } = await supabase
          .from("impact_assessments")
          .delete()
          .in("system_id", systemIds);
        if (impactError) console.warn(`[useDeleteProject] Warning - impact_assessments delete:`, impactError.message);
        
        // Delete system documents
        const { error: docsError } = await supabase
          .from("system_documents")
          .delete()
          .in("system_id", systemIds);
        if (docsError) console.warn(`[useDeleteProject] Warning - system_documents delete:`, docsError.message);
        
        // Delete system approvals
        const { error: approvalsError } = await supabase
          .from("system_approvals")
          .delete()
          .in("system_id", systemIds);
        if (approvalsError) console.warn(`[useDeleteProject] Warning - system_approvals delete:`, approvalsError.message);
      }
      
      // Step 4: Delete all systems
      if (systemIds.length > 0) {
        const { error: deleteSystemsError } = await supabase
          .from("systems")
          .delete()
          .in("id", systemIds);
        
        if (deleteSystemsError) {
          console.error(`[useDeleteProject] Failed to delete systems:`, deleteSystemsError);
          throw new Error(`Failed to delete project systems: ${deleteSystemsError.message}`);
        }
        console.log(`[useDeleteProject] Deleted ${systemIds.length} systems`);
      }
      
      // Step 5: Finally delete the project
      const { error: projectError } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);
      
      if (projectError) {
        console.error(`[useDeleteProject] Failed to delete project:`, projectError);
        throw new Error(`Failed to delete project: ${projectError.message}`);
      }
      
      console.log(`[useDeleteProject] Successfully deleted project ${id} and all related data`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["systems"] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}
