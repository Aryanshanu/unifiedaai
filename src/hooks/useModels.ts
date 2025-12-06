import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

export type ModelStatus = 'draft' | 'active' | 'deprecated' | 'archived';
type DeploymentStatus = Database["public"]["Enums"]["deployment_status"];
type RiskTier = Database["public"]["Enums"]["risk_tier"];

export interface Model {
  id: string;
  name: string;
  description: string | null;
  model_type: string;
  version: string;
  status: ModelStatus;
  provider: string | null;
  use_case: string | null;
  endpoint: string | null;
  owner_id: string | null;
  fairness_score: number | null;
  robustness_score: number | null;
  privacy_score: number | null;
  toxicity_score: number | null;
  overall_score: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  huggingface_model_id: string | null;
  huggingface_endpoint: string | null;
  huggingface_api_token: string | null;
  project_id: string | null;
  system_id: string | null;
}

// Extended model with joined system data
export interface ModelWithSystem extends Model {
  system?: {
    id: string;
    name: string;
    risk_tier: RiskTier | null;
    uri_score: number | null;
    runtime_risk_score: number | null;
    deployment_status: DeploymentStatus;
    requires_approval: boolean;
    status: ModelStatus;
  } | null;
  project?: {
    id: string;
    name: string;
    environment: string;
  } | null;
}

export interface CreateModelInput {
  name: string;
  description?: string;
  model_type: string;
  version?: string;
  provider?: string;
  use_case?: string;
  endpoint?: string;
  huggingface_model_id?: string;
  huggingface_endpoint?: string;
  huggingface_api_token?: string;
  project_id: string; // Required - must select a project
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      // Fetch models with joined system and project data
      const { data, error } = await supabase
        .from('models')
        .select(`
          *,
          system:systems(id, name, uri_score, runtime_risk_score, deployment_status, requires_approval, status),
          project:projects(id, name, environment)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to include risk_tier calculated from uri_score
      return (data || []).map(model => {
        const system = model.system as any;
        if (system && system.uri_score !== null) {
          const uriScore = system.uri_score;
          let risk_tier: RiskTier = 'low';
          if (uriScore >= 81) risk_tier = 'critical';
          else if (uriScore >= 61) risk_tier = 'high';
          else if (uriScore >= 31) risk_tier = 'medium';
          system.risk_tier = risk_tier;
        }
        return model as ModelWithSystem;
      });
    },
  });
}

export function useModel(id: string) {
  return useQuery({
    queryKey: ['models', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('models')
        .select(`
          *,
          system:systems(id, name, uri_score, runtime_risk_score, deployment_status, requires_approval, status),
          project:projects(id, name, environment)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Model not found');
      
      // Add risk_tier
      const system = data.system as any;
      if (system && system.uri_score !== null) {
        const uriScore = system.uri_score;
        let risk_tier: RiskTier = 'low';
        if (uriScore >= 81) risk_tier = 'critical';
        else if (uriScore >= 61) risk_tier = 'high';
        else if (uriScore >= 31) risk_tier = 'medium';
        system.risk_tier = risk_tier;
      }
      
      return data as ModelWithSystem;
    },
    enabled: !!id,
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateModelInput) => {
      // Step 1: Create the System first
      const { data: systemData, error: systemError } = await supabase
        .from('systems')
        .insert({
          project_id: input.project_id,
          name: input.name,
          provider: input.provider || 'Custom',
          system_type: 'model',
          model_name: input.huggingface_model_id || input.name,
          endpoint: input.endpoint || input.huggingface_endpoint || null,
          use_case: input.use_case || null,
          status: 'draft',
          deployment_status: 'draft',
          owner_id: user?.id,
        })
        .select()
        .single();
      
      if (systemError) throw systemError;

      // Step 2: Create the Model linked to the System
      const { data: modelData, error: modelError } = await supabase
        .from('models')
        .insert({
          name: input.name,
          description: input.description || null,
          model_type: input.model_type,
          version: input.version || '1.0.0',
          provider: input.provider || null,
          use_case: input.use_case || null,
          endpoint: input.endpoint || null,
          huggingface_model_id: input.huggingface_model_id || null,
          huggingface_endpoint: input.huggingface_endpoint || null,
          huggingface_api_token: input.huggingface_api_token || null,
          project_id: input.project_id,
          system_id: systemData.id,
          owner_id: user?.id,
          status: 'draft',
        })
        .select()
        .single();
      
      if (modelError) {
        // Rollback: delete the system if model creation fails
        await supabase.from('systems').delete().eq('id', systemData.id);
        throw modelError;
      }
      
      return { model: modelData as Model, system: systemData };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['systems'] });
      queryClient.invalidateQueries({ queryKey: ['systems', data.system.project_id] });
    },
  });
}

export function useUpdateModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Model> & { id: string }) => {
      const { data, error } = await supabase
        .from('models')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Model;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['models', data.id] });
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the model to find its system_id
      const { data: model } = await supabase
        .from('models')
        .select('system_id')
        .eq('id', id)
        .single();
      
      // Delete the model
      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Also delete the linked system if it exists
      if (model?.system_id) {
        await supabase.from('systems').delete().eq('id', model.system_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['systems'] });
    },
  });
}

export function useModelStats() {
  return useQuery({
    queryKey: ['models', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('models')
        .select('status');
      
      if (error) throw error;
      
      const total = data.length;
      const active = data.filter(m => m.status === 'active').length;
      const draft = data.filter(m => m.status === 'draft').length;
      const deprecated = data.filter(m => m.status === 'deprecated').length;
      
      return { total, active, draft, deprecated };
    },
  });
}

// Hook to get models for a specific project
export function useProjectModels(projectId: string) {
  return useQuery({
    queryKey: ['models', 'project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('models')
        .select(`
          *,
          system:systems(id, name, uri_score, runtime_risk_score, deployment_status, requires_approval, status)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(model => {
        const system = model.system as any;
        if (system && system.uri_score !== null) {
          const uriScore = system.uri_score;
          let risk_tier: RiskTier = 'low';
          if (uriScore >= 81) risk_tier = 'critical';
          else if (uriScore >= 61) risk_tier = 'high';
          else if (uriScore >= 31) risk_tier = 'medium';
          system.risk_tier = risk_tier;
        }
        return model as ModelWithSystem;
      });
    },
    enabled: !!projectId,
  });
}
