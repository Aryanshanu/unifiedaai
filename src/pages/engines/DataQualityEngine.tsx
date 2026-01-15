import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Database, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  BarChart3,
  FileCheck,
  Loader2,
  Upload,
  History,
  TrendingUp,
  FileText,
  Clock,
  Activity,
  Zap,
  RefreshCw
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
import { FileUploadCard } from '@/components/data/FileUploadCard';
import { AISummaryPanel, AISummary } from '@/components/engines/AISummaryPanel';
import { ColumnAnalysisGrid, ColumnAnalysis } from '@/components/engines/ColumnAnalysisGrid';
import { QualityTrendChart } from '@/components/engines/QualityTrendChart';
import { RemediationActionCenter, RemediationAction } from '@/components/engines/RemediationActionCenter';
import { DQPipelineVisualizer } from '@/components/engines/DQPipelineVisualizer';
import { DQFileUploader } from '@/components/engines/DQFileUploader';
import { DQProfilingReport } from '@/components/engines/DQProfilingReport';
import { DQRuleLibraryFull } from '@/components/engines/DQRuleLibraryFull';
import { DQExecutionReport } from '@/components/engines/DQExecutionReport';
import { DQDashboardAssetsFull } from '@/components/engines/DQDashboardAssetsFull';
import { DQIncidentsFull } from '@/components/engines/DQIncidentsFull';
import { useDQControlPlane } from '@/hooks/useDQControlPlane';
import { useFileUploadStatus, useAllUploads, useQualityStats, UploadStatus } from '@/hooks/useFileUploadStatus';
import { useQualityTrend } from '@/hooks/useQualityTrend';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

function QualityStatsCards() {
  const { stats, loading } = useQualityStats();

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalFiles}</p>
              <p className="text-xs text-muted-foreground">Total Files</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Activity className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.processing}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              stats.avgScore >= 80 ? "bg-success/10" : stats.avgScore >= 60 ? "bg-warning/10" : "bg-destructive/10"
            )}>
              <TrendingUp className={cn(
                "h-5 w-5",
                stats.avgScore >= 80 ? "text-success" : stats.avgScore >= 60 ? "text-warning" : "text-destructive"
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avgScore}%</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              stats.criticalIssues === 0 ? "bg-success/10" : "bg-destructive/10"
            )}>
              <AlertTriangle className={cn(
                "h-5 w-5",
                stats.criticalIssues === 0 ? "text-success" : "text-destructive"
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.criticalIssues}</p>
              <p className="text-xs text-muted-foreground">Critical Issues</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ImportTab() {
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const { status, issues } = useFileUploadStatus(currentUploadId);
  const { data: trendData } = useQualityTrend(10);
  const queryClient = useQueryClient();

  const handleUploadComplete = (uploadId: string) => {
    setCurrentUploadId(uploadId);
    queryClient.invalidateQueries({ queryKey: ['quality-stats'] });
    queryClient.invalidateQueries({ queryKey: ['all-uploads'] });
  };

  const analysisDetails = status?.analysis_details;
  const columnAnalysis = analysisDetails?.column_analysis as ColumnAnalysis[] | undefined;
  const aiSummary = analysisDetails?.ai_summary as AISummary | undefined;
  const computationSteps = analysisDetails?.computation_steps;
  const rawLogs = analysisDetails?.raw_logs;

  const remediationActions: RemediationAction[] = issues
    .filter(issue => issue.suggested_fix)
    .map(issue => ({
      id: issue.id,
      upload_id: issue.upload_id || '',
      issue_id: issue.id,
      action_type: 'NORMALIZE_FORMAT' as const,
      description: issue.suggested_fix || '',
      affected_rows: issue.row_reference ? 1 : 0,
      affected_columns: issue.column_name ? [issue.column_name] : undefined,
      safety_score: issue.severity === 'critical' ? 60 : issue.severity === 'warning' ? 80 : 95,
      reversible: true,
      status: issue.status === 'resolved' ? 'executed' as const : 'pending' as const,
      created_at: issue.created_at
    }));

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <FileUploadCard onUploadComplete={handleUploadComplete} />
        <QualityTrendChart data={trendData} />
      </div>

      {status?.status === 'completed' && (
        <div className="space-y-6">
          <Card className={cn(
            "border-2",
            status.quality_score && status.quality_score >= 80 
              ? "bg-success/5 border-success/30" 
              : status.quality_score && status.quality_score >= 60 
                ? "bg-warning/5 border-warning/30" 
                : "bg-destructive/5 border-destructive/30"
          )}>
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {status.quality_score && status.quality_score >= 70 ? (
                  <CheckCircle2 className="h-10 w-10 text-success" />
                ) : (
                  <XCircle className="h-10 w-10 text-destructive" />
                )}
                <div>
                  <div className="text-4xl font-bold">{status.quality_score}%</div>
                  <div className="text-muted-foreground">Overall Data Quality Score</div>
                </div>
              </div>
              <div className="text-right">
                <Badge className={cn(
                  status.quality_score && status.quality_score >= 80 
                    ? "bg-success/10 text-success border-success/20" 
                    : status.quality_score && status.quality_score >= 60 
                      ? "bg-warning/10 text-warning border-warning/20" 
                      : "bg-destructive/10 text-destructive border-destructive/20"
                )}>
                  {status.quality_score && status.quality_score >= 70 ? 'PASS' : 'FAIL'}
                </Badge>
                <div className="text-sm text-muted-foreground mt-2">
                  {status.parsed_row_count} rows • {status.parsed_column_count} cols • {status.processing_time_ms}ms
                </div>
              </div>
            </CardContent>
          </Card>

          {aiSummary && <AISummaryPanel summary={aiSummary} />}
          {columnAnalysis && columnAnalysis.length > 0 && (
            <ColumnAnalysisGrid columns={columnAnalysis} showDetails />
          )}
          {computationSteps && computationSteps.length > 0 && (
            <ComputationBreakdown 
              steps={computationSteps.map(step => ({
                step: step.step,
                name: step.name,
                formula: step.formula,
                inputs: step.inputs as Record<string, string | number>,
                result: String(step.result),
                status: step.status
              }))}
              overallScore={status.quality_score || 0}
              weightedFormula={analysisDetails?.weighted_formula || FORMULA}
              engineType="data_quality"
            />
          )}
          {remediationActions.length > 0 && (
            <RemediationActionCenter 
              actions={remediationActions}
              onExecute={async (actionId) => {
                await supabase
                  .from('quality_issues')
                  .update({ status: 'resolved' })
                  .eq('id', actionId);
              }}
            />
          )}
          {rawLogs && rawLogs.length > 0 && (
            <RawDataLog 
              logs={rawLogs.map(log => ({
                id: log.id,
                timestamp: log.timestamp,
                type: log.type as 'input' | 'output' | 'computation',
                data: log.data
              }))} 
            />
          )}
          <EvidencePackage 
            mode="download"
            data={{ 
              results: { 
                run_id: status.id, 
                metrics: analysisDetails?.weights || {}, 
                verdict: status.quality_score && status.quality_score >= 70 ? 'PASS' : 'FAIL',
                evidence: { hash: analysisDetails?.evidence_hash, timestamp: status.completed_at }
              },
              rawLogs: rawLogs || [],
              modelId: status.id,
              evaluationType: 'data_quality',
              overallScore: status.quality_score || 0,
              isCompliant: (status.quality_score || 0) >= 70,
              complianceThreshold: 70,
              weightedFormula: analysisDetails?.weighted_formula || FORMULA
            }} 
          />
        </div>
      )}

      {status && ['pending', 'processing', 'analyzing'].includes(status.status) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="font-medium mb-2">
              {status.status === 'analyzing' ? 'Analyzing data quality...' : 'Processing file...'}
            </p>
            <p className="text-sm text-muted-foreground">{status.file_name}</p>
          </CardContent>
        </Card>
      )}

      {!currentUploadId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Upload className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Upload a file to begin quality analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EvaluateTab() {
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [evaluationStatus, setEvaluationStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [result, setResult] = useState<QualityResult | null>(null);
  const [rawLogs, setRawLogs] = useState<Array<{ id: string; timestamp: string; type: 'input' | 'output' | 'computation'; data: Record<string, unknown> }>>([]);
  const queryClient = useQueryClient();

  const { data: datasets, isLoading: loadingDatasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('datasets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const runEvaluation = async () => {
    if (!selectedDataset) {
      toast.error('Please select a dataset');
      return;
    }

    setEvaluationStatus('running');
    setRawLogs([]);

    try {
      const { data, error } = await supabase.functions.invoke('eval-data-quality', {
        body: { dataset_id: selectedDataset, run_type: 'on_demand', check_contract: true }
      });

      if (error) throw error;
      setResult(data);
      setEvaluationStatus('complete');
      queryClient.invalidateQueries({ queryKey: ['dataset-quality-runs'] });

    } catch (error) {
      console.error('Data Quality evaluation error:', error);
      setEvaluationStatus('error');
      toast.error('Evaluation failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" />Evaluate Dataset</CardTitle>
          <CardDescription>Run quality evaluation on registered datasets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedDataset} onValueChange={setSelectedDataset}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={loadingDatasets ? "Loading..." : "Select dataset..."} />
              </SelectTrigger>
              <SelectContent>
                {datasets?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={runEvaluation} disabled={!selectedDataset || evaluationStatus === 'running'}>
              {evaluationStatus === 'running' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <><Play className="mr-2 h-4 w-4" />Run</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {evaluationStatus === 'running' && <EngineSkeleton />}

      {evaluationStatus === 'complete' && result && (
        <Card className={cn("border-2", result.verdict === 'PASS' ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30')}>
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {result.verdict === 'PASS' ? <CheckCircle2 className="h-8 w-8 text-success" /> : <XCircle className="h-8 w-8 text-destructive" />}
              <div>
                <div className="text-4xl font-bold">{(result.overall_score * 100).toFixed(1)}%</div>
                <div className="text-muted-foreground">Overall Data Quality</div>
              </div>
            </div>
            <Badge className={result.verdict === 'PASS' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>{result.verdict}</Badge>
          </CardContent>
        </Card>
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
  );
}

function HistoryTab() {
  const { uploads, loading } = useAllUploads();
  const [selectedUpload, setSelectedUpload] = useState<UploadStatus | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Upload History
          </CardTitle>
          <CardDescription>{uploads.length} total uploads</CardDescription>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No uploads yet.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {uploads.map(upload => (
                  <div 
                    key={upload.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedUpload?.id === upload.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    )}
                    onClick={() => setSelectedUpload(upload)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4" />
                      <div>
                        <p className="font-medium text-sm truncate max-w-[200px]">{upload.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(upload.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={upload.status === 'completed' ? 'default' : 'secondary'}>
                      {upload.quality_score ? `${upload.quality_score}%` : upload.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ControlPlaneTab() {
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: datasets, refetch: refetchDatasets } = useQuery({
    queryKey: ['datasets-for-control-plane'],
    queryFn: async () => {
      const { data, error } = await supabase.from('datasets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const {
    pipelineStatus,
    currentStep,
    stepStatuses,
    elapsedTime,
    profilingResult,
    rulesResult,
    executionResult,
    dashboardAssets,
    incidents,
    finalResponse,
    runPipeline,
    reset,
    isRealtimeConnected,
    acknowledgeIncident,
    resolveIncident,
    circuitBreakerState,
    continuePipeline,
    stopPipeline
  } = useDQControlPlane(selectedDataset);

  const handleDatasetCreated = (datasetId: string) => {
    setSelectedDataset(datasetId);
    setShowCreateForm(false);
    refetchDatasets();
  };

  const handleRunPipeline = (datasetId?: string) => {
    const id = datasetId || selectedDataset;
    if (!id) {
      toast.error('Please select a dataset');
      return;
    }
    runPipeline({
      dataset_id: id,
      execution_mode: 'FULL'
    });
  };

  return (
    <div className="space-y-6">
      {/* Dataset Selection & Create */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Dataset Configuration</CardTitle>
            <Button
              variant={showCreateForm ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '+ New Dataset'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCreateForm && (
            <DQFileUploader
              onDatasetCreated={handleDatasetCreated}
              onRunPipeline={handleRunPipeline}
              isRunning={pipelineStatus === 'running'}
            />
          )}

          {!showCreateForm && (
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Existing Dataset</label>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a dataset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets?.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name} ({ds.row_count?.toLocaleString() || 0} rows)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => handleRunPipeline()} 
                disabled={!selectedDataset || pipelineStatus === 'running'}
                className="gap-2"
              >
                {pipelineStatus === 'running' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run Pipeline
              </Button>
              {pipelineStatus !== 'idle' && (
                <Button variant="outline" onClick={reset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Visualizer */}
      <DQPipelineVisualizer
        currentStep={currentStep}
        stepStatuses={stepStatuses}
        pipelineStatus={pipelineStatus}
        elapsedTime={elapsedTime}
        isRealtimeConnected={isRealtimeConnected}
      />

      {/* STEP 1: Data Profiling - Full Width */}
      <DQProfilingReport 
        profile={profilingResult} 
        isLoading={currentStep === 1} 
      />

      {/* STEP 2: Rule Library - Full Width */}
      <DQRuleLibraryFull 
        rules={rulesResult} 
        isLoading={currentStep === 2} 
      />

      {/* STEP 3: Rule Execution - Full Width */}
      <DQExecutionReport 
        execution={executionResult} 
        isLoading={currentStep === 3}
        circuitBreakerState={circuitBreakerState}
        onContinue={continuePipeline}
        onStop={stopPipeline}
      />

      {/* STEP 4: Dashboard Assets - Full Width */}
      <DQDashboardAssetsFull 
        assets={dashboardAssets} 
        isLoading={currentStep === 4} 
      />

      {/* STEP 5: Incidents - Full Width */}
      <DQIncidentsFull
        incidents={incidents}
        isLoading={currentStep === 5}
        onAcknowledge={acknowledgeIncident}
        onResolve={resolveIncident}
      />

      {/* Raw JSON Response */}
      {finalResponse && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Pipeline Response (JSON)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(finalResponse, null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DataQualityEngineContent() {
  const [activeTab, setActiveTab] = useState('control-plane');

  return (
    <MainLayout title="Data Quality Engine">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8 text-primary" />
              Data Quality Engine
            </h1>
            <p className="text-muted-foreground mt-1">Governance-grade data quality evaluation with real-time analysis</p>
          </div>
          <Badge variant="outline">Phase 1: Data Governance</Badge>
        </div>

        <InputOutputScope scope="BOTH" inputDescription="File uploads, datasets, schema" outputDescription="Quality scores, AI analysis, evidence" />

        <QualityStatsCards />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="control-plane" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Control Plane
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="evaluate" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Evaluate
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="control-plane" className="mt-6">
            <ControlPlaneTab />
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <ImportTab />
          </TabsContent>

          <TabsContent value="evaluate" className="mt-6">
            <EvaluateTab />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <HistoryTab />
          </TabsContent>
        </Tabs>
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
