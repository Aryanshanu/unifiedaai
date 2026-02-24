import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SemanticDefinition {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  definition_yaml: string;
  owner_email: string | null;
  status: 'draft' | 'active' | 'deprecated';
  version: number;
  definition_hash: string | null;
  grain: string | null;
  sql_logic: string | null;
  synonyms: string[] | null;
  ai_context: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDefinitionInput {
  name: string;
  display_name?: string;
  description?: string;
  definition_yaml: string;
  owner_email?: string;
  status?: 'draft' | 'active' | 'deprecated';
  grain?: string;
  sql_logic?: string;
  synonyms?: string[];
  ai_context?: string;
  metadata?: Record<string, unknown>;
}

const TABLE = 'semantic_definitions';

export function useSemanticDefinitions() {
  return useQuery({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as SemanticDefinition[];
    },
  });
}

export function useSemanticDefinition(id: string) {
  return useQuery({
    queryKey: [TABLE, id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as SemanticDefinition | null;
    },
    enabled: !!id,
  });
}

export function useCreateDefinition() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateDefinitionInput) => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SemanticDefinition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
    },
  });
}

export function useUpdateDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SemanticDefinition> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SemanticDefinition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      queryClient.invalidateQueries({ queryKey: [TABLE, data.id] });
    },
  });
}

export function useDeleteDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
    },
  });
}
