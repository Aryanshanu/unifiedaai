import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSecurityStats, useSecurityTestRuns } from '@/hooks/useSecurityScans';
import { SecurityScoreGauge } from '@/components/security/SecurityScoreGauge';
import { useNavigate } from 'react-router-dom';
import { Shield, ScanSearch, FlaskConical, Target, ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import { ComponentErrorBoundary } from '@/components/error/ErrorBoundary';
import { HealthIndicator } from '@/components/shared/HealthIndicator';
import { useDataHealth } from '@/components/shared/DataHealthWrapper';

function SecurityDashboardContent() {
  const navigate = useNavigate();
  const { data: stats, isLoading, isError, refetch } = useSecurityStats();
  const { data: recentRuns } = useSecurityTestRuns();
  const { status, lastUpdated } = useDataHealth(isLoading, isError);

  const engines = [
    { name: 'AI Pentesting', icon: ScanSearch, path: '/security/pentest', description: 'OWASP LLM Top 10 adversarial testing' },
    { name: 'Jailbreak Lab', icon: FlaskConical, path: '/security/jailbreak', description: 'Prompt injection resistance testing' },
    { name: 'Threat Modeling', icon: Target, path: '/security/threats', description: 'STRIDE, OWASP LLM, MAESTRO, ATLAS' },
  ];

  return (
    <MainLayout title="Security Dashboard" subtitle="Core Security Module — Aggregate Metrics"
      headerActions={<HealthIndicator status={status} lastUpdated={lastUpdated} onRetry={refetch} showLabel />}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="flex justify-center"><SecurityScoreGauge score={stats?.securityHealth ?? 0} label="Security Health" size="lg" /></div>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats?.totalScans ?? 0}</p><p className="text-sm text-muted-foreground">Total Scans</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-destructive">{stats?.openFindings ?? 0}</p><p className="text-sm text-muted-foreground">Open Findings</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats?.avgResistance !== null ? `${stats.avgResistance?.toFixed(0)}%` : '—'}</p><p className="text-sm text-muted-foreground">Avg Resistance</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {engines.map(e => {
          const Icon = e.icon;
          return (
            <Card key={e.path} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(e.path)}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
                    <div><h3 className="font-semibold text-foreground">{e.name}</h3><p className="text-sm text-muted-foreground mt-1">{e.description}</p></div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card><CardContent className="pt-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4" />Recent Scans</h3>
        {recentRuns && recentRuns.length > 0 ? (
          <div className="space-y-2">
            {recentRuns.slice(0, 10).map((run: any) => (
              <div key={run.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize text-xs">{run.test_type?.replace('_', ' ')}</Badge>
                  <span className="text-sm">{run.model_id?.substring(0, 8)}...</span>
                  <span className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  {run.risk_level && <Badge variant={run.risk_level === 'low' ? 'secondary' : 'destructive'} className="text-xs capitalize">{run.risk_level}</Badge>}
                  <span className="text-sm font-mono">{run.overall_score != null ? `${(run.overall_score * 100).toFixed(0)}%` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No scans yet. Run a security scan from one of the engines above.</p>
          </div>
        )}
      </CardContent></Card>
    </MainLayout>
  );
}

export default function SecurityDashboard() { return <ComponentErrorBoundary><SecurityDashboardContent /></ComponentErrorBoundary>; }
