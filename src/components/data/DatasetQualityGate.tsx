import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Loader2,
  RefreshCw,
  Lock,
  Unlock,
  FileCheck,
  Scale,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QualityGate {
  id: string;
  name: string;
  description: string;
  required: number;
  actual: number | null;
  passed: boolean;
  regulation: string;
  blocking: boolean;
}

interface DatasetQualityGateProps {
  datasetId: string;
  onApprovalReady?: (ready: boolean) => void;
  showActions?: boolean;
}

export function DatasetQualityGate({ 
  datasetId, 
  onApprovalReady,
  showActions = true 
}: DatasetQualityGateProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dataset quality data
  const { data: qualityData, isLoading, refetch } = useQuery({
    queryKey: ['dataset-quality-gate', datasetId],
    queryFn: async () => {
      // Get latest quality run
      const { data: qualityRun } = await supabase
        .from('dataset_quality_runs')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get bias report
      const { data: biasReport } = await supabase
        .from('dataset_bias_reports')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get anomalies count
      const { count: anomalyCount } = await supabase
        .from('dataset_anomalies')
        .select('*', { count: 'exact', head: true })
        .eq('dataset_id', datasetId)
        .eq('status', 'open')
        .eq('severity', 'critical');

      return {
        qualityRun,
        biasReport,
        criticalAnomalies: anomalyCount || 0,
      };
    },
    enabled: !!datasetId,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Define quality gates
  const gates: QualityGate[] = [
    {
      id: 'completeness',
      name: 'Completeness',
      description: 'Data must be at least 95% complete',
      required: 95,
      actual: qualityData?.qualityRun?.completeness_score 
        ? qualityData.qualityRun.completeness_score * 100 
        : null,
      passed: qualityData?.qualityRun?.completeness_score 
        ? qualityData.qualityRun.completeness_score * 100 >= 95 
        : false,
      regulation: 'EU AI Act Art. 10(3)',
      blocking: true,
    },
    {
      id: 'validity',
      name: 'Validity',
      description: 'Data must pass format and range validation',
      required: 90,
      actual: qualityData?.qualityRun?.validity_score 
        ? qualityData.qualityRun.validity_score * 100 
        : null,
      passed: qualityData?.qualityRun?.validity_score 
        ? qualityData.qualityRun.validity_score * 100 >= 90 
        : false,
      regulation: 'EU AI Act Art. 10(3)',
      blocking: true,
    },
    {
      id: 'bias_score',
      name: 'Bias Score',
      description: 'Dataset must have acceptable bias score (≥70%)',
      required: 70,
      actual: qualityData?.biasReport?.overall_bias_score 
        ? qualityData.biasReport.overall_bias_score * 100 
        : null,
      passed: qualityData?.biasReport?.overall_bias_score 
        ? qualityData.biasReport.overall_bias_score * 100 >= 70 
        : false,
      regulation: 'EU AI Act Art. 10(2)',
      blocking: true,
    },
    {
      id: 'anomalies',
      name: 'No Critical Anomalies',
      description: 'No unresolved critical anomalies',
      required: 0,
      actual: qualityData?.criticalAnomalies ?? null,
      passed: qualityData?.criticalAnomalies === 0,
      regulation: 'EU AI Act Art. 10(3)',
      blocking: true,
    },
    {
      id: 'overall',
      name: 'Overall Quality',
      description: 'Weighted quality score must be ≥80%',
      required: 80,
      actual: qualityData?.qualityRun?.overall_score 
        ? qualityData.qualityRun.overall_score * 100 
        : null,
      passed: qualityData?.qualityRun?.overall_score 
        ? qualityData.qualityRun.overall_score * 100 >= 80 
        : false,
      regulation: 'EU AI Act Art. 10',
      blocking: false,
    },
  ];

  const blockingGates = gates.filter(g => g.blocking);
  const passedBlocking = blockingGates.filter(g => g.passed).length;
  const allBlockingPassed = blockingGates.every(g => g.passed);
  const approvalReady = allBlockingPassed && gates.some(g => g.actual !== null);

  // Notify parent of approval readiness
  if (onApprovalReady && approvalReady !== undefined) {
    onApprovalReady(approvalReady);
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const noQualityData = gates.every(g => g.actual === null);

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Approval Quality Gates</CardTitle>
          </div>
          {showActions && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          )}
        </div>
        <CardDescription>
          All blocking gates must pass before dataset can be approved for AI use
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {noQualityData ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Quality Check Required</AlertTitle>
            <AlertDescription>
              Run a quality evaluation on this dataset before it can be approved for AI use.
              The evaluation will check completeness, validity, bias, and anomalies.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Progress Summary */}
            <div className={cn(
              'p-4 rounded-lg border-2',
              allBlockingPassed 
                ? 'bg-success/10 border-success/30' 
                : 'bg-warning/10 border-warning/30'
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {allBlockingPassed ? (
                    <>
                      <Unlock className="h-5 w-5 text-success" />
                      <span className="font-medium text-success">Ready for Approval</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5 text-warning" />
                      <span className="font-medium text-warning">
                        {passedBlocking}/{blockingGates.length} Blocking Gates Passed
                      </span>
                    </>
                  )}
                </div>
                <Badge variant={allBlockingPassed ? 'default' : 'secondary'}>
                  {allBlockingPassed ? 'APPROVED' : 'BLOCKED'}
                </Badge>
              </div>
              <Progress 
                value={(passedBlocking / blockingGates.length) * 100} 
                className={cn(
                  'h-2',
                  allBlockingPassed ? '[&>div]:bg-success' : '[&>div]:bg-warning'
                )}
              />
            </div>

            {/* Individual Gates */}
            <div className="space-y-2">
              {gates.map((gate) => (
                <div 
                  key={gate.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    gate.passed 
                      ? 'bg-success/5 border-success/20' 
                      : gate.actual === null 
                        ? 'bg-muted/30 border-muted' 
                        : 'bg-destructive/5 border-destructive/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {gate.passed ? (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    ) : gate.actual === null ? (
                      <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{gate.name}</span>
                        {gate.blocking && (
                          <Badge variant="outline" className="text-xs">Blocking</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{gate.description}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={cn(
                      'font-mono font-bold',
                      gate.passed ? 'text-success' : gate.actual === null ? 'text-muted-foreground' : 'text-destructive'
                    )}>
                      {gate.actual !== null 
                        ? gate.id === 'anomalies' 
                          ? gate.actual.toString() 
                          : `${gate.actual.toFixed(1)}%`
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Required: {gate.id === 'anomalies' ? '= 0' : `≥ ${gate.required}%`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Regulation Reference */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <Scale className="h-3.5 w-3.5" />
              <span>Compliance: EU AI Act Article 10 (Data and Data Governance)</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
