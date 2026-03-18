import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useModels } from "@/hooks/useModels";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Wrench, Scale, AlertCircle, ShieldAlert, Lock, Eye, Database,
  ArrowRight, CheckCircle, XCircle, ScanSearch, FlaskConical, Target,
} from "lucide-react";

export function TechnicalDashboard() {
  const navigate = useNavigate();
  const { data: models } = useModels();

  const { data: recentEvals } = useQuery({
    queryKey: ['technical-evals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('evaluation_runs')
        .select('id, engine_type, status, overall_score, created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
    refetchInterval: false,
  });

  const { data: dqMetrics } = useQuery({
    queryKey: ['technical-dq'],
    queryFn: async () => {
      const [datasetsRes, incidentsRes, contractsRes] = await Promise.all([
        supabase.from('datasets').select('*', { count: 'exact', head: true }),
        supabase.from('dq_incidents').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('data_contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      return {
        datasets: datasetsRes.count || 0,
        openIncidents: incidentsRes.count || 0,
        activeContracts: contractsRes.count || 0,
      };
    },
    refetchInterval: 60000,
  });

  const { data: securityStats } = useQuery({
    queryKey: ['technical-security'],
    queryFn: async () => {
      const { data } = await supabase
        .from('security_test_runs')
        .select('tests_total, tests_passed, tests_failed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    refetchInterval: false,
  });

  const raiEngines = [
    { name: "Fairness", icon: Scale, path: "/engine/fairness" },
    { name: "Hallucination", icon: AlertCircle, path: "/engine/hallucination" },
    { name: "Toxicity", icon: ShieldAlert, path: "/engine/toxicity" },
    { name: "Privacy", icon: Lock, path: "/engine/privacy" },
    { name: "Explainability", icon: Eye, path: "/engine/explainability" },
  ];

  const securityEngines = [
    { name: 'AI Pentesting', icon: ScanSearch, path: '/security/pentest' },
    { name: 'Jailbreak Lab', icon: FlaskConical, path: '/security/jailbreak' },
    { name: 'Threat Modeling', icon: Target, path: '/security/threats' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Wrench className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Technical Operations Center</h2>
          <p className="text-sm text-muted-foreground">Model evaluation, security testing, and data quality</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => navigate('/models')}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Registered Models</p>
            <p className="text-3xl font-bold">{models?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => navigate('/engine/data-quality')}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Datasets</p>
            <p className="text-3xl font-bold">{dqMetrics?.datasets || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">DQ Incidents</p>
            <p className="text-3xl font-bold text-warning">{dqMetrics?.openIncidents || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Contracts</p>
            <p className="text-3xl font-bold">{dqMetrics?.activeContracts || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* RAI Engines */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" /> Core RAI Engines
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {raiEngines.map(e => {
            const Icon = e.icon;
            return (
              <Card key={e.path} className="cursor-pointer hover:border-primary/50" onClick={() => navigate(e.path)}>
                <CardContent className="pt-4 pb-4 flex flex-col items-center text-center">
                  <Icon className="w-5 h-5 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">{e.name}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Security Engines */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <ScanSearch className="w-4 h-4 text-primary" /> Security Testing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {securityEngines.map(e => {
            const Icon = e.icon;
            return (
              <Card key={e.path} className="cursor-pointer hover:border-primary/50" onClick={() => navigate(e.path)}>
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{e.name}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Evaluations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Evaluation Runs</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/evaluation')}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentEvals && recentEvals.length > 0 ? (
            <div className="space-y-2">
              {recentEvals.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {ev.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : ev.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Database className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium capitalize">{ev.engine_type || 'evaluation'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.overall_score !== null && (
                      <span className={`text-sm font-bold ${ev.overall_score >= 70 ? 'text-success' : 'text-destructive'}`}>
                        {Math.round(ev.overall_score)}%
                      </span>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">{ev.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-sm text-muted-foreground">No evaluations yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
