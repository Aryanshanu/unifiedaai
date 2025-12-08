import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KGNode {
  id: string;
  entity_type: string;
  entity_id: string;
  label: string;
  properties: Record<string, any> | null;
  hash?: string;
  version?: number;
  source?: string;
  status?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface KGEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  properties: Record<string, any> | null;
  hash?: string;
  weight?: number;
  evidence?: Record<string, any>;
  valid_from?: string;
  valid_to?: string;
  created_at: string;
}

export function useKGNodes() {
  return useQuery({
    queryKey: ['kg-nodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kg_nodes')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as KGNode[];
    },
  });
}

export function useKGEdges() {
  return useQuery({
    queryKey: ['kg-edges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kg_edges')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as KGEdge[];
    },
  });
}

export function useKnowledgeGraphStats() {
  return useQuery({
    queryKey: ['kg', 'stats'],
    queryFn: async () => {
      const [nodesRes, edgesRes] = await Promise.all([
        supabase.from('kg_nodes').select('entity_type'),
        supabase.from('kg_edges').select('id'),
      ]);
      if (nodesRes.error) throw nodesRes.error;
      if (edgesRes.error) throw edgesRes.error;
      const totalNodes = nodesRes.data.length;
      const totalEdges = edgesRes.data.length;
      const typeCounts = nodesRes.data.reduce((acc, node) => {
        acc[node.entity_type] = (acc[node.entity_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return { totalNodes, totalEdges, typeCounts };
    },
  });
}

export function useKGLineage(entityId: string, entityType = 'model') {
  return useQuery({
    queryKey: ['kg', 'lineage', entityId, entityType],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('kg-lineage', {
        body: {},
        headers: { 'x-entity-id': entityId, 'x-entity-type': entityType },
      });
      // Workaround: call with GET params via URL
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kg-lineage/${entityId}?type=${entityType}&blast_radius=true&depth=3`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      if (!response.ok) throw new Error('Failed to fetch lineage');
      return response.json();
    },
    enabled: !!entityId,
  });
}

export function useKGQuery() {
  return useMutation({
    mutationFn: async (query: string) => {
      const { data, error } = await supabase.functions.invoke('kg-query', {
        body: { query, limit: 100 },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useKGExplain() {
  return useMutation({
    mutationFn: async ({ question, entity_id, entity_type }: { question: string; entity_id?: string; entity_type?: string }) => {
      const { data, error } = await supabase.functions.invoke('kg-explain', {
        body: { question, entity_id, entity_type },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useKGUpsert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ nodes, edges }: { nodes?: any[]; edges?: any[] }) => {
      const { data, error } = await supabase.functions.invoke('kg-upsert', {
        body: { nodes, edges },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kg-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['kg-edges'] });
      queryClient.invalidateQueries({ queryKey: ['kg', 'stats'] });
    },
  });
}

export function useKGSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('kg-sync', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kg-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['kg-edges'] });
      queryClient.invalidateQueries({ queryKey: ['kg', 'stats'] });
    },
  });
}
