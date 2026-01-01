import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateSession, requireAuth, hasAnyRole, getServiceClient, corsHeaders, errorResponse, successResponse } from "../_shared/auth-helper.ts";

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
  
  if (!policy.version) errors.push('Missing required field: version');
  if (!policy.name) errors.push('Missing required field: name');
  if (!policy.rules || !Array.isArray(policy.rules)) {
    errors.push('Missing or invalid field: rules (must be an array)');
  }
  
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
    hash: '',
  };
  
  const policyString = JSON.stringify(compiled.rules);
  compiled.hash = btoa(policyString).slice(0, 32);
  
  return JSON.stringify(compiled, null, 2);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // =====================================================
    // AUTHENTICATION: Validate user JWT via auth-helper
    // =====================================================
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    
    if (authError) {
      console.log("[compile-policy] Authentication failed");
      return authError;
    }
    
    const { user } = authResult;
    // User client respects RLS
    const supabase = authResult.supabase!;
    
    console.log(`[compile-policy] Authenticated user: ${user?.id}`);

    const { action, policyDSL, policyId } = await req.json();

    if (action === 'validate') {
      let parsed: any;
      try {
        parsed = typeof policyDSL === 'string' ? JSON.parse(policyDSL) : policyDSL;
      } catch (e) {
        return successResponse({ valid: false, errors: ['Invalid JSON syntax'] });
      }
      
      const validation = validatePolicyDSL(parsed);
      return successResponse(validation);
    }

    if (action === 'compile') {
      let parsed: PolicyDSL;
      try {
        parsed = typeof policyDSL === 'string' ? JSON.parse(policyDSL) : policyDSL;
      } catch (e) {
        return errorResponse('Invalid JSON syntax', 400);
      }
      
      const validation = validatePolicyDSL(parsed);
      if (!validation.valid) {
        return errorResponse('Policy validation failed', 400, { errors: validation.errors });
      }
      
      const compiled = compilePolicyToExecutable(parsed);
      
      return successResponse({ 
        success: true,
        compiled: JSON.parse(compiled),
      });
    }

    if (action === 'save') {
      let parsed: PolicyDSL;
      try {
        parsed = typeof policyDSL === 'string' ? JSON.parse(policyDSL) : policyDSL;
      } catch (e) {
        return errorResponse('Invalid JSON syntax', 400);
      }
      
      const validation = validatePolicyDSL(parsed);
      if (!validation.valid) {
        return errorResponse('Policy validation failed', 400, { errors: validation.errors });
      }
      
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
      
      return successResponse({ 
        success: true,
        policy: data,
      });
    }

    if (action === 'activate') {
      // Only admin/analyst can activate policies
      if (!hasAnyRole(user!, ['admin', 'analyst'])) {
        return errorResponse('Only admins and analysts can activate policies', 403);
      }
      
      const { data, error } = await supabase
        .from('policy_packs')
        .update({ status: 'active' })
        .eq('id', policyId)
        .select()
        .single();
      
      if (error) throw error;
      
      return successResponse({ 
        success: true,
        policy: data,
      });
    }

    return errorResponse('Invalid action', 400);
  } catch (error: any) {
    console.error('Error in compile-policy:', error);
    return errorResponse(error.message, 500);
  }
});
