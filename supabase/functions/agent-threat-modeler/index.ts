import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const frameworkPrompts: Record<string, string> = {
  STRIDE: `Analyze threats using STRIDE framework:
- Spoofing: Identity impersonation
- Tampering: Data modification
- Repudiation: Action denial
- Information Disclosure: Data leaks
- Denial of Service: Availability attacks
- Elevation of Privilege: Unauthorized access`,
  
  MAESTRO: `Analyze using MAESTRO AI security layers:
- Model Layer: Model attacks
- Application Layer: App vulnerabilities
- Execution Layer: Runtime attacks
- Storage Layer: Data storage threats
- Training Layer: Training data attacks
- Reinforcement Layer: Feedback manipulation
- Orchestration Layer: Coordination attacks`,
  
  ATLAS: `Use MITRE ATLAS tactics:
- Reconnaissance: Target discovery
- Resource Development: Attack preparation
- Initial Access: Entry points
- Execution: Running attacks
- Persistence: Maintaining access
- Privilege Escalation: Gaining rights
- Defense Evasion: Avoiding detection
- Impact: Causing harm`,
  
  OWASP: `Analyze using OWASP LLM Top 10:
- LLM01: Prompt Injection
- LLM02: Insecure Output Handling
- LLM03: Training Data Poisoning
- LLM04: Model Denial of Service
- LLM05: Supply Chain Vulnerabilities
- LLM06: Sensitive Information Disclosure
- LLM07: Insecure Plugin Design
- LLM08: Excessive Agency
- LLM09: Overreliance
- LLM10: Model Theft`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { action, systemId, framework } = await req.json();

    if (!systemId) {
      return new Response(
        JSON.stringify({ error: 'systemId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch system details
    const { data: system, error: systemError } = await supabase
      .from('systems')
      .select('*')
      .eq('id', systemId)
      .single();

    if (systemError || !system) {
      return new Response(
        JSON.stringify({ error: 'System not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const selectedFramework = framework || 'STRIDE';
    const frameworkPrompt = frameworkPrompts[selectedFramework] || frameworkPrompts.STRIDE;

    if (action === 'generate') {
      // Generate threat model
      const analysisPrompt = `You are a security architect generating a threat model for an AI system.

System Information:
- Name: ${system.name}
- Description: ${system.description || 'AI/ML system'}
- Provider: ${system.provider || 'unknown'}
- Endpoint: ${system.endpoint_url || 'internal'}

${frameworkPrompt}

Generate a comprehensive threat model. Return a JSON object:
{
  "name": "Threat Model for ${system.name}",
  "description": "Comprehensive ${selectedFramework} analysis",
  "riskScore": number (0-10),
  "architectureGraph": {
    "nodes": [{"id": string, "label": string, "type": string}],
    "edges": [{"source": string, "target": string, "label": string}]
  },
  "vectors": [
    {
      "title": string,
      "description": string,
      "likelihood": number (1-5),
      "impact": number (1-5),
      "confidenceLevel": "high" | "medium" | "low",
      "atlasTactic": string | null,
      "owaspCategory": string | null,
      "maestroLayer": string | null,
      "mitigations": [string]
    }
  ]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a security architect. Always respond with valid JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const aiResult = await response.json();
      const content = aiResult.choices?.[0]?.message?.content || '';
      
      let model;
      try {
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        model = JSON.parse(cleanContent);
      } catch {
        return new Response(
          JSON.stringify({ error: 'Failed to parse threat model' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert threat model
      const { data: threatModel, error: modelError } = await supabase
        .from('threat_models')
        .insert({
          system_id: systemId,
          name: model.name,
          description: model.description,
          framework: selectedFramework,
          architecture_graph: model.architectureGraph || {},
          risk_score: model.riskScore,
        })
        .select()
        .single();

      if (modelError) {
        throw modelError;
      }

      // Insert threat vectors
      if (model.vectors && threatModel) {
        const vectors = model.vectors.map((v: any) => ({
          threat_model_id: threatModel.id,
          title: v.title,
          description: v.description,
          likelihood: v.likelihood,
          impact: v.impact,
          confidence_level: v.confidenceLevel || 'medium',
          atlas_tactic: v.atlasTactic,
          owasp_category: v.owaspCategory,
          maestro_layer: v.maestroLayer,
          mitigation_checklist: v.mitigations?.map((m: string) => ({ task: m, completed: false })) || [],
        }));

        await supabase.from('threat_vectors').insert(vectors);
      }

      return new Response(
        JSON.stringify({ success: true, modelId: threatModel?.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Threat modeler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
