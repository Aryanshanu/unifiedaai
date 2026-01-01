import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateSession, requireAuth, hasAnyRole, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Authentication required for KG sync
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    const { user } = authResult;
    
    // Only admins and analysts can sync the knowledge graph
    if (!hasAnyRole(user!, ['admin', 'analyst'])) {
      return new Response(
        JSON.stringify({ error: "Admin or analyst role required for KG sync" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[kg-sync] User ${user?.id} starting optimized KG Sync...`);
    
    const supabase = getServiceClient();

    // Fetch all data in parallel for speed
    const [
      { data: projects },
      { data: systems },
      { data: models },
      { data: evaluations },
      { data: risks },
      { data: incidents },
      { data: approvals },
      { data: controls },
      { data: assessments },
      { data: violations },
      { data: existingNodes },
      { data: existingEdges },
    ] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('systems').select('*'),
      supabase.from('models').select('*'),
      supabase.from('evaluation_runs').select('*'),
      supabase.from('risk_assessments').select('*'),
      supabase.from('incidents').select('*'),
      supabase.from('system_approvals').select('*'),
      supabase.from('controls').select('*'),
      supabase.from('control_assessments').select('*'),
      supabase.from('policy_violations').select('*'),
      supabase.from('kg_nodes').select('id, entity_type, entity_id'),
      supabase.from('kg_edges').select('id, source_node_id, target_node_id, relationship_type'),
    ]);

    console.log(`Data fetched in ${Date.now() - startTime}ms`);

    // Build lookup maps for existing nodes/edges
    const existingNodeMap = new Map<string, string>();
    for (const node of existingNodes || []) {
      existingNodeMap.set(`${node.entity_type}:${node.entity_id}`, node.id);
    }

    const existingEdgeSet = new Set<string>();
    for (const edge of existingEdges || []) {
      existingEdgeSet.add(`${edge.source_node_id}:${edge.target_node_id}:${edge.relationship_type}`);
    }

    // Prepare batch node inserts
    const nodesToInsert: any[] = [];
    const nodeIdMap: Record<string, string> = {};

    // Helper to queue node for batch insert
    function queueNode(entityType: string, entityId: string, label: string, properties: any = {}) {
      const key = `${entityType}:${entityId}`;
      if (existingNodeMap.has(key)) {
        nodeIdMap[entityId] = existingNodeMap.get(key)!;
        return;
      }
      const tempId = crypto.randomUUID();
      nodeIdMap[entityId] = tempId;
      nodesToInsert.push({
        id: tempId,
        entity_type: entityType,
        entity_id: entityId,
        label,
        source: 'sync',
        status: 'active',
        properties,
      });
    }

    // Queue all nodes
    for (const project of projects || []) {
      queueNode('deployment', project.id, project.name, {
        environment: project.environment,
        criticality: project.criticality,
        data_sensitivity: project.data_sensitivity,
      });
    }

    for (const system of systems || []) {
      queueNode('deployment', system.id, system.name, {
        provider: system.provider,
        system_type: system.system_type,
        deployment_status: system.deployment_status,
        uri_score: system.uri_score,
      });
    }

    for (const model of models || []) {
      queueNode('model', model.id, model.name, {
        model_type: model.model_type,
        version: model.version,
        status: model.status,
        provider: model.provider,
        overall_score: model.overall_score,
      });
    }

    for (const evaluation of evaluations || []) {
      queueNode('evaluation', evaluation.id, `${evaluation.engine_type || 'Evaluation'} Run`, {
        engine_type: evaluation.engine_type,
        status: evaluation.status,
        overall_score: evaluation.overall_score,
      });
    }

    for (const risk of risks || []) {
      queueNode('risk', risk.id, `Risk: ${risk.risk_tier}`, {
        risk_tier: risk.risk_tier,
        uri_score: risk.uri_score,
      });
    }

    for (const incident of incidents || []) {
      queueNode('incident', incident.id, incident.title, {
        severity: incident.severity,
        status: incident.status,
      });
    }

    for (const approval of approvals || []) {
      queueNode('decision', approval.id, `Approval: ${approval.status}`, {
        status: approval.status,
        reason: approval.reason,
      });
    }

    for (const control of controls || []) {
      queueNode('control', control.id, `${control.code}: ${control.title}`, {
        code: control.code,
        severity: control.severity,
      });
    }

    for (const violation of violations || []) {
      queueNode('incident', violation.id, `Violation: ${violation.violation_type}`, {
        violation_type: violation.violation_type,
        severity: violation.severity,
      });
    }

    // Batch insert nodes
    let nodesCreated = 0;
    if (nodesToInsert.length > 0) {
      const { error } = await supabase.from('kg_nodes').insert(nodesToInsert);
      if (error) {
        console.error('Batch node insert error:', error);
      } else {
        nodesCreated = nodesToInsert.length;
      }
    }

    console.log(`Nodes processed in ${Date.now() - startTime}ms`);

    // Prepare batch edge inserts
    const edgesToInsert: any[] = [];

    function queueEdge(sourceId: string, targetId: string, relationshipType: string, properties: any = {}) {
      const sourceNodeId = nodeIdMap[sourceId] || existingNodeMap.get(`deployment:${sourceId}`) || existingNodeMap.get(`model:${sourceId}`);
      const targetNodeId = nodeIdMap[targetId] || existingNodeMap.get(`deployment:${targetId}`) || existingNodeMap.get(`model:${targetId}`);
      
      if (!sourceNodeId || !targetNodeId) return;
      
      const edgeKey = `${sourceNodeId}:${targetNodeId}:${relationshipType}`;
      if (existingEdgeSet.has(edgeKey)) return;
      
      existingEdgeSet.add(edgeKey); // Prevent duplicates in same batch
      edgesToInsert.push({
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        relationship_type: relationshipType,
        properties,
      });
    }

    // Queue edges: systems -> projects
    for (const system of systems || []) {
      if (system.project_id) {
        queueEdge(system.id, system.project_id, 'deployed_to', { environment: system.deployment_status });
      }
    }

    // Queue edges: models -> systems
    for (const model of models || []) {
      if (model.system_id) {
        queueEdge(model.id, model.system_id, 'deployed_to', { version: model.version });
      }
    }

    // Queue edges: models -> evaluations
    for (const evaluation of evaluations || []) {
      if (evaluation.model_id) {
        queueEdge(evaluation.model_id, evaluation.id, 'evaluated_by', { 
          score: evaluation.overall_score, 
          engine: evaluation.engine_type 
        });
      }
    }

    // Queue edges: systems -> risks
    for (const risk of risks || []) {
      if (risk.system_id) {
        queueEdge(risk.system_id, risk.id, 'monitored_by', { tier: risk.risk_tier });
      }
    }

    // Queue edges: incidents -> models
    for (const incident of incidents || []) {
      if (incident.model_id) {
        queueEdge(incident.id, incident.model_id, 'triggers', { severity: incident.severity });
      }
    }

    // Queue edges: systems -> approvals
    for (const approval of approvals || []) {
      if (approval.system_id) {
        queueEdge(approval.system_id, approval.id, 'approved_by', { status: approval.status });
      }
    }

    // Queue edges: models -> controls (from assessments)
    for (const assessment of assessments || []) {
      if (assessment.model_id && assessment.control_id) {
        const relType = assessment.status === 'compliant' ? 'satisfies' : 'violates';
        queueEdge(assessment.model_id, assessment.control_id, relType, { status: assessment.status });
      }
    }

    // Queue edges: models -> violations
    for (const violation of violations || []) {
      if (violation.model_id) {
        queueEdge(violation.model_id, violation.id, 'triggers', { severity: violation.severity });
      }
    }

    // Batch insert edges
    let edgesCreated = 0;
    if (edgesToInsert.length > 0) {
      const { error } = await supabase.from('kg_edges').insert(edgesToInsert);
      if (error) {
        console.error('Batch edge insert error:', error);
      } else {
        edgesCreated = edgesToInsert.length;
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`KG Sync complete in ${totalTime}ms: ${nodesCreated} nodes, ${edgesCreated} edges`);

    return new Response(JSON.stringify({
      success: true,
      stats: { nodes_created: nodesCreated, edges_created: edgesCreated },
      message: `Synced ${nodesCreated} nodes and ${edgesCreated} edges in ${totalTime}ms`,
      duration_ms: totalTime,
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
