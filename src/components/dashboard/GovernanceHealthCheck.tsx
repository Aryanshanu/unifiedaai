import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  XCircle,
  Database,
  Shield,
  GitBranch,
  TrendingUp,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthCheck {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  count: number;
  required: number;
  regulation?: string;
}

export function GovernanceHealthCheck() {
  // Fetch all governance health metrics
  const { data: healthData, isLoading, refetch } = useQuery({
    queryKey: ['governance-health-check'],
    queryFn: async () => {
      // Get data sources count
      const { count: sourcesCount } = await supabase
        .from('data_sources')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'connected');

      // Get AI-approved datasets count
      const { count: approvedDatasetsCount } = await supabase
        .from('datasets')
        .select('*', { count: 'exact', head: true })
        .eq('ai_approval_status', 'approved');

      // Get total datasets count
      const { count: totalDatasetsCount } = await supabase
        .from('datasets')
        .select('*', { count: 'exact', head: true });

      // Get models with training data linked
      const { data: modelsWithTraining, count: traceableModelsCount } = await supabase
        .from('models')
        .select('*', { count: 'exact', head: true })
        .not('training_dataset_id', 'is', null);

      // Get total models
      const { count: totalModelsCount } = await supabase
        .from('models')
        .select('*', { count: 'exact', head: true });

      // Get open drift alerts
      const { count: openDriftCount } = await supabase
        .from('data_drift_alerts')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'resolved');

      // Get open critical anomalies
      const { count: criticalAnomaliesCount } = await supabase
        .from('dataset_anomalies')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .neq('status', 'resolved');

      // Get audit log count (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const { count: auditLogCount } = await supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('performed_at', ninetyDaysAgo.toISOString());

      // Get quality runs with PASS verdict
      const { count: passedQualityRuns } = await supabase
        .from('dataset_quality_runs')
        .select('*', { count: 'exact', head: true })
        .eq('verdict', 'PASS');

      const { count: totalQualityRuns } = await supabase
        .from('dataset_quality_runs')
        .select('*', { count: 'exact', head: true });

      return {
        sourcesCount: sourcesCount || 0,
        approvedDatasetsCount: approvedDatasetsCount || 0,
        totalDatasetsCount: totalDatasetsCount || 0,
        traceableModelsCount: traceableModelsCount || 0,
        totalModelsCount: totalModelsCount || 0,
        openDriftCount: openDriftCount || 0,
        criticalAnomaliesCount: criticalAnomaliesCount || 0,
        auditLogCount: auditLogCount || 0,
        passedQualityRuns: passedQualityRuns || 0,
        totalQualityRuns: totalQualityRuns || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const checks: HealthCheck[] = [
    {
      id: 'sources',
      name: 'Data Sources Connected',
      description: 'At least one data source should be connected',
      passed: (healthData?.sourcesCount || 0) >= 1,
      count: healthData?.sourcesCount || 0,
      required: 1,
      regulation: 'EU AI Act Art. 10',
    },
    {
      id: 'quality',
      name: 'Quality Gates Passing',
      description: 'Quality evaluations should have PASS verdict',
      passed: healthData?.totalQualityRuns 
        ? (healthData.passedQualityRuns / healthData.totalQualityRuns) >= 0.5
        : false,
      count: healthData?.passedQualityRuns || 0,
      required: healthData?.totalQualityRuns || 0,
    },
    {
      id: 'approved',
      name: 'Datasets AI Approved',
      description: 'Datasets should be approved for AI use',
      passed: (healthData?.approvedDatasetsCount || 0) > 0,
      count: healthData?.approvedDatasetsCount || 0,
      required: healthData?.totalDatasetsCount || 0,
      regulation: 'EU AI Act Art. 10',
    },
    {
      id: 'traceable',
      name: 'Models Traceable',
      description: 'Models should be linked to training datasets',
      passed: healthData?.totalModelsCount 
        ? (healthData.traceableModelsCount / healthData.totalModelsCount) >= 0.5
        : true,
      count: healthData?.traceableModelsCount || 0,
      required: healthData?.totalModelsCount || 0,
      regulation: 'EU AI Act Art. 12',
    },
    {
      id: 'drift',
      name: 'Drift Monitoring Active',
      description: 'No critical unresolved drift alerts',
      passed: (healthData?.openDriftCount || 0) === 0,
      count: healthData?.openDriftCount || 0,
      required: 0,
    },
    {
      id: 'audit',
      name: 'Audit Trail Intact',
      description: 'Governance actions are being logged',
      passed: (healthData?.auditLogCount || 0) >= 1,
      count: healthData?.auditLogCount || 0,
      required: 1,
      regulation: 'EU AI Act Art. 12',
    },
  ];

  const passedChecks = checks.filter(c => c.passed).length;
  const healthPercentage = Math.round((passedChecks / checks.length) * 100);

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Governance Health Check</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          End-to-end pipeline status for responsible AI governance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Health Score */}
        <div className={cn(
          "p-4 rounded-lg border-2",
          healthPercentage >= 80 ? 'bg-success/10 border-success/30' :
          healthPercentage >= 50 ? 'bg-warning/10 border-warning/30' :
          'bg-destructive/10 border-destructive/30'
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Overall Health</span>
            <span className={cn(
              "text-2xl font-bold",
              healthPercentage >= 80 ? 'text-success' :
              healthPercentage >= 50 ? 'text-warning' :
              'text-destructive'
            )}>
              {healthPercentage}%
            </span>
          </div>
          <Progress 
            value={healthPercentage} 
            className={cn(
              "h-2",
              healthPercentage >= 80 ? '[&>div]:bg-success' :
              healthPercentage >= 50 ? '[&>div]:bg-warning' :
              '[&>div]:bg-destructive'
            )}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {passedChecks}/{checks.length} checks passing
          </p>
        </div>

        {/* Individual Checks */}
        <div className="space-y-2">
          {checks.map((check) => (
            <div 
              key={check.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                check.passed ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
              )}
            >
              <div className="flex items-center gap-3">
                {check.passed ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{check.name}</span>
                    {check.regulation && (
                      <Badge variant="outline" className="text-xs">
                        {check.regulation}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{check.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "font-mono font-bold text-sm",
                  check.passed ? 'text-success' : 'text-destructive'
                )}>
                  {check.id === 'drift' ? (
                    check.count === 0 ? 'Clear' : `${check.count} Open`
                  ) : (
                    check.required > 0 ? `${check.count}/${check.required}` : check.count.toString()
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
