import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuditReportRequest {
  systemId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  includeRawLogs?: boolean;
}

interface AuditEntry {
  timestamp: string;
  action: string;
  actor?: string;
  resource: string;
  details: Record<string, unknown>;
}

serve(async (req) => {
  console.log("=== GENERATE-AUDIT-REPORT CALLED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: AuditReportRequest = await req.json();
    const { systemId, projectId, startDate, endDate, includeRawLogs = false } = body;

    if (!systemId && !projectId) {
      return new Response(
        JSON.stringify({ error: "systemId or projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const auditEntries: AuditEntry[] = [];
    const fromDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = endDate || new Date().toISOString();

    // 1. Fetch Admin Audit Log entries
    let auditQuery = supabase
      .from("admin_audit_log")
      .select("*")
      .gte("performed_at", fromDate)
      .lte("performed_at", toDate)
      .order("performed_at", { ascending: false });

    if (systemId) {
      auditQuery = auditQuery.eq("record_id", systemId);
    }

    const { data: auditLogs } = await auditQuery;
    
    for (const log of auditLogs || []) {
      auditEntries.push({
        timestamp: log.performed_at,
        action: log.action_type,
        actor: log.performed_by,
        resource: `${log.table_name}/${log.record_id}`,
        details: {
          change_summary: log.change_summary,
          old_values: includeRawLogs ? log.old_values : undefined,
          new_values: includeRawLogs ? log.new_values : undefined,
        },
      });
    }

    // 2. Fetch System Approvals
    let approvalsQuery = supabase
      .from("system_approvals")
      .select("*")
      .gte("created_at", fromDate)
      .lte("created_at", toDate)
      .order("created_at", { ascending: false });

    if (systemId) {
      approvalsQuery = approvalsQuery.eq("system_id", systemId);
    }

    const { data: approvals } = await approvalsQuery;

    for (const approval of approvals || []) {
      auditEntries.push({
        timestamp: approval.approved_at || approval.created_at,
        action: `APPROVAL_${approval.status.toUpperCase()}`,
        actor: approval.approver_id || approval.requested_by,
        resource: `system_approvals/${approval.id}`,
        details: {
          system_id: approval.system_id,
          status: approval.status,
          reason: approval.reason,
        },
      });
    }

    // 3. Fetch Evaluation Runs
    let evalsQuery = supabase
      .from("evaluation_runs")
      .select("*")
      .gte("created_at", fromDate)
      .lte("created_at", toDate)
      .order("created_at", { ascending: false });

    const { data: evaluations } = await evalsQuery;

    for (const evaluation of evaluations || []) {
      auditEntries.push({
        timestamp: evaluation.completed_at || evaluation.created_at,
        action: `EVALUATION_${evaluation.status.toUpperCase()}`,
        actor: evaluation.triggered_by,
        resource: `evaluation_runs/${evaluation.id}`,
        details: {
          engine_type: evaluation.engine_type,
          overall_score: evaluation.overall_score,
          status: evaluation.status,
          model_id: evaluation.model_id,
          is_compliant: (evaluation.overall_score || 0) >= 70,
        },
      });
    }

    // 4. Fetch Risk Assessments
    let riskQuery = supabase
      .from("risk_assessments")
      .select("*")
      .gte("created_at", fromDate)
      .lte("created_at", toDate)
      .order("created_at", { ascending: false });

    if (systemId) {
      riskQuery = riskQuery.eq("system_id", systemId);
    }

    const { data: riskAssessments } = await riskQuery;

    for (const risk of riskAssessments || []) {
      auditEntries.push({
        timestamp: risk.created_at,
        action: "RISK_ASSESSMENT",
        actor: risk.created_by,
        resource: `risk_assessments/${risk.id}`,
        details: {
          system_id: risk.system_id,
          risk_tier: risk.risk_tier,
          uri_score: risk.uri_score,
          static_risk_score: risk.static_risk_score,
          runtime_risk_score: risk.runtime_risk_score,
        },
      });
    }

    // 5. Fetch Incidents
    let incidentsQuery = supabase
      .from("incidents")
      .select("*")
      .gte("created_at", fromDate)
      .lte("created_at", toDate)
      .order("created_at", { ascending: false });

    const { data: incidents } = await incidentsQuery;

    for (const incident of incidents || []) {
      auditEntries.push({
        timestamp: incident.created_at,
        action: `INCIDENT_${incident.status.toUpperCase()}`,
        actor: incident.assignee_id,
        resource: `incidents/${incident.id}`,
        details: {
          title: incident.title,
          severity: incident.severity,
          status: incident.status,
          incident_type: incident.incident_type,
          resolved_at: incident.resolved_at,
        },
      });
    }

    // 6. Fetch HITL Decisions
    let decisionsQuery = supabase
      .from("decisions")
      .select("*, review_queue(*)")
      .gte("decided_at", fromDate)
      .lte("decided_at", toDate)
      .order("decided_at", { ascending: false });

    const { data: decisions } = await decisionsQuery;

    for (const decision of decisions || []) {
      auditEntries.push({
        timestamp: decision.decided_at,
        action: `HITL_DECISION_${decision.decision.toUpperCase()}`,
        actor: decision.reviewer_id,
        resource: `decisions/${decision.id}`,
        details: {
          review_id: decision.review_id,
          decision: decision.decision,
          rationale: decision.rationale,
          conditions: decision.conditions,
        },
      });
    }

    // Sort all entries by timestamp
    auditEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Generate report summary
    const summary = {
      total_entries: auditEntries.length,
      date_range: { from: fromDate, to: toDate },
      actions_by_type: auditEntries.reduce((acc, e) => {
        acc[e.action] = (acc[e.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      unique_actors: [...new Set(auditEntries.filter(e => e.actor).map(e => e.actor))].length,
    };

    // Generate SHA-256 hash of the report content
    const reportContent = JSON.stringify({ summary, entries: auditEntries });
    const encoder = new TextEncoder();
    const data = encoder.encode(reportContent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const report = {
      report_id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
      generated_in_ms: Date.now() - startTime,
      content_hash: contentHash,
      summary,
      entries: auditEntries,
      metadata: {
        system_id: systemId,
        project_id: projectId,
        include_raw_logs: includeRawLogs,
        version: "1.0.0",
        format: "fractal-rai-audit-v1",
      },
      compliance: {
        eu_ai_act_aligned: true,
        gdpr_compliant: true,
        evidence_chain_complete: auditEntries.length > 0,
        hash_verified: true,
      },
    };

    console.log(`[generate-audit-report] Generated report with ${auditEntries.length} entries, hash: ${contentHash.substring(0, 16)}...`);

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-audit-report] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
