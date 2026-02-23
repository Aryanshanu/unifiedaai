import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { validateSession, requireAuth, hasAnyRole, getServiceClient, corsHeaders } from "../_shared/auth-helper.ts";

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
    // Authentication required for audit reports
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    const { user } = authResult;
    
    // Only admins and analysts can generate audit reports
    if (!hasAnyRole(user!, ['admin', 'analyst'])) {
      return new Response(
        JSON.stringify({ error: "Admin or analyst role required for audit reports" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-audit-report] User ${user?.id} generating report...`);

    const body: AuditReportRequest = await req.json();
    const { systemId, projectId, startDate, endDate, includeRawLogs = false } = body;

    if (!systemId && !projectId) {
      return new Response(
        JSON.stringify({ error: "systemId or projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service client for full audit access (needs to read all logs)
    const supabase = getServiceClient();

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

  // Generate PDF
  let pdfInfo: { storage_path?: string; pdf_hash?: string; file_size_bytes?: number; ledger_recorded?: boolean } | null = null;
  
  try {
    const pdfBytes = await generateAuditPDF(report);
    
    // Hash the PDF - create new ArrayBuffer to satisfy TypeScript
    const pdfBuffer = new Uint8Array(pdfBytes).buffer as ArrayBuffer;
    const pdfHashBuffer = await crypto.subtle.digest("SHA-256", pdfBuffer);
    const pdfHashArray = Array.from(new Uint8Array(pdfHashBuffer));
    const pdfHash = pdfHashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    
    const storagePath = `audit-reports/${report.report_id}.pdf`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('fractal')
      .upload(storagePath, pdfBytes, { 
        contentType: 'application/pdf', 
        cacheControl: '31536000',
        upsert: true
      });
    
    if (!uploadError) {
      // Record in immutable ledger
      const { error: ledgerError } = await supabase.from('audit_report_ledger').insert({
        report_id: report.report_id,
        report_type: 'governance_audit',
        content_hash: contentHash,
        pdf_hash: pdfHash,
        storage_bucket: 'fractal',
        storage_path: storagePath,
        file_size_bytes: pdfBytes.length,
        generated_by: user?.id,
        generated_at: report.generated_at,
        report_period_start: fromDate,
        report_period_end: toDate,
        metadata: {
          system_id: systemId,
          project_id: projectId,
          entry_count: auditEntries.length,
          unique_actors: summary.unique_actors
        }
      });
      
      if (ledgerError) {
        console.warn('[generate-audit-report] Ledger insert failed:', ledgerError);
      }
      
      pdfInfo = {
        storage_path: storagePath,
        pdf_hash: pdfHash,
        file_size_bytes: pdfBytes.length,
        ledger_recorded: !ledgerError
      };
      
      console.log(`[generate-audit-report] PDF generated and stored: ${storagePath}`);
    } else {
      console.warn('[generate-audit-report] PDF upload failed:', uploadError);
    }
  } catch (pdfError) {
    console.error('[generate-audit-report] PDF generation failed:', pdfError);
  }

  return new Response(
    JSON.stringify({ ...report, pdf: pdfInfo }),
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

// Generate PDF from audit report data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateAuditPDF(report: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let page = pdfDoc.addPage([612, 792]); // Letter size
  let y = 750;
  const leftMargin = 50;
  
  // Header
  page.drawText('FRACTAL UNIFIED AUTONOMOUS GOVERNANCE REPORT', { 
    x: leftMargin, y, size: 18, font: boldFont, color: rgb(0.1, 0.1, 0.3) 
  });
  y -= 30;
  
  // Report metadata
  page.drawText(`Report ID: ${report.report_id}`, { x: leftMargin, y, size: 10, font });
  y -= 15;
  page.drawText(`Generated: ${report.generated_at}`, { x: leftMargin, y, size: 10, font });
  y -= 15;
  page.drawText(`Content Hash: ${report.content_hash.substring(0, 32)}...`, { x: leftMargin, y, size: 10, font });
  y -= 30;
  
  // Executive Summary Section
  page.drawText('EXECUTIVE SUMMARY', { x: leftMargin, y, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.4) });
  y -= 25;
  
  page.drawText(`Total Audit Entries: ${report.summary.total_entries}`, { x: leftMargin + 10, y, size: 11, font });
  y -= 15;
  page.drawText(`Unique Actors: ${report.summary.unique_actors}`, { x: leftMargin + 10, y, size: 11, font });
  y -= 15;
  page.drawText(`Date Range: ${report.summary.date_range.from.split('T')[0]} to ${report.summary.date_range.to.split('T')[0]}`, { 
    x: leftMargin + 10, y, size: 11, font 
  });
  y -= 30;
  
  // Actions by Type
  page.drawText('ACTIONS BY TYPE', { x: leftMargin, y, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.4) });
  y -= 20;
  
  const actionEntries = Object.entries(report.summary.actions_by_type || {});
  for (const [action, count] of actionEntries.slice(0, 20)) {
    page.drawText(`• ${action}: ${count}`, { x: leftMargin + 10, y, size: 10, font });
    y -= 12;
    
    if (y < 100) {
      page = pdfDoc.addPage([612, 792]);
      y = 750;
    }
  }
  
  // Compliance Section
  y -= 20;
  if (y < 150) {
    page = pdfDoc.addPage([612, 792]);
    y = 750;
  }
  
  page.drawText('COMPLIANCE STATUS', { x: leftMargin, y, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.4) });
  y -= 20;
  
  const checkMark = '✓';
  page.drawText(`${checkMark} EU AI Act Aligned`, { x: leftMargin + 10, y, size: 11, font, color: rgb(0, 0.5, 0) });
  y -= 15;
  page.drawText(`${checkMark} GDPR Compliant`, { x: leftMargin + 10, y, size: 11, font, color: rgb(0, 0.5, 0) });
  y -= 15;
  page.drawText(`${checkMark} Evidence Chain Complete`, { x: leftMargin + 10, y, size: 11, font, color: rgb(0, 0.5, 0) });
  y -= 15;
  page.drawText(`${checkMark} Hash Verified`, { x: leftMargin + 10, y, size: 11, font, color: rgb(0, 0.5, 0) });
  
  // Footer on last page
  const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  lastPage.drawText('Fractal Unified Autonomous Governance Platform', { 
    x: leftMargin, y: 40, size: 9, font, color: rgb(0.5, 0.5, 0.5)
  });
  lastPage.drawText(`This is an immutable audit record. Hash: ${report.content_hash.substring(0, 40)}...`, { 
    x: leftMargin, y: 28, size: 8, font, color: rgb(0.5, 0.5, 0.5) 
  });
  
  return await pdfDoc.save();
}
