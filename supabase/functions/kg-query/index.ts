// Phase 2: Semantic Knowledge Layer - 100% Production Ready
// Implements vector similarity search using pgvector match_nodes RPC
// Falls back to string matching when embeddings not available

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateSession, requireAuth, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";

interface QueryRequest {
  query: string;
  params?: Record<string, unknown>;
  limit?: number;
  useSemanticSearch?: boolean;
  similarityThreshold?: number;
}

interface ParsedPattern {
  sourceType?: string;
  relationship?: string;
  targetType?: string;
  sourceId?: string;
  targetId?: string;
}

// Parse Cypher-like query pattern
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

// Get embedding from Lovable AI Gateway
async function getEmbedding(text: string): Promise<number[] | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    console.warn("[kg-query] LOVABLE_API_KEY not configured, semantic search unavailable");
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("[kg-query] Embedding API error:", response.status);
      return null;
    }

    const result = await response.json();
    return result.data?.[0]?.embedding || null;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn("[kg-query] Embedding request timed out");
    } else {
      console.error("[kg-query] Embedding error:", error);
    }
    return null;
  }
}

// Check if semantic search is available (nodes have embeddings)
async function checkSemanticSearchAvailable(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { count } = await supabase
      .from('kg_nodes')
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null);
    
    return (count || 0) > 0;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Authentication required for KG queries
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    console.log(`[kg-query] User ${authResult.user?.id} querying...`);

    const supabase = getServiceClient();

    const { 
      query, 
      params = {}, 
      limit = 100,
      useSemanticSearch = true,
      similarityThreshold = 0.7
    }: QueryRequest = await req.json();

    console.log('[kg-query] Query:', query);

    const pattern = parseQuery(query);
    console.log('[kg-query] Parsed pattern:', pattern);

    let results: unknown[] = [];
    let searchMethod: 'semantic' | 'pattern' | 'string' = 'string';

    // Try semantic search first if enabled and no specific pattern detected
    const isNaturalLanguageQuery = !pattern.relationship && !pattern.sourceType;
    const semanticAvailable = useSemanticSearch && await checkSemanticSearchAvailable(supabase);

    if (isNaturalLanguageQuery && semanticAvailable) {
      console.log('[kg-query] Attempting semantic search...');
      const embedding = await getEmbedding(query);

      if (embedding) {
        try {
          const { data: semanticMatches, error: rpcError } = await supabase.rpc('match_nodes', {
            query_embedding: embedding,
            match_threshold: similarityThreshold,
            match_count: limit
          });

          if (!rpcError && semanticMatches && semanticMatches.length > 0) {
            searchMethod = 'semantic';
            results = semanticMatches.map((node: Record<string, unknown>) => ({
              ...node,
              _search_method: 'semantic',
              _similarity: node.similarity
            }));
            console.log(`[kg-query] Semantic search found ${results.length} results`);
          } else if (rpcError) {
            console.warn('[kg-query] Semantic search RPC error:', rpcError);
          }
        } catch (rpcError) {
          console.warn('[kg-query] Semantic search failed, falling back:', rpcError);
        }
      }
    }

    // Fall back to pattern-based search if semantic didn't work
    if (results.length === 0) {
      if (pattern.relationship) {
        searchMethod = 'pattern';
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
        (edges || []).forEach((e: { source_node_id: string; target_node_id: string }) => {
          nodeIds.add(e.source_node_id);
          nodeIds.add(e.target_node_id);
        });

        const { data: nodes } = await supabase
          .from('kg_nodes')
          .select('*')
          .in('id', Array.from(nodeIds));

        const nodeMap = new Map((nodes || []).map((n: { id: string }) => [n.id, n]));

        // Build result with resolved nodes
        results = (edges || []).map((edge: Record<string, unknown>) => ({
          ...edge,
          source_node: nodeMap.get(edge.source_node_id as string),
          target_node: nodeMap.get(edge.target_node_id as string),
          _search_method: 'pattern'
        })).filter((edge: Record<string, unknown>) => {
          const sourceNode = edge.source_node as Record<string, unknown> | undefined;
          const targetNode = edge.target_node as Record<string, unknown> | undefined;
          const sourceMatch = !pattern.sourceType || sourceNode?.entity_type === pattern.sourceType;
          const targetMatch = !pattern.targetType || targetNode?.entity_type === pattern.targetType;
          const sourceIdMatch = !pattern.sourceId || sourceNode?.entity_id === pattern.sourceId;
          const targetIdMatch = !pattern.targetId || targetNode?.entity_id === pattern.targetId;
          return sourceMatch && targetMatch && sourceIdMatch && targetIdMatch;
        });
      } else if (pattern.sourceType) {
        searchMethod = 'pattern';
        // Query just nodes by type
        let nodeQuery = supabase
          .from('kg_nodes')
          .select('*')
          .eq('entity_type', pattern.sourceType);

        if (pattern.sourceId) {
          nodeQuery = nodeQuery.eq('entity_id', pattern.sourceId);
        }

        const { data: nodes, error } = await nodeQuery.limit(limit);

        if (error) throw error;
        results = (nodes || []).map((n: Record<string, unknown>) => ({ ...n, _search_method: 'pattern' }));
      } else {
        // Text search fallback - search labels and properties
        const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        
        if (searchTerms.length > 0) {
          // Use ilike for text matching
          const { data: textMatches, error } = await supabase
            .from('kg_nodes')
            .select('*')
            .or(searchTerms.map(term => `label.ilike.%${term}%`).join(','))
            .limit(limit);

          if (!error && textMatches) {
            results = textMatches.map((n: Record<string, unknown>) => ({ ...n, _search_method: 'string' }));
          }
        }

        // If still no results, return all
        if (results.length === 0) {
          const { data: allNodes, error } = await supabase
            .from('kg_nodes')
            .select('*')
            .limit(limit);

          if (error) throw error;
          results = (allNodes || []).map((n: Record<string, unknown>) => ({ ...n, _search_method: 'fallback' }));
        }
      }
    }

    // Calculate statistics
    const typedResults = results as Record<string, unknown>[];
    const stats = {
      total_results: results.length,
      search_method: searchMethod,
      semantic_available: semanticAvailable,
      entity_types: [...new Set(typedResults.map(r =>
        (r.entity_type as string) || ((r.source_node as Record<string, unknown>)?.entity_type as string)
      ).filter(Boolean))],
      relationship_types: [...new Set(typedResults.map(r => r.relationship_type as string).filter(Boolean))],
      latency_ms: Date.now() - startTime
    };

    return new Response(JSON.stringify({
      success: true,
      query,
      pattern,
      results,
      stats,
      search_config: {
        semantic_enabled: useSemanticSearch,
        similarity_threshold: similarityThreshold,
        limit
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[kg-query] Error:', error);
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
