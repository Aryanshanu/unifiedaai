import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting KG Sync...');

    const stats = { 
      nodes_created: 0, 
      edges_created: 0, 
      errors: [] as string[] 
    };

    // Helper to upsert a node
    async function upsertNode(entityType: string, entityId: string, label: string, properties: any = {}) {
      const { data: existing } = await supabase
        .from('kg_nodes')
        .select('id')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .single();

      if (existing) return existing.id;

      const { data, error } = await supabase
        .from('kg_nodes')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          label,
          source: 'sync',
          status: 'active',
          properties,
        })
        .select('id')
        .single();

      if (error) {
        stats.errors.push(`Node ${entityType}:${label}: ${error.message}`);
        return null;
      }
      stats.nodes_created++;
      return data?.id;
    }

    // Helper to upsert an edge
    async function upsertEdge(sourceNodeId: string, targetNodeId: string, relationshipType: string, properties: any = {}) {
      if (!sourceNodeId || !targetNodeId) return;

      const { data: existing } = await supabase
        .from('kg_edges')
        .select('id')
        .eq('source_node_id', sourceNodeId)
        .eq('target_node_id', targetNodeId)
        .eq('relationship_type', relationshipType)
        .single();

      if (existing) return;

      const { error } = await supabase
        .from('kg_edges')
        .insert({
          source_node_id: sourceNodeId,
          target_node_id: targetNodeId,
          relationship_type: relationshipType,
          properties,
        });

      if (error) {
        stats.errors.push(`Edge ${relationshipType}: ${error.message}`);
        return;
      }
      stats.edges_created++;
    }

    // 1. Sync Projects
    console.log('Syncing projects...');
    const { data: projects } = await supabase.from('projects').select('*');
    const projectNodeIds: Record<string, string> = {};
    
    for (const project of projects || []) {
      const nodeId = await upsertNode('deployment', project.id, project.name, {
        environment: project.environment,
        criticality: project.criticality,
        data_sensitivity: project.data_sensitivity,
        business_sensitivity: project.business_sensitivity,
      });
      if (nodeId) projectNodeIds[project.id] = nodeId;
    }

    // 2. Sync Systems
    console.log('Syncing systems...');
    const { data: systems } = await supabase.from('systems').select('*');
    const systemNodeIds: Record<string, string> = {};
    
    for (const system of systems || []) {
      const nodeId = await upsertNode('deployment', system.id, system.name, {
        provider: system.provider,
        system_type: system.system_type,
        deployment_status: system.deployment_status,
        uri_score: system.uri_score,
        requires_approval: system.requires_approval,
      });
      if (nodeId) {
        systemNodeIds[system.id] = nodeId;
        // Edge: system -> deployed_to -> project
        if (system.project_id && projectNodeIds[system.project_id]) {
          await upsertEdge(nodeId, projectNodeIds[system.project_id], 'deployed_to', {
            environment: system.deployment_status,
          });
        }
      }
    }

    // 3. Sync Models
    console.log('Syncing models...');
    const { data: models } = await supabase.from('models').select('*');
    const modelNodeIds: Record<string, string> = {};
    
    for (const model of models || []) {
      const nodeId = await upsertNode('model', model.id, model.name, {
        model_type: model.model_type,
        version: model.version,
        status: model.status,
        provider: model.provider,
        overall_score: model.overall_score,
        fairness_score: model.fairness_score,
        toxicity_score: model.toxicity_score,
        privacy_score: model.privacy_score,
        robustness_score: model.robustness_score,
      });
      if (nodeId) {
        modelNodeIds[model.id] = nodeId;
        // Edge: model -> deployed_to -> system
        if (model.system_id && systemNodeIds[model.system_id]) {
          await upsertEdge(nodeId, systemNodeIds[model.system_id], 'deployed_to', {
            version: model.version,
          });
        }
      }
    }

    // 4. Sync Evaluations
    console.log('Syncing evaluations...');
    const { data: evaluations } = await supabase.from('evaluation_runs').select('*');
    
    for (const evaluation of evaluations || []) {
      const nodeId = await upsertNode('evaluation', evaluation.id, 
        `${evaluation.engine_type || 'Evaluation'} Run`, {
        engine_type: evaluation.engine_type,
        status: evaluation.status,
        overall_score: evaluation.overall_score,
        fairness_score: evaluation.fairness_score,
        toxicity_score: evaluation.toxicity_score,
        privacy_score: evaluation.privacy_score,
      });
      if (nodeId && evaluation.model_id && modelNodeIds[evaluation.model_id]) {
        // Edge: model -> evaluated_by -> evaluation
        await upsertEdge(modelNodeIds[evaluation.model_id], nodeId, 'evaluated_by', {
          score: evaluation.overall_score,
          engine: evaluation.engine_type,
        });
      }
    }

    // 5. Sync Risk Assessments
    console.log('Syncing risk assessments...');
    const { data: risks } = await supabase.from('risk_assessments').select('*');
    
    for (const risk of risks || []) {
      const nodeId = await upsertNode('risk', risk.id, `Risk: ${risk.risk_tier}`, {
        risk_tier: risk.risk_tier,
        uri_score: risk.uri_score,
        static_risk_score: risk.static_risk_score,
        runtime_risk_score: risk.runtime_risk_score,
      });
      if (nodeId && risk.system_id && systemNodeIds[risk.system_id]) {
        // Edge: system -> monitored_by -> risk
        await upsertEdge(systemNodeIds[risk.system_id], nodeId, 'monitored_by', {
          tier: risk.risk_tier,
          score: risk.uri_score,
        });
      }
    }

    // 6. Sync Incidents
    console.log('Syncing incidents...');
    const { data: incidents } = await supabase.from('incidents').select('*');
    
    for (const incident of incidents || []) {
      const nodeId = await upsertNode('incident', incident.id, incident.title, {
        severity: incident.severity,
        status: incident.status,
        incident_type: incident.incident_type,
      });
      if (nodeId && incident.model_id && modelNodeIds[incident.model_id]) {
        // Edge: incident -> triggers -> model
        await upsertEdge(nodeId, modelNodeIds[incident.model_id], 'triggers', {
          severity: incident.severity,
        });
      }
    }

    // 7. Sync System Approvals (Decisions)
    console.log('Syncing approvals...');
    const { data: approvals } = await supabase.from('system_approvals').select('*');
    
    for (const approval of approvals || []) {
      const nodeId = await upsertNode('decision', approval.id, `Approval: ${approval.status}`, {
        status: approval.status,
        reason: approval.reason,
      });
      if (nodeId && approval.system_id && systemNodeIds[approval.system_id]) {
        // Edge: system -> approved_by -> decision
        await upsertEdge(systemNodeIds[approval.system_id], nodeId, 'approved_by', {
          status: approval.status,
        });
      }
    }

    // 8. Sync Controls
    console.log('Syncing controls...');
    const { data: controls } = await supabase.from('controls').select('*');
    const controlNodeIds: Record<string, string> = {};
    
    for (const control of controls || []) {
      const nodeId = await upsertNode('control', control.id, `${control.code}: ${control.title}`, {
        code: control.code,
        severity: control.severity,
        framework_id: control.framework_id,
      });
      if (nodeId) controlNodeIds[control.id] = nodeId;
    }

    // 9. Sync Control Assessments (links models to controls)
    console.log('Syncing control assessments...');
    const { data: assessments } = await supabase.from('control_assessments').select('*');
    
    for (const assessment of assessments || []) {
      if (assessment.model_id && modelNodeIds[assessment.model_id] && 
          assessment.control_id && controlNodeIds[assessment.control_id]) {
        const relationshipType = assessment.status === 'compliant' ? 'satisfies' : 'violates';
        await upsertEdge(modelNodeIds[assessment.model_id], controlNodeIds[assessment.control_id], relationshipType, {
          status: assessment.status,
          evidence: assessment.evidence,
        });
      }
    }

    // 10. Sync Policy Violations
    console.log('Syncing policy violations...');
    const { data: violations } = await supabase.from('policy_violations').select('*');
    
    for (const violation of violations || []) {
      if (violation.model_id && modelNodeIds[violation.model_id]) {
        const nodeId = await upsertNode('incident', violation.id, `Violation: ${violation.violation_type}`, {
          violation_type: violation.violation_type,
          severity: violation.severity,
          blocked: violation.blocked,
        });
        if (nodeId) {
          await upsertEdge(modelNodeIds[violation.model_id], nodeId, 'triggers', {
            severity: violation.severity,
          });
        }
      }
    }

    console.log('KG Sync complete:', stats);

    return new Response(JSON.stringify({
      success: true,
      stats,
      message: `Synced ${stats.nodes_created} nodes and ${stats.edges_created} edges`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('KG Sync error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
