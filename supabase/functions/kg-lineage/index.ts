import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LineageNode {
  id: string;
  entity_type: string;
  entity_id: string;
  label: string;
  properties: Record<string, any>;
  status: string;
  depth: number;
  direction: 'upstream' | 'downstream' | 'center';
}

interface LineageEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  properties: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const entityId = pathParts[pathParts.length - 1];
    const entityType = url.searchParams.get('type') || 'model';
    const maxDepth = parseInt(url.searchParams.get('depth') || '3');
    const includeBlastRadius = url.searchParams.get('blast_radius') === 'true';

    console.log(`KG Lineage: ${entityType}:${entityId}, depth=${maxDepth}`);

    // Find the starting node
    const { data: startNode } = await supabase
      .from('kg_nodes')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single();

    let centerNode = startNode;
    
    if (!startNode) {
      // Try by node ID directly
      const { data: nodeById } = await supabase
        .from('kg_nodes')
        .select('*')
        .eq('id', entityId)
        .single();
      
      if (!nodeById) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Node not found' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      centerNode = nodeById;
    }

    const centerNodeId = centerNode?.id || entityId;
    const visitedNodes = new Set<string>();
    const lineageNodes: LineageNode[] = [];
    const lineageEdges: LineageEdge[] = [];

    // BFS traversal for upstream (incoming edges)
    async function traverseUpstream(nodeId: string, depth: number) {
      if (depth > maxDepth || visitedNodes.has(`up-${nodeId}`)) return;
      visitedNodes.add(`up-${nodeId}`);

      const { data: incomingEdges } = await supabase
        .from('kg_edges')
        .select('*')
        .eq('target_node_id', nodeId);

      for (const edge of incomingEdges || []) {
        if (!lineageEdges.find(e => e.id === edge.id)) {
          lineageEdges.push({
            id: edge.id,
            source_node_id: edge.source_node_id,
            target_node_id: edge.target_node_id,
            relationship_type: edge.relationship_type,
            properties: edge.properties || {},
          });
        }

        const { data: sourceNode } = await supabase
          .from('kg_nodes')
          .select('*')
          .eq('id', edge.source_node_id)
          .single();

        if (sourceNode && !lineageNodes.find(n => n.id === sourceNode.id)) {
          lineageNodes.push({
            ...sourceNode,
            depth,
            direction: 'upstream',
          });
          await traverseUpstream(sourceNode.id, depth + 1);
        }
      }
    }

    // BFS traversal for downstream (outgoing edges)
    async function traverseDownstream(nodeId: string, depth: number) {
      if (depth > maxDepth || visitedNodes.has(`down-${nodeId}`)) return;
      visitedNodes.add(`down-${nodeId}`);

      const { data: outgoingEdges } = await supabase
        .from('kg_edges')
        .select('*')
        .eq('source_node_id', nodeId);

      for (const edge of outgoingEdges || []) {
        if (!lineageEdges.find(e => e.id === edge.id)) {
          lineageEdges.push({
            id: edge.id,
            source_node_id: edge.source_node_id,
            target_node_id: edge.target_node_id,
            relationship_type: edge.relationship_type,
            properties: edge.properties || {},
          });
        }

        const { data: targetNode } = await supabase
          .from('kg_nodes')
          .select('*')
          .eq('id', edge.target_node_id)
          .single();

        if (targetNode && !lineageNodes.find(n => n.id === targetNode.id)) {
          lineageNodes.push({
            ...targetNode,
            depth,
            direction: 'downstream',
          });
          await traverseDownstream(targetNode.id, depth + 1);
        }
      }
    }

    // Add center node
    if (centerNode) {
      lineageNodes.push({
        ...centerNode,
        depth: 0,
        direction: 'center',
      });
    }

    // Traverse both directions
    await Promise.all([
      traverseUpstream(centerNodeId, 1),
      traverseDownstream(centerNodeId, 1),
    ]);

    // Calculate blast radius if requested
    let blastRadius = null;
    if (includeBlastRadius) {
      const downstreamNodes = lineageNodes.filter(n => n.direction === 'downstream');
      blastRadius = {
        affected_count: downstreamNodes.length,
        affected_by_type: downstreamNodes.reduce((acc, node) => {
          acc[node.entity_type] = (acc[node.entity_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        critical_paths: downstreamNodes
          .filter(n => n.entity_type === 'deployment' || n.properties?.critical)
          .map(n => ({ id: n.id, label: n.label, type: n.entity_type })),
      };
    }

    // Calculate dependency analysis
    const dependencyAnalysis = {
      upstream_count: lineageNodes.filter(n => n.direction === 'upstream').length,
      downstream_count: lineageNodes.filter(n => n.direction === 'downstream').length,
      total_edges: lineageEdges.length,
      relationship_breakdown: lineageEdges.reduce((acc, edge) => {
        acc[edge.relationship_type] = (acc[edge.relationship_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      entity_type_breakdown: lineageNodes.reduce((acc, node) => {
        acc[node.entity_type] = (acc[node.entity_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return new Response(JSON.stringify({
      success: true,
      entity_id: entityId,
      entity_type: entityType,
      nodes: lineageNodes,
      edges: lineageEdges,
      blast_radius: blastRadius,
      dependency_analysis: dependencyAnalysis,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('KG Lineage error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
