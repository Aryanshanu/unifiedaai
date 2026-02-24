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
  // Governance fields
  business_owner_email?: string | null;
  license?: string | null;
  base_model?: string | null;
  model_card_url?: string | null;
}

// Extended model with joined system data
export interface ModelWithSystem extends Model {
  system?: {
    id: string;
    name: string;
    risk_tier?: RiskTier | null;
    uri_score: number | null;
    runtime_risk_score: number | null;
    deployment_status: DeploymentStatus;
    requires_approval: boolean;
    status: ModelStatus;
    endpoint: string | null;
    api_token_encrypted: string | null;
    // Governance fields
    business_owner_email?: string | null;
    technical_owner?: string | null;
    license?: string | null;
    access_tier?: string | null;
    sla_tier?: string | null;
    base_model?: string | null;
    model_card_url?: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
    environment: string;
    data_residency?: string | null;
    criticality?: number;
    business_sensitivity?: string;
    data_sensitivity?: string;
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
  api_token?: string; // Generic API token for non-HuggingFace models
  project_id: string; // Required - must select a project
  // Governance fields
  business_owner_email?: string;
  license?: string;
  base_model?: string;
  model_card_url?: string;
  access_tier?: string;
  sla_tier?: string;
  // Traceability fields
  training_dataset_id?: string;
  limitations?: string;
  intended_use?: string;
  risk_classification?: string;
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
          system:systems(id, name, uri_score, runtime_risk_score, deployment_status, requires_approval, status, endpoint, api_token_encrypted, business_owner_email, technical_owner, license, access_tier, sla_tier, base_model, model_card_url),
          project:projects(id, name, environment, data_residency, criticality, business_sensitivity, data_sensitivity)
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
          system:systems(id, name, uri_score, runtime_risk_score, deployment_status, requires_approval, status, endpoint, api_token_encrypted, business_owner_email, technical_owner, license, access_tier, sla_tier, base_model, model_card_url),
          project:projects(id, name, environment, data_residency, criticality, business_sensitivity, data_sensitivity)
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
      // All inference routes through Lovable AI Gateway
      const resolvedProvider = 'Lovable';
      const systemEndpoint = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      const resolvedModelName = 'google/gemini-3-flash-preview';
      
      // Step 1: Create the System first
      const { data: systemData, error: systemError } = await supabase
        .from('systems')
        .insert({
          project_id: input.project_id,
          name: input.name,
          provider: resolvedProvider,
          system_type: 'model',
          model_name: resolvedModelName,
          endpoint: systemEndpoint,
          use_case: input.use_case || null,
          status: 'draft',
          deployment_status: 'draft',
          owner_id: user?.id,
          // Governance fields
          business_owner_email: input.business_owner_email || null,
          license: input.license || null,
          base_model: input.base_model || null,
          model_card_url: input.model_card_url || null,
          access_tier: input.access_tier || 'internal-only',
          sla_tier: input.sla_tier || 'best-effort',
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
          provider: resolvedProvider,
          use_case: input.use_case || null,
          endpoint: systemEndpoint,
          project_id: input.project_id,
          system_id: systemData.id,
          owner_id: user?.id,
          status: 'draft',
          // Governance fields on model too
          business_owner_email: input.business_owner_email || null,
          license: input.license || null,
          base_model: input.base_model || null,
          model_card_url: input.model_card_url || null,
          // Traceability fields
          training_dataset_id: input.training_dataset_id || null,
          limitations: input.limitations || null,
          intended_use: input.intended_use || null,
          risk_classification: input.risk_classification || null,
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
          system:systems(id, name, uri_score, runtime_risk_score, deployment_status, requires_approval, status, endpoint, api_token_encrypted, business_owner_email, technical_owner, license, access_tier, sla_tier, base_model, model_card_url)
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
