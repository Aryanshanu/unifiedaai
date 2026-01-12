import { useState } from 'react';
import { 
  FileCheck, AlertTriangle, Clock, TrendingUp, 
  File, CheckCircle2, XCircle, Loader2, AlertCircle,
  RefreshCw, ArrowLeft, Wrench, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploadCard } from '@/components/data/FileUploadCard';
import { useAllUploads, useQualityStats, useFileUploadStatus, QualityIssue } from '@/hooks/useFileUploadStatus';
import { format } from 'date-fns';

// Transparency components
import { InputOutputScope } from '@/components/engines/InputOutputScope';
import { MetricWeightGrid, WeightedMetric } from '@/components/engines/MetricWeightGrid';
import { ComputationBreakdown } from '@/components/engines/ComputationBreakdown';
import { RawDataLog } from '@/components/engines/RawDataLog';
import { EvidencePackage } from '@/components/engines/EvidencePackage';
import { ColumnAnalysisGrid } from '@/components/engines/ColumnAnalysisGrid';
import { AISummaryPanel } from '@/components/engines/AISummaryPanel';

// New Trust Engine components
import { TrustGrade, TrustGradeBadge } from '@/components/engines/TrustGrade';
import { QualityTrendChart } from '@/components/engines/QualityTrendChart';
import { RemediationActionCenter } from '@/components/engines/RemediationActionCenter';
import { ContractGatekeeperBadge } from '@/components/engines/ContractGatekeeperBadge';
import { useQualityTrend } from '@/hooks/useQualityTrend';
import { useRemediationActions } from '@/hooks/useRemediationActions';

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  loading 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  trend?: 'up' | 'down';
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${trend === 'up' ? 'bg-success/10' : trend === 'down' ? 'bg-danger/10' : 'bg-primary/10'}`}>
            <Icon className={`h-5 w-5 ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Complete</Badge>;
    case 'failed':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
    case 'processing':
    case 'analyzing':
      return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> {status}</Badge>;
    default:
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">Critical</Badge>;
    case 'warning':
      return <Badge className="bg-warning/10 text-warning border-warning/20">Warning</Badge>;
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
}

function UploadRow({ upload, onSelect }: { upload: any; onSelect: (id: string) => void }) {
  const contractStatus = upload.contract_check_status as 'pending' | 'passed' | 'failed' | 'skipped' | null;
  
  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onSelect(upload.id)}
    >
      <div className="flex items-center gap-3">
        <File className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{upload.file_name}</p>
            {contractStatus && contractStatus !== 'skipped' && (
              <ContractGatekeeperBadge 
                status={contractStatus} 
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(upload.created_at), 'MMM d, HH:mm')}
            {upload.parsed_row_count && ` • ${upload.parsed_row_count} rows`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {upload.status === 'completed' && upload.quality_score !== null && (
          <div className="text-right">
            <Progress 
              value={upload.quality_score} 
              className="w-16 h-2"
            />
            <span className="text-xs text-muted-foreground">{upload.quality_score}%</span>
          </div>
        )}
        <StatusBadge status={upload.status} />
      </div>
    </div>
  );
}

function IssuesList({ issues }: { issues: QualityIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
        <p>No quality issues detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <div key={issue.id} className="flex items-start gap-3 p-3 border rounded-lg">
          {issue.severity === 'critical' ? (
            <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          ) : issue.severity === 'warning' ? (
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <SeverityBadge severity={issue.severity} />
              <Badge variant="outline">{issue.issue_type}</Badge>
              {issue.column_name && (
                <span className="text-xs text-muted-foreground">Column: {issue.column_name}</span>
              )}
              {issue.row_reference && (
                <span className="text-xs text-muted-foreground">Row: {issue.row_reference}</span>
              )}
            </div>
            <p className="text-sm">{issue.description}</p>
            {issue.suggested_fix && (
              <p className="text-xs text-muted-foreground mt-1">
                💡 {issue.suggested_fix}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function UploadDetail({ uploadId, onBack }: { uploadId: string; onBack: () => void }) {
  const { status, issues, loading } = useFileUploadStatus(uploadId);
  const { actions, executeAction, executeAllSafe, revertAction, loading: actionsLoading } = useRemediationActions(uploadId);

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const analysisDetails = status.analysis_details;

  const metadata = status.metadata as {
    metrics?: {
      completeness: number;
      validity: number;
      uniqueness: number;
      freshness: number;
      overall: number;
    };
    issue_count?: number;
  } | null;

  const weightedMetrics: WeightedMetric[] = metadata?.metrics ? [
    { key: 'completeness', name: 'Completeness', score: Math.round(metadata.metrics.completeness * 100), weight: 0.25, description: 'Percentage of non-null values' },
    { key: 'validity', name: 'Validity', score: Math.round(metadata.metrics.validity * 100), weight: 0.30, description: 'Schema and format compliance' },
    { key: 'uniqueness', name: 'Uniqueness', score: Math.round(metadata.metrics.uniqueness * 100), weight: 0.20, description: 'Duplicate detection' },
    { key: 'freshness', name: 'Freshness', score: Math.round(metadata.metrics.freshness * 100), weight: 0.25, description: 'Data recency validation' },
  ] : [];

  const computationSteps = analysisDetails?.computation_steps?.map((step: any) => ({
    step: step.step,
    name: step.name,
    formula: step.formula,
    inputs: step.inputs,
    result: typeof step.result === 'number' ? `${step.result}%` : step.result,
    status: step.status,
    threshold: step.threshold,
    weight: step.weight,
    explanation: step.whyExplanation,
  })) || [];

  const rawLogs = analysisDetails?.raw_logs?.map((log: any) => ({
    id: log.id,
    timestamp: log.timestamp,
    type: log.type,
    data: log.data,
    metadata: log.metadata,
  })) || [];

  const overallScore = status.quality_score || 0;
  const isCompliant = overallScore >= 70;
  const contractStatus = status.contract_check_status as 'pending' | 'passed' | 'failed' | 'skipped' | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to list
        </Button>
        <div className="flex items-center gap-2">
          {contractStatus && contractStatus !== 'skipped' && (
            <ContractGatekeeperBadge status={contractStatus} />
          )}
          <StatusBadge status={status.status} />
        </div>
      </div>

      {/* Input/Output Scope */}
      <InputOutputScope
        scope="BOTH"
        inputDescription={`Raw ${status.file_type?.toUpperCase() || 'data'} file: ${status.file_name} (${status.parsed_row_count || 0} rows, ${status.parsed_column_count || 0} columns)`}
        outputDescription="Quality scores, column statistics, computation breakdown, issue detection, and evidence package"
      />

      {/* Trust Grade + File Info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
          <Card className="h-full flex items-center justify-center p-6">
            <TrustGrade 
              score={overallScore} 
              showTrend={true}
              size="lg"
            />
          </Card>
        </div>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              {status.file_name}
            </CardTitle>
            <CardDescription>
              Uploaded {format(new Date(status.created_at), 'MMMM d, yyyy HH:mm')} • 
              Processing time: {status.processing_time_ms || 0}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Quality Score</p>
                <p className="text-2xl font-bold">{status.quality_score ?? '-'}%</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Rows</p>
                <p className="text-2xl font-bold">{status.parsed_row_count ?? '-'}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Columns</p>
                <p className="text-2xl font-bold">{status.parsed_column_count ?? '-'}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold">{issues.length}</p>
              </div>
            </div>

            {status.error_message && (
              <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                <p className="text-sm text-danger">{status.error_message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metric Weight Grid */}
      {weightedMetrics.length > 0 && (
        <MetricWeightGrid
          metrics={weightedMetrics}
          overallScore={overallScore}
          engineName="Data Quality"
          formula="0.25×Comp + 0.30×Valid + 0.20×Uniq + 0.25×Fresh"
          complianceThreshold={70}
        />
      )}

      {/* AI Summary Panel */}
      {analysisDetails?.ai_summary && (
        <AISummaryPanel summary={analysisDetails.ai_summary} />
      )}

      {/* Remediation Action Center */}
      {actions.length > 0 && (
        <RemediationActionCenter 
          actions={actions}
          onExecute={executeAction}
          onExecuteAll={executeAllSafe}
          onRevert={revertAction}
          loading={actionsLoading}
        />
      )}

      {/* Column Analysis */}
      {analysisDetails?.column_analysis && analysisDetails.column_analysis.length > 0 && (
        <ColumnAnalysisGrid 
          columns={analysisDetails.column_analysis}
          showDetails={true}
        />
      )}

      {/* Computation Breakdown */}
      {computationSteps.length > 0 && (
        <ComputationBreakdown
          steps={computationSteps}
          overallScore={overallScore}
          weightedFormula="0.25×Completeness + 0.30×Validity + 0.20×Uniqueness + 0.25×Freshness"
          engineType="data-quality"
          euAIActReference="EU AI Act Article 10 - Data Quality Requirements"
        />
      )}

      {/* Raw Data Logs */}
      {rawLogs.length > 0 && (
        <RawDataLog logs={rawLogs} />
      )}

      {/* Evidence Package */}
      <EvidencePackage
        mode="full"
        data={{
          results: {
            quality_score: overallScore,
            metrics: metadata?.metrics,
            column_count: status.parsed_column_count,
            row_count: status.parsed_row_count,
            issue_count: issues.length,
          },
          rawLogs: rawLogs,
          modelId: status.id,
          evaluationType: 'data-quality',
          overallScore: overallScore,
          isCompliant: isCompliant,
          complianceThreshold: 70,
          weightedFormula: '0.25×Comp + 0.30×Valid + 0.20×Uniq + 0.25×Fresh',
          weightedMetrics: metadata?.metrics ? {
            completeness: metadata.metrics.completeness,
            validity: metadata.metrics.validity,
            uniqueness: metadata.metrics.uniqueness,
            freshness: metadata.metrics.freshness,
          } : undefined,
        }}
      />

      {/* Quality Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Quality Issues ({issues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IssuesList issues={issues} />
        </CardContent>
      </Card>
    </div>
  );
}

// Action Center Summary for Dashboard
function ActionCenterSummary({ uploads, onSelectUpload }: { uploads: any[]; onSelectUpload: (id: string) => void }) {
  const issueUploads = uploads
    .filter(u => u.status === 'completed')
    .map(u => {
      const meta = u.metadata as any;
      return { ...u, issueCount: meta?.issue_count || 0 };
    })
    .filter(u => u.issueCount > 0)
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 5);

  const totalIssues = issueUploads.reduce((acc, u) => acc + u.issueCount, 0);

  if (issueUploads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Action Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
            <p>No pending fixes</p>
            <p className="text-sm">All files passed quality checks</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Action Center
          </CardTitle>
          <Badge variant="outline">{totalIssues} pending fixes</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {issueUploads.map((upload) => (
            <div 
              key={upload.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onSelectUpload(upload.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  upload.issueCount > 10 ? 'bg-danger/10' : 
                  upload.issueCount > 5 ? 'bg-warning/10' : 'bg-muted'
                }`}>
                  <AlertTriangle className={`h-4 w-4 ${
                    upload.issueCount > 10 ? 'text-danger' : 
                    upload.issueCount > 5 ? 'text-warning' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-sm">{upload.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {upload.issueCount} issues • Score: {upload.quality_score}%
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                Fix
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DataQualityDashboard() {
  const { stats, loading: statsLoading } = useQualityStats();
  const { uploads, loading: uploadsLoading, refetch } = useAllUploads();
  const { data: trendData } = useQualityTrend();
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);

  // Calculate week-over-week change
  const weekChange = trendData.length >= 2 
    ? trendData[trendData.length - 1].score - trendData[0].score 
    : 0;

  // Count files passed vs need attention
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const passedCount = completedUploads.filter(u => (u.quality_score || 0) >= 70).length;
  const needsAttentionCount = completedUploads.filter(u => (u.quality_score || 0) < 70).length;

  if (selectedUploadId) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <UploadDetail 
          uploadId={selectedUploadId} 
          onBack={() => setSelectedUploadId(null)} 
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Quality Engine</h1>
          <p className="text-muted-foreground">
            Enterprise Data Governance Platform with agentic capabilities
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Trust Signal Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Trust Grade */}
        <Card className="lg:col-span-1 flex items-center justify-center p-6">
          <TrustGrade 
            score={stats.avgScore} 
            showTrend={true}
            previousScore={trendData.length >= 2 ? trendData[0].score : undefined}
            size="lg"
          />
        </Card>

        {/* Quality Trend + Stats */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Quality Trend</CardTitle>
              <Badge variant={weekChange >= 0 ? 'default' : 'destructive'}>
                {weekChange >= 0 ? '+' : ''}{weekChange.toFixed(1)}% this week
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <QualityTrendChart 
                data={trendData} 
                showCard={false}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {passedCount} files passed
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-danger" />
                  {needsAttentionCount} need attention
                </span>
              </div>
              <span className="text-muted-foreground">
                {stats.totalFiles} total files
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Files" 
          value={stats.totalFiles} 
          icon={FileCheck}
          loading={statsLoading}
        />
        <StatCard 
          title="Processing" 
          value={stats.processing} 
          icon={Clock}
          loading={statsLoading}
        />
        <StatCard 
          title="Average Score" 
          value={`${stats.avgScore}%`} 
          icon={TrendingUp}
          trend={stats.avgScore >= 80 ? 'up' : 'down'}
          loading={statsLoading}
        />
        <StatCard 
          title="Critical Issues" 
          value={stats.criticalIssues} 
          icon={AlertTriangle}
          trend={stats.criticalIssues > 0 ? 'down' : 'up'}
          loading={statsLoading}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="uploads">All Uploads</TabsTrigger>
          <TabsTrigger value="actions">Action Center</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Card */}
            <div className="lg:col-span-1">
              <FileUploadCard 
                onUploadComplete={(id) => setSelectedUploadId(id)}
              />
            </div>

            {/* Action Center Summary */}
            <div className="lg:col-span-2">
              <ActionCenterSummary 
                uploads={uploads} 
                onSelectUpload={setSelectedUploadId}
              />
            </div>
          </div>

          {/* Recent Uploads */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
              <CardDescription>Real-time status of uploaded files with contract validation</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {uploadsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : uploads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileCheck className="h-8 w-8 mx-auto mb-2" />
                    <p>No files uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {uploads.slice(0, 10).map((upload) => (
                      <UploadRow 
                        key={upload.id} 
                        upload={upload} 
                        onSelect={setSelectedUploadId}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uploads">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Uploads</CardTitle>
                  <CardDescription>Complete history of uploaded files</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Shield className="h-3 w-3 mr-1" />
                    Contract Gatekeeper Active
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {uploadsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {uploads.map((upload) => (
                      <UploadRow 
                        key={upload.id} 
                        upload={upload} 
                        onSelect={setSelectedUploadId}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <ActionCenterSummary 
                uploads={uploads} 
                onSelectUpload={setSelectedUploadId}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quality Insights
                </CardTitle>
                <CardDescription>
                  Files with detected issues requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {needsAttentionCount === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                    <p>All files passed quality checks</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedUploads
                      .filter(u => (u.quality_score || 0) < 70)
                      .slice(0, 5)
                      .map((upload) => (
                        <div 
                          key={upload.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => setSelectedUploadId(upload.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm truncate">{upload.file_name}</span>
                            <TrustGradeBadge score={upload.quality_score || 0} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={upload.quality_score || 0} className="flex-1 h-2" />
                            <span className="text-xs text-muted-foreground">{upload.quality_score}%</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
