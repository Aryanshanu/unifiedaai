import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LintRequest {
  policy_id?: string;
  policy_content?: Record<string, unknown>;
  validate_all?: boolean;
}

interface LintError {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
  suggestion?: string;
}

interface LintResult {
  policy_id: string | null;
  valid: boolean;
  errors: LintError[];
  warnings: LintError[];
  info: LintError[];
}

// Validation rules
const THRESHOLD_RANGES: Record<string, { min: number; max: number }> = {
  fairness_threshold: { min: 0.01, max: 0.5 },
  accuracy_threshold: { min: 0.5, max: 1.0 },
  completeness_threshold: { min: 0.7, max: 1.0 },
  toxicity_threshold: { min: 0.0, max: 0.3 },
  privacy_threshold: { min: 0.8, max: 1.0 },
};

const REQUIRED_FIELDS = ['name', 'version', 'rules'];

const VALID_ACTIONS = ['block', 'warn', 'log', 'escalate', 'notify'];

function lintPolicy(content: Record<string, unknown>): LintError[] {
  const errors: LintError[] = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in content)) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        message: `Required field "${field}" is missing`,
        path: field,
        suggestion: `Add the "${field}" field to your policy`,
      });
    }
  }

  // Validate version format
  if (content.version && typeof content.version === 'string') {
    const versionRegex = /^\d+\.\d+(\.\d+)?$/;
    if (!versionRegex.test(content.version)) {
      errors.push({
        code: 'INVALID_VERSION_FORMAT',
        severity: 'error',
        message: `Version "${content.version}" is not in valid semver format`,
        path: 'version',
        suggestion: 'Use format like "1.0" or "1.0.0"',
      });
    }
  }

  // Validate rules array
  if (content.rules && Array.isArray(content.rules)) {
    for (let i = 0; i < content.rules.length; i++) {
      const rule = content.rules[i] as Record<string, unknown>;
      
      // Check rule has condition and action
      if (!rule.condition) {
        errors.push({
          code: 'RULE_MISSING_CONDITION',
          severity: 'error',
          message: `Rule ${i} is missing a condition`,
          path: `rules[${i}].condition`,
        });
      }

      if (!rule.action) {
        errors.push({
          code: 'RULE_MISSING_ACTION',
          severity: 'error',
          message: `Rule ${i} is missing an action`,
          path: `rules[${i}].action`,
        });
      } else if (typeof rule.action === 'string' && !VALID_ACTIONS.includes(rule.action)) {
        errors.push({
          code: 'INVALID_ACTION',
          severity: 'error',
          message: `Action "${rule.action}" in rule ${i} is not valid`,
          path: `rules[${i}].action`,
          suggestion: `Valid actions: ${VALID_ACTIONS.join(', ')}`,
        });
      }

      // Check threshold ranges
      if (rule.threshold !== undefined && typeof rule.threshold === 'number') {
        const thresholdType = rule.threshold_type as string;
        if (thresholdType && THRESHOLD_RANGES[thresholdType]) {
          const range = THRESHOLD_RANGES[thresholdType];
          if (rule.threshold < range.min || rule.threshold > range.max) {
            errors.push({
              code: 'THRESHOLD_OUT_OF_RANGE',
              severity: 'warning',
              message: `Threshold ${rule.threshold} for ${thresholdType} is outside recommended range [${range.min}, ${range.max}]`,
              path: `rules[${i}].threshold`,
              suggestion: `Consider using a value between ${range.min} and ${range.max}`,
            });
          }
        }
      }

      // Check for overly permissive rules
      if (rule.condition === 'true' || rule.condition === '*') {
        errors.push({
          code: 'OVERLY_PERMISSIVE_RULE',
          severity: 'warning',
          message: `Rule ${i} has an overly permissive condition that matches everything`,
          path: `rules[${i}].condition`,
          suggestion: 'Consider adding specific conditions to limit scope',
        });
      }
    }

    // Check for conflicting rules
    const actionCounts: Record<string, number> = {};
    for (const rule of content.rules as Array<{ action?: string }>) {
      if (rule.action) {
        actionCounts[rule.action] = (actionCounts[rule.action] || 0) + 1;
      }
    }

    if (actionCounts.block && actionCounts.log && actionCounts.block > actionCounts.log) {
      errors.push({
        code: 'POTENTIAL_OVER_BLOCKING',
        severity: 'warning',
        message: 'Policy has more block actions than log actions, which may be overly restrictive',
        suggestion: 'Consider balancing block/warn/log actions for gradual enforcement',
      });
    }
  }

  // Check for regulatory alignment hints
  if (content.regulations && Array.isArray(content.regulations)) {
    const validRegulations = ['EU_AI_ACT', 'GDPR', 'CCPA', 'HIPAA', 'NIST_AI_RMF'];
    for (const reg of content.regulations) {
      if (!validRegulations.includes(reg as string)) {
        errors.push({
          code: 'UNKNOWN_REGULATION',
          severity: 'info',
          message: `Regulation "${reg}" is not in the known list`,
          path: 'regulations',
          suggestion: `Known regulations: ${validRegulations.join(', ')}`,
        });
      }
    }
  }

  // Check for empty policy
  if (!content.rules || (Array.isArray(content.rules) && content.rules.length === 0)) {
    errors.push({
      code: 'EMPTY_POLICY',
      severity: 'warning',
      message: 'Policy has no rules defined',
      suggestion: 'Add at least one rule to make the policy effective',
    });
  }

  return errors;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const body: LintRequest = await req.json().catch(() => ({}));
    const results: LintResult[] = [];

    if (body.policy_content) {
      // Lint inline policy content
      const lintErrors = lintPolicy(body.policy_content);
      
      results.push({
        policy_id: body.policy_id || null,
        valid: !lintErrors.some(e => e.severity === 'error'),
        errors: lintErrors.filter(e => e.severity === 'error'),
        warnings: lintErrors.filter(e => e.severity === 'warning'),
        info: lintErrors.filter(e => e.severity === 'info'),
      });

      // Store validation result if policy_id provided
      if (body.policy_id) {
        // Get current version
        const { data: versions } = await supabase
          .from("policy_versions")
          .select("version")
          .eq("policy_id", body.policy_id)
          .order("version", { ascending: false })
          .limit(1);

        const nextVersion = (versions?.[0]?.version || 0) + 1;

        await supabase.from("policy_versions").insert({
          policy_id: body.policy_id,
          version: nextVersion,
          content: body.policy_content,
          validated: !lintErrors.some(e => e.severity === 'error'),
          validation_errors: lintErrors.length > 0 ? lintErrors : null,
        });
      }
    }

    if (body.validate_all) {
      // Fetch and validate all policies
      const { data: policies } = await supabase
        .from("policies")
        .select("id, content")
        .limit(100);

      for (const policy of policies || []) {
        const content = policy.content as Record<string, unknown>;
        const lintErrors = lintPolicy(content);
        
        results.push({
          policy_id: policy.id,
          valid: !lintErrors.some(e => e.severity === 'error'),
          errors: lintErrors.filter(e => e.severity === 'error'),
          warnings: lintErrors.filter(e => e.severity === 'warning'),
          info: lintErrors.filter(e => e.severity === 'info'),
        });
      }
    }

    // Summary statistics
    const summary = {
      total_validated: results.length,
      valid_count: results.filter(r => r.valid).length,
      invalid_count: results.filter(r => !r.valid).length,
      total_errors: results.reduce((sum, r) => sum + r.errors.length, 0),
      total_warnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    };

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Policy lint error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Policy validation failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
