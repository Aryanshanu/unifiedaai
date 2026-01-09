import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  BarChart3,
  FileCheck,
  Loader2,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InputOutputScope } from '@/components/engines/InputOutputScope';
import { MetricWeightGrid } from '@/components/engines/MetricWeightGrid';
import { ComputationBreakdown } from '@/components/engines/ComputationBreakdown';
import { RawDataLog } from '@/components/engines/RawDataLog';
import { EvidencePackage } from '@/components/engines/EvidencePackage';
import { EngineSkeleton } from '@/components/engines/EngineSkeleton';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

const FORMULA = 'Overall = (Completeness × 0.25) + (Validity × 0.30) + (Uniqueness × 0.20) + (Freshness × 0.25)';

interface QualityResult {
  run_id: string;
  dataset_id: string;
  verdict: 'PASS' | 'WARN' | 'FAIL';
  overall_score: number;
  metrics: {
    completeness: { score: number; weight: number; details: Record<string, number> };
    validity: { score: number; weight: number; details: Record<string, number> };
    uniqueness: { score: number; weight: number; details: Record<string, number> };
    freshness: { score: number; weight: number; hours_old: number };
  };
  distribution_skew: Record<string, { skewness: number; kurtosis: number; severity: string }>;
  sensitive_balance: Record<string, Record<string, number>>;
  contract_violation: unknown | null;
  evidence: {
    hash: string;
    timestamp: string;
    sample_size: number;
    latency_ms: number;
  };
  formula: string;
  eu_ai_act_reference: string;
}

function DataQualityEngineContent() {
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [evaluationStatus, setEvaluationStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [result, setResult] = useState<QualityResult | null>(null);
  const [rawLogs, setRawLogs] = useState<Array<{ id: string; timestamp: string; type: string; data: Record<string, unknown> }>>([]);
  const queryClient = useQueryClient();

  const { data: datasets, isLoading: loadingDatasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('datasets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: pastRuns } = useQuery({
    queryKey: ['dataset-quality-runs', selectedDataset],
    queryFn: async () => {
      if (!selectedDataset) return [];
      const { data, error } = await supabase
        .from('dataset_quality_runs')
        .select('*')
        .eq('dataset_id', selectedDataset)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDataset
  });

  const runEvaluation = async () => {
    if (!selectedDataset) {
      toast.error('Please select a dataset');
      return;
    }

    setEvaluationStatus('running');
    setRawLogs([]);
    const startTime = Date.now();

    const addLog = (message: string, type: string = 'info') => {
      setRawLogs(prev => [...prev, { 
        id: crypto.randomUUID(), 
        timestamp: new Date().toISOString(), 
        type,
        data: { message }
      }]);
    };

    try {
      addLog('Initializing Data Quality Engine...');
      addLog(`Dataset ID: ${selectedDataset}`);

      const { data, error } = await supabase.functions.invoke('eval-data-quality', {
        body: { dataset_id: selectedDataset, run_type: 'on_demand', check_contract: true }
      });

      if (error) throw error;

      addLog(`Evaluation completed in ${Date.now() - startTime}ms`, 'success');
      addLog(`Verdict: ${data.verdict}`, data.verdict === 'PASS' ? 'success' : 'error');

      setResult(data);
      setEvaluationStatus('complete');
      queryClient.invalidateQueries({ queryKey: ['dataset-quality-runs'] });

    } catch (error) {
      console.error('Data Quality evaluation error:', error);
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setEvaluationStatus('error');
      toast.error('Evaluation failed');
    }
  };

  const getMetricsForGrid = () => {
    if (!result) return [];
    return [
      { key: 'completeness', name: 'Completeness', score: result.metrics.completeness.score * 100, weight: 25, description: 'Percentage of non-null values' },
      { key: 'validity', name: 'Validity', score: result.metrics.validity.score * 100, weight: 30, description: 'Values matching expected types' },
      { key: 'uniqueness', name: 'Uniqueness', score: result.metrics.uniqueness.score * 100, weight: 20, description: 'Ratio of unique values' },
      { key: 'freshness', name: 'Freshness', score: result.metrics.freshness.score * 100, weight: 25, description: 'Data recency' }
    ];
  };

  const getComputationSteps = () => {
    if (!result) return [];
    return [
      { stepNumber: 1, name: 'Completeness', formula: 'non_null / total', inputs: {}, result: `${(result.metrics.completeness.score * 100).toFixed(1)}%`, status: result.metrics.completeness.score >= 0.9 ? 'pass' as const : 'warn' as const },
      { stepNumber: 2, name: 'Validity', formula: 'valid_type / total', inputs: {}, result: `${(result.metrics.validity.score * 100).toFixed(1)}%`, status: result.metrics.validity.score >= 0.9 ? 'pass' as const : 'warn' as const },
      { stepNumber: 3, name: 'Uniqueness', formula: 'unique / total', inputs: {}, result: `${(result.metrics.uniqueness.score * 100).toFixed(1)}%`, status: result.metrics.uniqueness.score >= 0.8 ? 'pass' as const : 'warn' as const },
      { stepNumber: 4, name: 'Freshness', formula: '1 - age/threshold', inputs: {}, result: `${(result.metrics.freshness.score * 100).toFixed(1)}%`, status: result.metrics.freshness.score >= 0.9 ? 'pass' as const : 'warn' as const },
      { stepNumber: 5, name: 'Overall', formula: FORMULA, inputs: {}, result: `${(result.overall_score * 100).toFixed(1)}%`, status: result.verdict === 'PASS' ? 'pass' as const : 'fail' as const }
    ];
  };

  const getVerdictColor = () => {
    if (!result) return '';
    switch (result.verdict) {
      case 'PASS': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'WARN': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'FAIL': return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
  };

  return (
    <MainLayout title="Data Quality Engine">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8 text-primary" />
              Data Quality Engine
            </h1>
            <p className="text-muted-foreground mt-1">Governance-grade data quality evaluation</p>
          </div>
          <Badge variant="outline">Phase 1: Data Governance</Badge>
        </div>

        <InputOutputScope scope="BOTH" inputDescription="Dataset samples, schema" outputDescription="Quality scores with evidence" />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" />Evaluate Dataset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select dataset..." /></SelectTrigger>
                <SelectContent>
                  {datasets?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={runEvaluation} disabled={!selectedDataset || evaluationStatus === 'running'}>
                {evaluationStatus === 'running' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <><Play className="mr-2 h-4 w-4" />Run</>}
              </Button>
            </div>
            {pastRuns && pastRuns.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {pastRuns.slice(0, 5).map((run: any) => (
                  <Badge key={run.id} variant="outline" className={run.verdict === 'PASS' ? 'border-green-500/50' : 'border-red-500/50'}>
                    {run.verdict} - {(run.overall_score * 100).toFixed(0)}%
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {evaluationStatus === 'running' && <EngineSkeleton />}

        {evaluationStatus === 'complete' && result && (
          <div className="space-y-6">
            <Card className={`border-2 ${getVerdictColor()}`}>
              <CardContent className="pt-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {result.verdict === 'PASS' ? <CheckCircle2 className="h-8 w-8 text-green-500" /> : <XCircle className="h-8 w-8 text-red-500" />}
                  <div>
                    <div className="text-4xl font-bold">{(result.overall_score * 100).toFixed(1)}%</div>
                    <div className="text-muted-foreground">Overall Data Quality</div>
                  </div>
                </div>
                <Badge className={getVerdictColor()}>{result.verdict}</Badge>
              </CardContent>
            </Card>

            {result.contract_violation && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Contract Violation</AlertTitle>
                <AlertDescription>This dataset violates its data contract.</AlertDescription>
              </Alert>
            )}

            <MetricWeightGrid metrics={getMetricsForGrid()} overallScore={result.overall_score * 100} engineName="Data Quality" formula={FORMULA} />
            <ComputationBreakdown steps={getComputationSteps()} overallScore={result.overall_score * 100} weightedFormula={FORMULA} engineType="data_quality" euAIActReference={result.eu_ai_act_reference} />
            <RawDataLog logs={rawLogs} />
            <EvidencePackage hash={result.evidence.hash} timestamp={result.evidence.timestamp} data={{ run_id: result.run_id, metrics: result.metrics, verdict: result.verdict }} />
          </div>
        )}

        {evaluationStatus === 'idle' && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12">
              <Database className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Select a dataset and run evaluation</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

export default function DataQualityEngine() {
  return (
    <ErrorBoundary>
      <DataQualityEngineContent />
    </ErrorBoundary>
  );
}
