import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateSession, requireAuth, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";
import { callClaude, CLAUDE_DEFAULT, ClaudeError } from "../_shared/claude.ts";

interface ExplainRequest {
  question: string;
  entity_id?: string;
  entity_type?: string;
  context?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication required for KG explanations
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    console.log(`[kg-explain] User ${authResult.user?.id} requesting explanation...`);

    const supabase = getServiceClient();

    const { question, entity_id, entity_type, context = {} }: ExplainRequest = await req.json();

    console.log('KG Explain:', question);

    // Gather relevant graph context
    let graphContext: any = { nodes: [], edges: [], stats: {} };

    if (entity_id) {
      // Get lineage for specific entity
      const { data: node } = await supabase
        .from('kg_nodes')
        .select('*')
        .or(`id.eq.${entity_id},entity_id.eq.${entity_id}`)
        .single();

      if (node) {
        // Get connected nodes and edges
        const [incomingRes, outgoingRes] = await Promise.all([
          supabase
            .from('kg_edges')
            .select('*')
            .eq('target_node_id', node.id),
          supabase
            .from('kg_edges')
            .select('*')
            .eq('source_node_id', node.id),
        ]);

        // Get all connected node IDs
        const connectedNodeIds = new Set<string>();
        (incomingRes.data || []).forEach(e => connectedNodeIds.add(e.source_node_id));
        (outgoingRes.data || []).forEach(e => connectedNodeIds.add(e.target_node_id));

        const { data: connectedNodes } = await supabase
          .from('kg_nodes')
          .select('*')
          .in('id', Array.from(connectedNodeIds));

        graphContext = {
          center_node: node,
          connected_nodes: connectedNodes || [],
          incoming_edges: incomingRes.data || [],
          outgoing_edges: outgoingRes.data || [],
        };
      }
    } else {
      // Get general graph stats
      const [nodesRes, edgesRes] = await Promise.all([
        supabase.from('kg_nodes').select('entity_type, status'),
        supabase.from('kg_edges').select('relationship_type'),
      ]);

      const typeCounts = (nodesRes.data || []).reduce((acc: Record<string, number>, n: any) => {
        acc[n.entity_type] = (acc[n.entity_type] || 0) + 1;
        return acc;
      }, {});

      const relationshipCounts = (edgesRes.data || []).reduce((acc: Record<string, number>, e: any) => {
        acc[e.relationship_type] = (acc[e.relationship_type] || 0) + 1;
        return acc;
      }, {});

      graphContext = {
        total_nodes: nodesRes.data?.length || 0,
        total_edges: edgesRes.data?.length || 0,
        entity_types: typeCounts,
        relationship_types: relationshipCounts,
      };
    }

    // Check for specific compliance question
    const isComplianceQuestion = question.toLowerCase().includes('non-compliant') ||
                                  question.toLowerCase().includes('compliance') ||
                                  question.toLowerCase().includes('violat');

    let additionalContext = '';
    if (isComplianceQuestion && entity_id) {
      // Fetch control assessments and violations
      const [controlsRes, violationsRes, riskRes] = await Promise.all([
        supabase.from('control_assessments').select('*').limit(10),
        supabase.from('policy_violations').select('*').limit(10),
        supabase.from('risk_assessments').select('*').eq('system_id', entity_id).limit(5),
      ]);

      additionalContext = `
Control Assessments: ${JSON.stringify(controlsRes.data || [])}
Policy Violations: ${JSON.stringify(violationsRes.data || [])}
Risk Assessments: ${JSON.stringify(riskRes.data || [])}
      `;
    }

    // Build system prompt
    const systemPrompt = `You are an AI expert in analyzing knowledge graphs for AI governance and compliance.
You have access to the following graph context and should use it to answer questions accurately.

Graph Context:
${JSON.stringify(graphContext, null, 2)}

${additionalContext}

Additional Context:
${JSON.stringify(context, null, 2)}

Instructions:
1. Answer questions based ONLY on the provided graph data
2. Cite specific nodes, edges, and relationships as evidence
3. For compliance questions, trace the path from model to controls/violations
4. Provide actionable recommendations when appropriate
5. Be concise but thorough`;

    // Call Claude
    const explanation = await callClaude(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      { model: CLAUDE_DEFAULT, maxTokens: 2048 }
    );

    // Extract key findings from the explanation
    const findings = {
      explanation,
      graph_context: graphContext,
      evidence_nodes: graphContext.center_node ? [graphContext.center_node] : [],
      evidence_edges: [
        ...(graphContext.incoming_edges || []).slice(0, 5),
        ...(graphContext.outgoing_edges || []).slice(0, 5),
      ],
      recommendations: [] as string[],
    };

    // Parse recommendations from explanation
    const recMatch = explanation.match(/recommend(?:ation)?s?:?\s*\n?((?:[-•*]\s*.+\n?)+)/i);
    if (recMatch) {
      findings.recommendations = recMatch[1]
        .split(/[-•*]\s+/)
        .filter(Boolean)
        .map((r: string) => r.trim());
    }

    return new Response(JSON.stringify({
      success: true,
      question,
      findings,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('KG Explain error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
