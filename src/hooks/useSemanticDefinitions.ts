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
  upstream_dependencies: unknown[] | null;
  test_suite: Record<string, unknown> | null;
  deployment_count: number;
  last_queried_at: string | null;
  query_count: number;
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

export interface DefinitionVersion {
  id: string;
  definition_id: string;
  version: number;
  definition_yaml: string;
  definition_hash: string | null;
  change_summary: string | null;
  promoted_by: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SemanticQueryLogEntry {
  id: string;
  definition_id: string | null;
  metric_name: string;
  consumer_type: string;
  query_latency_ms: number | null;
  row_count: number | null;
  status: string;
  error_message: string | null;
  queried_by: string | null;
  queried_at: string;
}

export interface SemanticDriftAlert {
  id: string;
  definition_id: string;
  drift_type: string;
  severity: string;
  details: Record<string, unknown>;
  status: string;
  detected_at: string;
  resolved_at: string | null;
}

const TABLE = 'semantic_definitions';
const VERSIONS_TABLE = 'semantic_definition_versions';
const QUERY_LOG_TABLE = 'semantic_query_log';
const DRIFT_TABLE = 'semantic_drift_alerts';

// ─── Definitions CRUD ────────────────────────────────────

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
        .insert({ ...input, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;

      // Trigger semantic compiler for vector sync
      supabase.functions.invoke('semantic-compiler', {
        body: { definition_id: data.id },
      }).catch(console.error);

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

      // Trigger semantic compiler for vector sync
      supabase.functions.invoke('semantic-compiler', {
        body: { definition_id: data.id },
      }).catch(console.error);

      return data as SemanticDefinition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      queryClient.invalidateQueries({ queryKey: [TABLE, data.id] });
      queryClient.invalidateQueries({ queryKey: [VERSIONS_TABLE, data.id] });
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

// ─── Version History ─────────────────────────────────────

export function useDefinitionVersions(definitionId: string) {
  return useQuery({
    queryKey: [VERSIONS_TABLE, definitionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(VERSIONS_TABLE)
        .select('*')
        .eq('definition_id', definitionId)
        .order('version', { ascending: false });
      if (error) throw error;
      return data as DefinitionVersion[];
    },
    enabled: !!definitionId,
  });
}

// ─── Query Log ───────────────────────────────────────────

export function useSemanticQueryLog() {
  return useQuery({
    queryKey: [QUERY_LOG_TABLE],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(QUERY_LOG_TABLE)
        .select('*')
        .order('queried_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as SemanticQueryLogEntry[];
    },
  });
}

// ─── Drift Alerts ────────────────────────────────────────

export function useSemanticDriftAlerts() {
  return useQuery({
    queryKey: [DRIFT_TABLE],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(DRIFT_TABLE)
        .select('*')
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return data as SemanticDriftAlert[];
    },
  });
}

export function useDefinitionDriftCount(definitionId: string) {
  return useQuery({
    queryKey: [DRIFT_TABLE, 'count', definitionId],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from(DRIFT_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('definition_id', definitionId)
        .eq('status', 'open');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!definitionId,
  });
}

export function useResolveDriftAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from(DRIFT_TABLE)
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIFT_TABLE] });
    },
  });
}

// ─── Drift Detection Trigger ─────────────────────────────

export function useRunDriftCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('semantic-drift-check');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIFT_TABLE] });
    },
  });
}
