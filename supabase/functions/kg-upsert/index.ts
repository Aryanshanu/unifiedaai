import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateSession, requireAuth, hasAnyRole, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";

interface KGNode {
  entity_type: string;
  entity_id: string;
  label: string;
  properties?: Record<string, any>;
  source?: string;
  status?: string;
  metadata?: Record<string, any>;
}

interface KGEdge {
  source_node_id?: string;
  source_entity_type?: string;
  source_entity_id?: string;
  target_node_id?: string;
  target_entity_type?: string;
  target_entity_id?: string;
  relationship_type: string;
  properties?: Record<string, any>;
  evidence?: Record<string, any>;
  weight?: number;
}

interface UpsertRequest {
  nodes?: KGNode[];
  edges?: KGEdge[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication required for KG upsert
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    const { user } = authResult;
    
    // Only admins and analysts can upsert to knowledge graph
    if (!hasAnyRole(user!, ['admin', 'analyst'])) {
      return new Response(
        JSON.stringify({ error: "Admin or analyst role required for KG upsert" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[kg-upsert] User ${user?.id} upserting...`);
    
    const supabase = getServiceClient();

    const { nodes = [], edges = [] }: UpsertRequest = await req.json();
    
    console.log(`KG Upsert: Processing ${nodes.length} nodes and ${edges.length} edges`);

    const results = {
      nodes_created: 0,
      nodes_updated: 0,
      edges_created: 0,
      edges_updated: 0,
      errors: [] as string[],
    };

    // Process nodes
    for (const node of nodes) {
      try {
        // Check if node exists
        const { data: existing } = await supabase
          .from('kg_nodes')
          .select('id, version')
          .eq('entity_type', node.entity_type)
          .eq('entity_id', node.entity_id)
          .single();

        if (existing) {
          // Update existing node with incremented version
          const { error } = await supabase
            .from('kg_nodes')
            .update({
              label: node.label,
              properties: node.properties || {},
              source: node.source || 'api',
              status: node.status || 'active',
              metadata: node.metadata || {},
              version: existing.version + 1,
            })
            .eq('id', existing.id);

          if (error) throw error;
          results.nodes_updated++;
        } else {
          // Insert new node
          const { error } = await supabase
            .from('kg_nodes')
            .insert({
              entity_type: node.entity_type,
              entity_id: node.entity_id,
              label: node.label,
              properties: node.properties || {},
              source: node.source || 'api',
              status: node.status || 'active',
              metadata: node.metadata || {},
            });

          if (error) throw error;
          results.nodes_created++;
        }
      } catch (err: unknown) {
        const error = err as Error;
        results.errors.push(`Node ${node.entity_type}:${node.entity_id}: ${error.message}`);
      }
    }

    // Process edges
    for (const edge of edges) {
      try {
        let sourceNodeId = edge.source_node_id;
        let targetNodeId = edge.target_node_id;

        // Resolve source node if using entity reference
        if (!sourceNodeId && edge.source_entity_type && edge.source_entity_id) {
          const { data: sourceNode } = await supabase
            .from('kg_nodes')
            .select('id')
            .eq('entity_type', edge.source_entity_type)
            .eq('entity_id', edge.source_entity_id)
            .single();
          
          if (sourceNode) sourceNodeId = sourceNode.id;
        }

        // Resolve target node if using entity reference
        if (!targetNodeId && edge.target_entity_type && edge.target_entity_id) {
          const { data: targetNode } = await supabase
            .from('kg_nodes')
            .select('id')
            .eq('entity_type', edge.target_entity_type)
            .eq('entity_id', edge.target_entity_id)
            .single();
          
          if (targetNode) targetNodeId = targetNode.id;
        }

        if (!sourceNodeId || !targetNodeId) {
          results.errors.push(`Edge: Could not resolve source or target node`);
          continue;
        }

        // Check if edge exists
        const { data: existing } = await supabase
          .from('kg_edges')
          .select('id')
          .eq('source_node_id', sourceNodeId)
          .eq('target_node_id', targetNodeId)
          .eq('relationship_type', edge.relationship_type)
          .single();

        if (existing) {
          // Update existing edge
          const { error } = await supabase
            .from('kg_edges')
            .update({
              properties: edge.properties || {},
              evidence: edge.evidence || {},
              weight: edge.weight || 1.0,
            })
            .eq('id', existing.id);

          if (error) throw error;
          results.edges_updated++;
        } else {
          // Insert new edge
          const { error } = await supabase
            .from('kg_edges')
            .insert({
              source_node_id: sourceNodeId,
              target_node_id: targetNodeId,
              relationship_type: edge.relationship_type,
              properties: edge.properties || {},
              evidence: edge.evidence || {},
              weight: edge.weight || 1.0,
            });

          if (error) throw error;
          results.edges_created++;
        }
      } catch (err: unknown) {
        const error = err as Error;
        results.errors.push(`Edge: ${error.message}`);
      }
    }

    console.log('KG Upsert results:', results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('KG Upsert error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
