import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Use Lovable AI to explain
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      throw new Error('Failed to get AI explanation');
    }

    const aiResponse = await response.json();
    const explanation = aiResponse.choices?.[0]?.message?.content || 'Unable to generate explanation';

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
