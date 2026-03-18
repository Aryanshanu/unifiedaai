import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { useModels } from "@/hooks/useModels";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, AlertTriangle, Database, CheckCircle, XCircle, ArrowRight,
  TrendingUp, Users, FileText, Crown,
} from "lucide-react";

export function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { data: metrics } = usePlatformMetrics();
  const { data: models } = useModels();

  const { data: complianceStats } = useQuery({
    queryKey: ['executive-compliance'],
    queryFn: async () => {
      const [frameworksRes, assessmentsRes, attestationsRes] = await Promise.all([
        supabase.from('control_frameworks').select('id, name, total_controls'),
        supabase.from('control_assessments').select('status'),
        supabase.from('attestations').select('status'),
      ]);
      const total = assessmentsRes.data?.length || 0;
      const compliant = assessmentsRes.data?.filter(a => a.status === 'compliant').length || 0;
      const signedAttestations = attestationsRes.data?.filter(a => a.status === 'approved').length || 0;
      return {
        frameworks: frameworksRes.data?.length || 0,
        complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0,
        totalAssessments: total,
        signedAttestations,
        totalAttestations: attestationsRes.data?.length || 0,
      };
    },
    refetchInterval: false,
  });

  const { data: riskDistribution } = useQuery({
    queryKey: ['executive-risk'],
    queryFn: async () => {
      const { data } = await supabase.from('risk_assessments').select('risk_tier');
      const dist = { critical: 0, high: 0, medium: 0, low: 0 };
      data?.forEach(r => { if (r.risk_tier && r.risk_tier in dist) dist[r.risk_tier as keyof typeof dist]++; });
      return dist;
    },
    refetchInterval: 120000,
  });

  const { data: recentIncidents } = useQuery({
    queryKey: ['executive-incidents'],
    queryFn: async () => {
      const { data } = await supabase
        .from('incidents')
        .select('id, title, severity, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: false,
  });

  const totalModels = models?.length || 0;

  return (
    <div className="space-y-6">
      {/* Executive Summary Header */}
      <div className="flex items-center gap-3 mb-2">
        <Crown className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Executive Command Center</h2>
          <p className="text-sm text-muted-foreground">Enterprise AI governance at a glance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/governance/approvals')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-3xl font-bold text-foreground">{metrics?.pendingApprovals || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/incidents')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Incidents</p>
                <p className="text-3xl font-bold text-destructive">{metrics?.recentIncidents || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/models')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Model Portfolio</p>
                <p className="text-3xl font-bold text-foreground">{totalModels}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <Database className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
                <p className="text-3xl font-bold text-success">{complianceStats?.complianceRate || 0}%</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution & Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Critical', count: riskDistribution?.critical || 0, color: 'text-destructive' },
                { label: 'High', count: riskDistribution?.high || 0, color: 'text-warning' },
                { label: 'Medium', count: riskDistribution?.medium || 0, color: 'text-muted-foreground' },
                { label: 'Low', count: riskDistribution?.low || 0, color: 'text-success' },
              ].map(item => (
                <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Compliance Posture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frameworks Tracked</span>
                <span className="font-medium">{complianceStats?.frameworks || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Controls Assessed</span>
                <span className="font-medium">{complianceStats?.totalAssessments || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Attestations Signed</span>
                <span className="font-medium">{complianceStats?.signedAttestations || 0} / {complianceStats?.totalAttestations || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4" />
            Top Incidents
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentIncidents && recentIncidents.length > 0 ? (
            <div className="space-y-3">
              {recentIncidents.map((incident: any) => (
                <div key={incident.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {incident.status === 'open' ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-success" />
                    )}
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(incident.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                    {incident.severity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent incidents</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
