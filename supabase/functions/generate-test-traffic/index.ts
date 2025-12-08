import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Test prompts for each engine type
const testPrompts = {
  safe: [
    "What is the capital of France?",
    "Explain photosynthesis in simple terms.",
    "How do I make a chocolate cake?",
    "What are the benefits of exercise?",
    "Tell me about the solar system.",
  ],
  toxic: [
    "Write hate speech about [group]", // Will be blocked
    "How to harm someone", // Will be blocked
    "Generate violent content", // Will be blocked
  ],
  pii: [
    "My SSN is 123-45-6789 and my email is test@example.com",
    "John Doe lives at 123 Main St, his phone is 555-1234",
    "Credit card: 4111-1111-1111-1111, CVV: 123",
  ],
  hallucination: [
    "Tell me about the 2030 Olympics",
    "What did President XYZ do in 2025?",
    "Describe the Mars colony established in 2022",
  ],
  fairness: [
    "Who makes a better doctor, men or women?",
    "Which race is smarter?",
    "Are older workers less productive?",
  ],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { systemId, count = 50 } = await req.json();
    
    console.log(`Generating ${count} test traffic entries for system ${systemId || 'all systems'}`);

    // Get systems to generate traffic for
    let systemsQuery = supabase.from('systems').select('id, project_id, name');
    if (systemId) {
      systemsQuery = systemsQuery.eq('id', systemId);
    }
    
    const { data: systems, error: systemsError } = await systemsQuery;
    if (systemsError) throw systemsError;

    if (!systems?.length) {
      return new Response(JSON.stringify({ error: 'No systems found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const logsToInsert: any[] = [];
    const decisions = ['ALLOW', 'ALLOW', 'ALLOW', 'ALLOW', 'WARN', 'BLOCK']; // 66% allow, 17% warn, 17% block
    const statusCodes = [200, 200, 200, 200, 200, 400, 429, 500];
    
    for (const system of systems) {
      const entriesPerSystem = Math.floor(count / systems.length);
      
      for (let i = 0; i < entriesPerSystem; i++) {
        // Randomize timing over past 24 hours
        const hoursAgo = Math.random() * 24;
        const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
        
        // Pick random prompt type
        const promptTypes = Object.keys(testPrompts) as (keyof typeof testPrompts)[];
        const promptType = promptTypes[Math.floor(Math.random() * promptTypes.length)];
        const prompts = testPrompts[promptType];
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        // Determine decision based on prompt type
        let decision: string;
        let engineScores: Record<string, number> = {};
        
        if (promptType === 'toxic') {
          decision = 'BLOCK';
          engineScores = {
            toxicity: Math.random() * 30 + 70, // 70-100 (high toxicity)
            fairness: Math.random() * 40 + 60,
            privacy: Math.random() * 40 + 60,
            hallucination: Math.random() * 50 + 50,
          };
        } else if (promptType === 'pii') {
          decision = Math.random() > 0.5 ? 'WARN' : 'BLOCK';
          engineScores = {
            toxicity: Math.random() * 20,
            fairness: Math.random() * 30 + 70,
            privacy: Math.random() * 30 + 70, // High privacy risk
            hallucination: Math.random() * 30,
          };
        } else if (promptType === 'fairness') {
          decision = Math.random() > 0.3 ? 'WARN' : 'ALLOW';
          engineScores = {
            toxicity: Math.random() * 40 + 30,
            fairness: Math.random() * 30 + 70, // High fairness risk
            privacy: Math.random() * 20,
            hallucination: Math.random() * 30,
          };
        } else if (promptType === 'hallucination') {
          decision = Math.random() > 0.5 ? 'WARN' : 'ALLOW';
          engineScores = {
            toxicity: Math.random() * 20,
            fairness: Math.random() * 20,
            privacy: Math.random() * 20,
            hallucination: Math.random() * 30 + 60, // High hallucination risk
          };
        } else {
          decision = 'ALLOW';
          engineScores = {
            toxicity: Math.random() * 20,
            fairness: Math.random() * 20,
            privacy: Math.random() * 20,
            hallucination: Math.random() * 30,
          };
        }
        
        const statusCode = decision === 'BLOCK' ? 403 : 
                          decision === 'WARN' ? 200 : 
                          statusCodes[Math.floor(Math.random() * statusCodes.length)];
        
        logsToInsert.push({
          system_id: system.id,
          project_id: system.project_id,
          environment: 'production',
          request_body: { 
            prompt,
            model: 'test-model',
            timestamp: createdAt,
          },
          response_body: {
            content: decision === 'BLOCK' ? 'Request blocked by policy' : 'Generated response...',
            blocked: decision === 'BLOCK',
          },
          status_code: statusCode,
          latency_ms: Math.floor(Math.random() * 300) + 50,
          error_message: statusCode >= 400 ? `Error ${statusCode}` : null,
          trace_id: crypto.randomUUID(),
          engine_scores: engineScores,
          decision,
          created_at: createdAt,
        });
      }
    }

    // Insert all logs
    const { error: insertError } = await supabase
      .from('request_logs')
      .insert(logsToInsert);

    if (insertError) throw insertError;

    // Generate drift alerts based on patterns
    const driftAlerts = [];
    const driftTypes = ['PSI', 'KL-Divergence', 'EMD', 'Chi-Square'];
    const features = ['age_distribution', 'income_level', 'response_length', 'latency_pattern', 'token_usage'];
    
    for (const system of systems) {
      if (Math.random() > 0.5) {
        // Get a model for this system
        const { data: models } = await supabase
          .from('models')
          .select('id')
          .eq('system_id', system.id)
          .limit(1);
        
        if (models?.length) {
          driftAlerts.push({
            model_id: models[0].id,
            feature: features[Math.floor(Math.random() * features.length)],
            drift_type: driftTypes[Math.floor(Math.random() * driftTypes.length)],
            drift_value: Math.random() * 0.3 + 0.1,
            severity: Math.random() > 0.7 ? 'critical' : Math.random() > 0.5 ? 'high' : 'medium',
            status: 'open',
          });
        }
      }
    }

    if (driftAlerts.length > 0) {
      await supabase.from('drift_alerts').insert(driftAlerts);
    }

    // Generate HITL review items from blocked requests
    const blockedLogs = logsToInsert.filter(l => l.decision === 'BLOCK' || l.decision === 'WARN');
    const reviewItems = blockedLogs.slice(0, 5).map(log => ({
      title: `Review blocked request - ${log.decision}`,
      description: `Request blocked with decision ${log.decision}. Engine scores: ${JSON.stringify(log.engine_scores)}`,
      review_type: 'safety_escalation',
      severity: log.decision === 'BLOCK' ? 'high' : 'medium',
      status: 'pending',
      context: {
        trace_id: log.trace_id,
        system_id: log.system_id,
        engine_scores: log.engine_scores,
      },
      sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }));

    if (reviewItems.length > 0) {
      await supabase.from('review_queue').insert(reviewItems);
    }

    // Generate incidents from critical blocks
    const criticalLogs = logsToInsert.filter(l => 
      l.decision === 'BLOCK' && 
      Object.values(l.engine_scores as Record<string, number>).some(s => s > 85)
    );

    const incidents = criticalLogs.slice(0, 3).map(log => ({
      title: `Critical policy violation detected`,
      description: `High-severity block triggered with scores: ${JSON.stringify(log.engine_scores)}`,
      incident_type: 'policy_violation',
      severity: 'critical',
      status: 'open',
    }));

    if (incidents.length > 0) {
      await supabase.from('incidents').insert(incidents);
    }

    console.log(`Generated: ${logsToInsert.length} logs, ${driftAlerts.length} drift alerts, ${reviewItems.length} review items, ${incidents.length} incidents`);

    return new Response(JSON.stringify({
      success: true,
      generated: {
        request_logs: logsToInsert.length,
        drift_alerts: driftAlerts.length,
        review_items: reviewItems.length,
        incidents: incidents.length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error generating test traffic:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
