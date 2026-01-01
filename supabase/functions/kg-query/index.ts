import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateSession, requireAuth, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";

interface QueryRequest {
  query: string;
  params?: Record<string, any>;
  limit?: number;
}

interface ParsedPattern {
  sourceType?: string;
  relationship?: string;
  targetType?: string;
  sourceId?: string;
  targetId?: string;
}

function parseQuery(query: string): ParsedPattern {
  const pattern = /\((\w+)(?::([^)]+))?\)(?:-\[(\w+)\]->)?(?:\((\w+)(?::([^)]+))?\))?/;
  const match = query.match(pattern);
  
  if (!match) return {};
  
  return {
    sourceType: match[1]?.toLowerCase(),
    sourceId: match[2],
    relationship: match[3],
    targetType: match[4]?.toLowerCase(),
    targetId: match[5],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication required for KG queries
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    console.log(`[kg-query] User ${authResult.user?.id} querying...`);
    
    // Use user's client for RLS, or service client for full access if admin
    const supabase = getServiceClient();

    const { query, params = {}, limit = 100 }: QueryRequest = await req.json();
    
    console.log('KG Query:', query);

    const pattern = parseQuery(query);
    console.log('Parsed pattern:', pattern);

    let results: any[] = [];

    if (pattern.relationship) {
      // Query with relationship traversal
      const { data: edges, error } = await supabase
        .from('kg_edges')
        .select(`
          id,
          relationship_type,
          properties,
          evidence,
          weight,
          source_node_id,
          target_node_id
        `)
        .eq('relationship_type', pattern.relationship)
        .limit(limit);
      
      if (error) throw error;

      // Fetch node details for each edge
      const nodeIds = new Set<string>();
      (edges || []).forEach(e => {
        nodeIds.add(e.source_node_id);
        nodeIds.add(e.target_node_id);
      });

      const { data: nodes } = await supabase
        .from('kg_nodes')
        .select('*')
        .in('id', Array.from(nodeIds));

      const nodeMap = new Map((nodes || []).map(n => [n.id, n]));

      // Build result with resolved nodes
      results = (edges || []).map(edge => ({
        ...edge,
        source_node: nodeMap.get(edge.source_node_id),
        target_node: nodeMap.get(edge.target_node_id),
      })).filter(edge => {
        const sourceNode = edge.source_node;
        const targetNode = edge.target_node;
        const sourceMatch = !pattern.sourceType || sourceNode?.entity_type === pattern.sourceType;
        const targetMatch = !pattern.targetType || targetNode?.entity_type === pattern.targetType;
        const sourceIdMatch = !pattern.sourceId || sourceNode?.entity_id === pattern.sourceId;
        const targetIdMatch = !pattern.targetId || targetNode?.entity_id === pattern.targetId;
        return sourceMatch && targetMatch && sourceIdMatch && targetIdMatch;
      });
    } else if (pattern.sourceType) {
      // Query just nodes
      let nodeQuery = supabase
        .from('kg_nodes')
        .select('*')
        .eq('entity_type', pattern.sourceType);

      if (pattern.sourceId) {
        nodeQuery = nodeQuery.eq('entity_id', pattern.sourceId);
      }

      const { data: nodes, error } = await nodeQuery.limit(limit);
      
      if (error) throw error;
      results = nodes || [];
    } else {
      // Return all if no pattern matched
      const { data: allNodes, error } = await supabase
        .from('kg_nodes')
        .select('*')
        .limit(limit);
      
      if (error) throw error;
      results = allNodes || [];
    }

    // Calculate statistics
    const stats = {
      total_results: results.length,
      entity_types: [...new Set(results.map(r => 
        r.entity_type || r.source_node?.entity_type
      ).filter(Boolean))],
      relationship_types: [...new Set(results.map(r => r.relationship_type).filter(Boolean))],
    };

    return new Response(JSON.stringify({ 
      success: true, 
      query,
      pattern,
      results,
      stats,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('KG Query error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
