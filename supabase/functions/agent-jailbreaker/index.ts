 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";
 import { 
   getSystemConfig, 
   executeAgainstTarget, 
   judgeResponse 
 } from "../_shared/execute-target-system.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 interface ExecuteResult {
   attackId: string;
   attackName: string;
   attackCategory: string;
   blocked: boolean;
   confidence: number;
   response: string;
   targetResponse: string;
   reasoning: string;
   riskScore: number;
   severity: string;
   latencyMs: number;
   findingId?: string;
 }
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   const correlationId = `jb-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
   console.log(`[agent-jailbreaker] ${correlationId} Starting...`);
 
   try {
     // Use anon key for RLS-protected queries
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_ANON_KEY')!,
       { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
     );
 
     // Use service role for privileged operations (persisting findings)
     const supabaseAdmin = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     );
 
     const { action, systemId, attackId, category } = await req.json();
 
     // Validate required fields
     if (!systemId) {
       return new Response(
         JSON.stringify({ error: 'systemId is required', code: 'MISSING_SYSTEM_ID' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Fetch system config (with credentials, server-side only)
     const systemConfig = await getSystemConfig(systemId);
     if (!systemConfig) {
       return new Response(
         JSON.stringify({ error: 'System not found or not configured', code: 'SYSTEM_NOT_FOUND' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log(`[agent-jailbreaker] ${correlationId} Target system: ${systemConfig.name} (${systemConfig.provider})`);
 
     if (action === 'execute') {
       // Execute single attack against the real target
       const { data: attack, error: attackError } = await supabase
         .from('attack_library')
         .select('*')
         .eq('id', attackId)
         .single();
 
       if (attackError || !attack) {
         return new Response(
           JSON.stringify({ error: 'Attack not found', code: 'ATTACK_NOT_FOUND' }),
           { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
 
       console.log(`[agent-jailbreaker] ${correlationId} Executing attack: ${attack.name}`);
 
       // Step 1: Execute the attack payload against the TARGET system
       const targetResult = await executeAgainstTarget(
         systemConfig,
         attack.attack_payload
       );
 
       console.log(`[agent-jailbreaker] ${correlationId} Target responded in ${targetResult.latencyMs}ms, success: ${targetResult.success}`);
 
       // If target call failed, return error with details
       if (!targetResult.success) {
         return new Response(
           JSON.stringify({
             error: `Target system error: ${targetResult.error}`,
             code: targetResult.errorCode || 'TARGET_ERROR',
             blocked: null,
             response: targetResult.response,
             targetError: true,
           }),
           { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
 
       // Step 2: Judge the target's response using Lovable AI
       const judgeResult = await judgeResponse(
         attack.name,
         attack.attack_payload,
         targetResult.response
       );
 
       console.log(`[agent-jailbreaker] ${correlationId} Judge verdict: blocked=${judgeResult.blocked}, confidence=${judgeResult.confidence}`);
 
       // Step 3: Persist evidence to database
       let findingId: string | null = null;
       if (!judgeResult.blocked) {
         // Vulnerability found - create security finding
         const { data: finding, error: findingError } = await supabaseAdmin
           .from('security_findings')
           .insert({
             system_id: systemId,
             vulnerability_id: attack.id,
             title: `Jailbreak: ${attack.name}`,
             description: `Attack category: ${attack.category}. ${judgeResult.reasoning}`,
             severity: judgeResult.severity,
             status: 'open',
             mitigation: attack.description || 'Review and strengthen input validation and safety filters.',
             exploitability_score: Math.round(judgeResult.riskScore * 10),
             business_impact_score: Math.round(judgeResult.riskScore * 8),
             fractal_risk_index: judgeResult.riskScore,
             owasp_category: attack.owasp_category || 'LLM01',
             evidence: {
               correlation_id: correlationId,
               attack_name: attack.name,
               attack_category: attack.category,
               attack_payload_preview: attack.attack_payload.substring(0, 200),
               target_response_preview: targetResult.response.substring(0, 500),
               judge_verdict: judgeResult,
               target_latency_ms: targetResult.latencyMs,
               target_provider: targetResult.provider,
               target_model: targetResult.model,
               timestamp: new Date().toISOString(),
             },
             framework_mappings: { owasp: attack.owasp_category || 'LLM01' },
           })
           .select('id')
           .single();
 
         if (findingError) {
           console.error(`[agent-jailbreaker] ${correlationId} Failed to persist finding:`, findingError);
         } else {
           findingId = finding?.id;
           console.log(`[agent-jailbreaker] ${correlationId} Finding persisted: ${findingId}`);
         }
       }
 
       // Step 4: Update attack success rate based on real test
       const newSuccessRate = judgeResult.blocked
         ? Math.max(0, (attack.success_rate || 0.5) - 0.05)
         : Math.min(1, (attack.success_rate || 0.5) + 0.1);
 
       const { error: updateError } = await supabaseAdmin
         .from('attack_library')
         .update({ 
           success_rate: newSuccessRate, 
           updated_at: new Date().toISOString() 
         })
         .eq('id', attackId);
 
       if (updateError) {
         console.error(`[agent-jailbreaker] ${correlationId} Failed to update attack:`, updateError);
       }
 
       const result: ExecuteResult = {
         attackId: attack.id,
         attackName: attack.name,
         attackCategory: attack.category,
         blocked: judgeResult.blocked,
         confidence: judgeResult.confidence,
         response: targetResult.response.substring(0, 500),
         targetResponse: targetResult.response,
         reasoning: judgeResult.reasoning,
         riskScore: judgeResult.riskScore,
         severity: judgeResult.severity,
         latencyMs: targetResult.latencyMs,
         findingId: findingId || undefined,
       };
 
       return new Response(
         JSON.stringify(result),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (action === 'automated') {
       // Run multiple attacks
       console.log(`[agent-jailbreaker] ${correlationId} Running automated attack suite`);
 
       let query = supabase
         .from('attack_library')
         .select('*')
         .eq('is_active', true)
         .limit(20); // Limit to prevent timeout
 
       if (category && category !== 'all') {
         query = query.eq('category', category);
       }
 
       const { data: attacks, error: attacksError } = await query;
 
       if (attacksError) {
         throw attacksError;
       }
 
       const results: ExecuteResult[] = [];
       let successCount = 0;
       let blockedCount = 0;
 
       for (const attack of attacks || []) {
         try {
           console.log(`[agent-jailbreaker] ${correlationId} Testing: ${attack.name}`);
 
           // Execute against target
           const targetResult = await executeAgainstTarget(
             systemConfig,
             attack.attack_payload
           );
 
           if (!targetResult.success) {
             console.warn(`[agent-jailbreaker] ${correlationId} Target failed for ${attack.name}: ${targetResult.error}`);
             continue;
           }
 
           // Judge response
           const judgeResult = await judgeResponse(
             attack.name,
             attack.attack_payload,
             targetResult.response
           );
 
           if (judgeResult.blocked) {
             blockedCount++;
           } else {
             successCount++;
             
             // Persist finding for successful attacks
             await supabaseAdmin
               .from('security_findings')
               .insert({
                 system_id: systemId,
                 vulnerability_id: attack.id,
                 title: `Jailbreak: ${attack.name}`,
                 description: `Attack category: ${attack.category}. ${judgeResult.reasoning}`,
                 severity: judgeResult.severity,
                 status: 'open',
                 mitigation: attack.description || 'Strengthen safety filters.',
                 exploitability_score: Math.round(judgeResult.riskScore * 10),
                 fractal_risk_index: judgeResult.riskScore,
                 owasp_category: attack.owasp_category || 'LLM01',
                 evidence: {
                   correlation_id: correlationId,
                   attack_name: attack.name,
                   target_response_preview: targetResult.response.substring(0, 300),
                   judge_verdict: judgeResult,
                 },
               });
           }
 
           results.push({
             attackId: attack.id,
             attackName: attack.name,
             attackCategory: attack.category,
             blocked: judgeResult.blocked,
             confidence: judgeResult.confidence,
             response: targetResult.response.substring(0, 200),
             targetResponse: targetResult.response,
             reasoning: judgeResult.reasoning,
             riskScore: judgeResult.riskScore,
             severity: judgeResult.severity,
             latencyMs: targetResult.latencyMs,
           });
 
         } catch (error) {
           console.error(`[agent-jailbreaker] ${correlationId} Error testing ${attack.name}:`, error);
         }
       }
 
       console.log(`[agent-jailbreaker] ${correlationId} Completed: ${results.length} tests, ${blockedCount} blocked, ${successCount} succeeded`);
 
       return new Response(
         JSON.stringify({
           correlationId,
           total: results.length,
           blocked: blockedCount,
           succeeded: successCount,
           results,
         }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     return new Response(
       JSON.stringify({ error: 'Invalid action. Use "execute" or "automated"', code: 'INVALID_ACTION' }),
       { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error(`[agent-jailbreaker] ${correlationId} Fatal error:`, error);
     return new Response(
       JSON.stringify({ 
         error: error instanceof Error ? error.message : 'Internal server error',
         code: 'INTERNAL_ERROR',
         correlationId,
       }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });
