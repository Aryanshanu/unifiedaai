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
      
      if (systemsError) throw new Error(`Failed to fetch project systems: ${systemsError.message}`);
      
      const systemIds = systems?.map(s => s.id) || [];
      console.log(`[useDeleteProject] Found ${systemIds.length} systems to delete`);
      
      if (systemIds.length > 0) {
        // Step 2: Fetch threat_model IDs (threat_vectors references threat_models)
        const { data: threatModels } = await supabase
          .from("threat_models")
          .select("id")
          .in("system_id", systemIds);
        const threatModelIds = threatModels?.map(t => t.id) || [];

        // Step 3: Delete threat_vectors first
        if (threatModelIds.length > 0) {
          const { error } = await supabase.from("threat_vectors").delete().in("threat_model_id", threatModelIds);
          if (error) console.warn(`[useDeleteProject] threat_vectors:`, error.message);
        }

        // Step 4: Delete models by system_id
        const { error: modelsError } = await supabase.from("models").delete().in("system_id", systemIds);
        if (modelsError) throw new Error(`Failed to delete models: ${modelsError.message}`);

        // Step 5-18: Delete all system-referencing tables
        const systemRefTables = [
          "risk_assessments",
          "impact_assessments",
          "system_documents",
          "system_approvals",
          "regulatory_reports",
          "security_test_runs",
          "security_findings",
          "threat_models",
          "risk_metrics",
          "evaluation_requirements",
          "deployment_attestations",
          "mlops_governance_events",
          "request_logs",
        ] as const;

        for (const table of systemRefTables) {
          const { error } = await supabase.from(table).delete().in("system_id", systemIds);
          if (error) console.warn(`[useDeleteProject] ${table}:`, error.message);
        }

        // events_raw uses source_system_id
        const { error: eventsError } = await supabase.from("events_raw").delete().in("source_system_id", systemIds);
        if (eventsError) console.warn(`[useDeleteProject] events_raw:`, eventsError.message);

        // Step 19: Delete systems
        const { error: deleteSystemsError } = await supabase.from("systems").delete().in("id", systemIds);
        if (deleteSystemsError) throw new Error(`Failed to delete systems: ${deleteSystemsError.message}`);
      }

      // Delete models directly linked to project_id
      const { error: directModelsError } = await supabase.from("models").delete().eq("project_id", id);
      if (directModelsError) throw new Error(`Failed to delete project models: ${directModelsError.message}`);

      // Step 20: Delete project-referencing tables
      await supabase.from("request_logs").delete().eq("project_id", id);
      await supabase.from("risk_assessments").delete().eq("project_id", id);
      await supabase.from("impact_assessments").delete().eq("project_id", id);

      // Step 21: Delete the project
      const { error: projectError } = await supabase.from("projects").delete().eq("id", id);
      if (projectError) throw new Error(`Failed to delete project: ${projectError.message}`);
      
      console.log(`[useDeleteProject] Successfully deleted project ${id} and all related data`);

      console.log(`[useDeleteProject] Successfully deleted project ${id} and all related data`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["systems"] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}
