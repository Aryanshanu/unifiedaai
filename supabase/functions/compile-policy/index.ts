import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Policy DSL Schema
interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  condition: {
    engine: 'toxicity' | 'fairness' | 'privacy' | 'hallucination' | 'all';
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
    threshold: number;
  };
  action: 'block' | 'warn' | 'log' | 'escalate';
  priority: number;
  enabled: boolean;
}

interface PolicyDSL {
  version: string;
  name: string;
  description?: string;
  rules: PolicyRule[];
  exemptions?: {
    users?: string[];
    systems?: string[];
    environments?: string[];
  };
  metadata?: Record<string, any>;
}

function validatePolicyDSL(policy: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!policy.version) errors.push('Missing required field: version');
  if (!policy.name) errors.push('Missing required field: name');
  if (!policy.rules || !Array.isArray(policy.rules)) {
    errors.push('Missing or invalid field: rules (must be an array)');
  }
  
  // Validate each rule
  if (policy.rules && Array.isArray(policy.rules)) {
    policy.rules.forEach((rule: any, index: number) => {
      if (!rule.id) errors.push(`Rule ${index}: missing id`);
      if (!rule.name) errors.push(`Rule ${index}: missing name`);
      
      if (!rule.condition) {
        errors.push(`Rule ${index}: missing condition`);
      } else {
        const validEngines = ['toxicity', 'fairness', 'privacy', 'hallucination', 'all'];
        if (!validEngines.includes(rule.condition.engine)) {
          errors.push(`Rule ${index}: invalid engine (must be one of ${validEngines.join(', ')})`);
        }
        
        const validOperators = ['gt', 'lt', 'gte', 'lte', 'eq'];
        if (!validOperators.includes(rule.condition.operator)) {
          errors.push(`Rule ${index}: invalid operator (must be one of ${validOperators.join(', ')})`);
        }
        
        if (typeof rule.condition.threshold !== 'number' || rule.condition.threshold < 0 || rule.condition.threshold > 100) {
          errors.push(`Rule ${index}: threshold must be a number between 0 and 100`);
        }
      }
      
      const validActions = ['block', 'warn', 'log', 'escalate'];
      if (!validActions.includes(rule.action)) {
        errors.push(`Rule ${index}: invalid action (must be one of ${validActions.join(', ')})`);
      }
      
      if (typeof rule.priority !== 'number') {
        errors.push(`Rule ${index}: priority must be a number`);
      }
    });
  }
  
  return { valid: errors.length === 0, errors };
}

function compilePolicyToExecutable(policy: PolicyDSL): string {
  // Generate executable policy logic
  const compiled = {
    id: crypto.randomUUID(),
    version: policy.version,
    name: policy.name,
    compiled_at: new Date().toISOString(),
    rules: policy.rules
      .filter(r => r.enabled !== false)
      .sort((a, b) => b.priority - a.priority)
      .map(rule => ({
        ...rule,
        evaluate: `(scores) => scores.${rule.condition.engine} ${
          rule.condition.operator === 'gt' ? '>' :
          rule.condition.operator === 'lt' ? '<' :
          rule.condition.operator === 'gte' ? '>=' :
          rule.condition.operator === 'lte' ? '<=' : '==='
        } ${rule.condition.threshold}`,
      })),
    exemptions: policy.exemptions || {},
    hash: '', // Will be computed
  };
  
  // Compute policy hash for integrity
  const policyString = JSON.stringify(compiled.rules);
  compiled.hash = btoa(policyString).slice(0, 32);
  
  return JSON.stringify(compiled, null, 2);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { action, policyDSL, policyId } = await req.json();

    if (action === 'validate') {
      // Parse and validate DSL
      let parsed: any;
      try {
        parsed = typeof policyDSL === 'string' ? JSON.parse(policyDSL) : policyDSL;
      } catch (e) {
        return new Response(JSON.stringify({ 
          valid: false, 
          errors: ['Invalid JSON syntax'] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const validation = validatePolicyDSL(parsed);
      
      return new Response(JSON.stringify(validation), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'compile') {
      // Parse, validate, and compile
      let parsed: PolicyDSL;
      try {
        parsed = typeof policyDSL === 'string' ? JSON.parse(policyDSL) : policyDSL;
      } catch (e) {
        return new Response(JSON.stringify({ 
          error: 'Invalid JSON syntax',
          compiled: null,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const validation = validatePolicyDSL(parsed);
      if (!validation.valid) {
        return new Response(JSON.stringify({ 
          error: 'Policy validation failed',
          errors: validation.errors,
          compiled: null,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const compiled = compilePolicyToExecutable(parsed);
      
      return new Response(JSON.stringify({ 
        success: true,
        compiled: JSON.parse(compiled),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'save') {
      // Save compiled policy to database
      let parsed: PolicyDSL;
      try {
        parsed = typeof policyDSL === 'string' ? JSON.parse(policyDSL) : policyDSL;
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON syntax' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const validation = validatePolicyDSL(parsed);
      if (!validation.valid) {
        return new Response(JSON.stringify({ 
          error: 'Policy validation failed',
          errors: validation.errors,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('policy_packs')
        .insert({
          name: parsed.name,
          description: parsed.description,
          version: parsed.version,
          rules: parsed.rules,
          status: 'draft',
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ 
        success: true,
        policy: data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'activate') {
      // Activate a policy
      const { data, error } = await supabase
        .from('policy_packs')
        .update({ status: 'active' })
        .eq('id', policyId)
        .select()
        .single();
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ 
        success: true,
        policy: data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in compile-policy:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
