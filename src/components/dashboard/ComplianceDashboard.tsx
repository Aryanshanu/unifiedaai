import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FileCheck, FileText, Shield, CheckCircle,
  Clock, AlertTriangle,
} from "lucide-react";

export function ComplianceDashboard() {
  const navigate = useNavigate();

  const { data: frameworkStats } = useQuery({
    queryKey: ['compliance-frameworks'],
    queryFn: async () => {
      const [frameworksRes, assessmentsRes] = await Promise.all([
        supabase.from('control_frameworks').select('id, name, total_controls'),
        supabase.from('control_assessments').select('control_id, status'),
      ]);
      const assessments = assessmentsRes.data || [];
      const total = assessments.length;
      const compliant = assessments.filter(a => a.status === 'compliant').length;
      const nonCompliant = assessments.filter(a => a.status === 'non_compliant').length;
      return {
        frameworks: frameworksRes.data || [],
        total,
        compliant,
        nonCompliant,
        rate: total > 0 ? Math.round((compliant / total) * 100) : 0,
      };
    },
    refetchInterval: false,
  });

  const { data: attestations } = useQuery({
    queryKey: ['compliance-attestations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attestations')
        .select('id, title, status, signed_at, expires_at')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: false,
  });

  const { data: auditStats } = useQuery({
    queryKey: ['compliance-audit'],
    queryFn: async () => {
      const [auditCountRes, reportCountRes] = await Promise.all([
        supabase.from('admin_audit_log').select('*', { count: 'exact', head: true }),
        supabase.from('audit_report_ledger').select('*', { count: 'exact', head: true }),
      ]);
      return {
        auditEntries: auditCountRes.count || 0,
        reportsGenerated: reportCountRes.count || 0,
      };
    },
    refetchInterval: false,
  });


  const pendingAttestations = attestations?.filter(a => a.status === 'pending').length || 0;
  const signedAttestations = attestations?.filter(a => a.status === 'approved').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <FileCheck className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Audit & Compliance Center</h2>
          <p className="text-sm text-muted-foreground">Regulatory reports, attestations, and evidence integrity</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
                <p className="text-3xl font-bold text-success">{frameworkStats?.rate || 0}%</p>
              </div>
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Attestations</p>
                <p className="text-3xl font-bold text-warning">{pendingAttestations}</p>
              </div>
              <Clock className="h-6 w-6 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Audit Trail Entries</p>
                <p className="text-3xl font-bold">{auditStats?.auditEntries || 0}</p>
              </div>
              <Hash className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reports Generated</p>
                <p className="text-3xl font-bold">{auditStats?.reportsGenerated || 0}</p>
              </div>
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attestations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4" />
            Attestations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attestations && attestations.length > 0 ? (
            <div className="space-y-3">
              {attestations.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium line-clamp-1">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.signed_at ? `Signed: ${new Date(a.signed_at).toLocaleDateString()}` : 'Not yet signed'}
                    </p>
                  </div>
                  <Badge
                    variant={a.status === 'approved' ? 'default' : a.status === 'pending' ? 'secondary' : 'destructive'}
                    className="text-xs capitalize"
                  >
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-sm text-muted-foreground">No attestations</p>
          )}
        </CardContent>
      </Card>

      {/* Non-Compliant Controls */}
      {(frameworkStats?.nonCompliant || 0) > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive">Non-Compliant Controls</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {frameworkStats?.nonCompliant} control(s) require remediation across {frameworkStats?.frameworks.length || 0} framework(s).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
