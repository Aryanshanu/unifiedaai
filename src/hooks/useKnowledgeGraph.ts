import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KGNode {
  id: string;
  entity_type: string;
  entity_id: string;
  label: string;
  properties: Record<string, any> | null;
  created_at: string;
}

export interface KGEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  properties: Record<string, any> | null;
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
      
      // Count by entity type
      const typeCounts = nodesRes.data.reduce((acc, node) => {
        acc[node.entity_type] = (acc[node.entity_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return { totalNodes, totalEdges, typeCounts };
    },
  });
}
