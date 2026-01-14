// Phase 2: Semantic Knowledge Layer - 100% Production Ready
// Returns Cytoscape.js compatible JSON for UI visualization
// Includes blast radius analysis and dependency mapping

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateSession, requireAuth, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";

interface LineageNode {
  id: string;
  entity_type: string;
  entity_id: string;
  label: string;
  properties: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: string;
  depth: number;
  direction: 'upstream' | 'downstream' | 'center';
}

interface LineageEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  properties: Record<string, unknown>;
  weight?: number;
}

// Cytoscape.js compatible node format
interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    type: string;
    direction: string;
    depth: number;
    status?: string;
    [key: string]: unknown;
  };
  classes: string;
  position?: { x: number; y: number };
}

// Cytoscape.js compatible edge format
interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    weight?: number;
    [key: string]: unknown;
  };
  classes: string;
}

interface BlastRadiusAnalysis {
  affected_count: number;
  affected_by_type: Record<string, number>;
  critical_paths: Array<{ id: string; label: string; type: string }>;
  risk_score: number;
  max_depth: number;
}

interface DependencyAnalysis {
  upstream_count: number;
  downstream_count: number;
  total_edges: number;
  relationship_breakdown: Record<string, number>;
  entity_type_breakdown: Record<string, number>;
  circular_dependencies: string[];
  orphan_nodes: string[];
}

// Convert internal format to Cytoscape.js JSON
function toCytoscapeFormat(
  nodes: LineageNode[],
  edges: LineageEdge[],
  blastRadius: BlastRadiusAnalysis | null,
  dependencyAnalysis: DependencyAnalysis
): {
  elements: { nodes: CytoscapeNode[]; edges: CytoscapeEdge[] };
  blast_radius: BlastRadiusAnalysis | null;
  dependency_analysis: DependencyAnalysis;
  layout_hints: Record<string, unknown>;
} {
  // Calculate positions using hierarchical layout
  const nodesByDepth = new Map<number, LineageNode[]>();
  for (const node of nodes) {
    const depth = node.direction === 'upstream' ? -node.depth : 
                  node.direction === 'downstream' ? node.depth : 0;
    if (!nodesByDepth.has(depth)) {
      nodesByDepth.set(depth, []);
    }
    nodesByDepth.get(depth)!.push(node);
  }

  const cytoscapeNodes: CytoscapeNode[] = nodes.map(node => {
    const depth = node.direction === 'upstream' ? -node.depth :
                  node.direction === 'downstream' ? node.depth : 0;
    const nodesAtDepth = nodesByDepth.get(depth) || [];
    const indexAtDepth = nodesAtDepth.indexOf(node);
    
    return {
      data: {
        id: node.id,
        label: node.label || node.entity_id,
        type: node.entity_type,
        entity_id: node.entity_id,
        direction: node.direction,
        depth: node.depth,
        status: node.status || 'active',
        ...node.properties,
        ...node.metadata
      },
      classes: `${node.entity_type} ${node.direction} ${node.status || 'active'}`,
      position: {
        x: depth * 200,
        y: indexAtDepth * 100 - (nodesAtDepth.length - 1) * 50
      }
    };
  });

  const cytoscapeEdges: CytoscapeEdge[] = edges.map(edge => ({
    data: {
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      label: edge.relationship_type,
      weight: edge.weight || 1,
      ...edge.properties
    },
    classes: edge.relationship_type.toLowerCase().replace(/[^a-z0-9]/g, '_')
  }));

  return {
    elements: {
      nodes: cytoscapeNodes,
      edges: cytoscapeEdges
    },
    blast_radius: blastRadius,
    dependency_analysis: dependencyAnalysis,
    layout_hints: {
      name: 'dagre',
      rankDir: 'LR',
      nodeSep: 50,
      edgeSep: 10,
      rankSep: 150
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Authentication required for lineage queries
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    console.log(`[kg-lineage] User ${authResult.user?.id} querying lineage...`);

    const supabase = getServiceClient();

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const entityId = pathParts[pathParts.length - 1];
    const entityType = url.searchParams.get('type') || 'model';
    const maxDepth = parseInt(url.searchParams.get('depth') || '3');
    const includeBlastRadius = url.searchParams.get('blast_radius') !== 'false';
    const outputFormat = url.searchParams.get('format') || 'cytoscape';

    console.log(`[kg-lineage] Entity: ${entityType}:${entityId}, depth=${maxDepth}, format=${outputFormat}`);

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
          error: 'Node not found',
          searched: { entity_type: entityType, entity_id: entityId }
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
    const circularDependencies: string[] = [];

    // BFS traversal for upstream (incoming edges)
    async function traverseUpstream(nodeId: string, depth: number, path: string[] = []) {
      if (depth > maxDepth || visitedNodes.has(`up-${nodeId}`)) return;
      visitedNodes.add(`up-${nodeId}`);

      // Check for circular dependencies
      if (path.includes(nodeId)) {
        circularDependencies.push([...path, nodeId].join(' -> '));
        return;
      }

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
            weight: edge.weight
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
          await traverseUpstream(sourceNode.id, depth + 1, [...path, nodeId]);
        }
      }
    }

    // BFS traversal for downstream (outgoing edges)
    async function traverseDownstream(nodeId: string, depth: number, path: string[] = []) {
      if (depth > maxDepth || visitedNodes.has(`down-${nodeId}`)) return;
      visitedNodes.add(`down-${nodeId}`);

      // Check for circular dependencies
      if (path.includes(nodeId)) {
        circularDependencies.push([...path, nodeId].join(' -> '));
        return;
      }

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
            weight: edge.weight
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
          await traverseDownstream(targetNode.id, depth + 1, [...path, nodeId]);
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

    // Traverse both directions in parallel
    await Promise.all([
      traverseUpstream(centerNodeId, 1),
      traverseDownstream(centerNodeId, 1),
    ]);

    // Calculate blast radius if requested
    let blastRadius: BlastRadiusAnalysis | null = null;
    if (includeBlastRadius) {
      const downstreamNodes = lineageNodes.filter(n => n.direction === 'downstream');
      const criticalNodes = downstreamNodes.filter(n =>
        n.entity_type === 'deployment' ||
        n.entity_type === 'production' ||
        n.properties?.critical === true ||
        n.properties?.environment === 'production'
      );

      // Calculate risk score based on downstream impact
      const riskScore = Math.min(100, Math.round(
        (downstreamNodes.length * 10) +
        (criticalNodes.length * 25) +
        (circularDependencies.length * 15)
      ));

      blastRadius = {
        affected_count: downstreamNodes.length,
        affected_by_type: downstreamNodes.reduce((acc, node) => {
          acc[node.entity_type] = (acc[node.entity_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        critical_paths: criticalNodes.map(n => ({
          id: n.id,
          label: n.label,
          type: n.entity_type
        })),
        risk_score: riskScore,
        max_depth: Math.max(...downstreamNodes.map(n => n.depth), 0)
      };
    }

    // Calculate dependency analysis
    const allNodeIds = new Set(lineageNodes.map(n => n.id));
    const connectedNodeIds = new Set([
      ...lineageEdges.map(e => e.source_node_id),
      ...lineageEdges.map(e => e.target_node_id)
    ]);
    const orphanNodes = lineageNodes
      .filter(n => n.direction !== 'center' && !connectedNodeIds.has(n.id))
      .map(n => n.id);

    const dependencyAnalysis: DependencyAnalysis = {
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
      circular_dependencies: circularDependencies,
      orphan_nodes: orphanNodes
    };

    // Format output based on request
    let responseData;
    if (outputFormat === 'cytoscape') {
      responseData = {
        success: true,
        entity_id: entityId,
        entity_type: entityType,
        format: 'cytoscape',
        ...toCytoscapeFormat(lineageNodes, lineageEdges, blastRadius, dependencyAnalysis),
        latency_ms: Date.now() - startTime
      };
    } else {
      // Raw format for backward compatibility
      responseData = {
        success: true,
        entity_id: entityId,
        entity_type: entityType,
        format: 'raw',
        nodes: lineageNodes,
        edges: lineageEdges,
        blast_radius: blastRadius,
        dependency_analysis: dependencyAnalysis,
        latency_ms: Date.now() - startTime
      };
    }

    console.log(`[kg-lineage] Found ${lineageNodes.length} nodes, ${lineageEdges.length} edges in ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[kg-lineage] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fail_closed: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
