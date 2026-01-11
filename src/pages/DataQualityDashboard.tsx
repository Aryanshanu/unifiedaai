import { useState } from 'react';
import { 
  FileCheck, AlertTriangle, Clock, TrendingUp, 
  File, CheckCircle2, XCircle, Loader2, AlertCircle,
  RefreshCw, ArrowLeft, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUploadCard } from '@/components/data/FileUploadCard';
import { useAllUploads, useQualityStats, useFileUploadStatus, QualityIssue } from '@/hooks/useFileUploadStatus';
import { format } from 'date-fns';

// Transparency components
import { InputOutputScope } from '@/components/engines/InputOutputScope';
import { MetricWeightGrid, WeightedMetric } from '@/components/engines/MetricWeightGrid';
import { ComputationBreakdown } from '@/components/engines/ComputationBreakdown';
import { RawDataLog } from '@/components/engines/RawDataLog';
import { EvidencePackage } from '@/components/engines/EvidencePackage';
import { ColumnAnalysisGrid, ColumnAnalysis } from '@/components/engines/ColumnAnalysisGrid';
import { AISummaryPanel } from '@/components/engines/AISummaryPanel';

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
  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onSelect(upload.id)}
    >
      <div className="flex items-center gap-3">
        <File className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">{upload.file_name}</p>
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

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Extract analysis details - now properly typed
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

  // Build weighted metrics for MetricWeightGrid
  const weightedMetrics: WeightedMetric[] = metadata?.metrics ? [
    { key: 'completeness', name: 'Completeness', score: Math.round(metadata.metrics.completeness * 100), weight: 0.25, description: 'Percentage of non-null values' },
    { key: 'validity', name: 'Validity', score: Math.round(metadata.metrics.validity * 100), weight: 0.30, description: 'Schema and format compliance' },
    { key: 'uniqueness', name: 'Uniqueness', score: Math.round(metadata.metrics.uniqueness * 100), weight: 0.20, description: 'Duplicate detection' },
    { key: 'freshness', name: 'Freshness', score: Math.round(metadata.metrics.freshness * 100), weight: 0.25, description: 'Data recency validation' },
  ] : [];

  // Transform computation steps for ComputationBreakdown
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

  // Transform raw logs
  const rawLogs = analysisDetails?.raw_logs?.map((log: any) => ({
    id: log.id,
    timestamp: log.timestamp,
    type: log.type,
    data: log.data,
    metadata: log.metadata,
  })) || [];

  const overallScore = status.quality_score || 0;
  const isCompliant = overallScore >= 70;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to list
        </Button>
        <StatusBadge status={status.status} />
      </div>

      {/* Input/Output Scope */}
      <InputOutputScope
        scope="BOTH"
        inputDescription={`Raw ${status.file_type?.toUpperCase() || 'data'} file: ${status.file_name} (${status.parsed_row_count || 0} rows, ${status.parsed_column_count || 0} columns)`}
        outputDescription="Quality scores, column statistics, computation breakdown, issue detection, and evidence package"
      />

      {/* File Info Card */}
      <Card>
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

export default function DataQualityDashboard() {
  const { stats, loading: statsLoading } = useQualityStats();
  const { uploads, loading: uploadsLoading, refetch } = useAllUploads();
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);

  const recentIssues = uploads
    .filter(u => u.status === 'completed')
    .flatMap(u => {
      const meta = u.metadata as any;
      return meta?.issue_count > 0 ? [{ ...u, issueCount: meta.issue_count }] : [];
    })
    .slice(0, 5);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Quality Engine</h1>
          <p className="text-muted-foreground">
            Governance-grade file quality auditing with transparent scoring
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-1">
          <FileUploadCard 
            onUploadComplete={(id) => setSelectedUploadId(id)}
          />
        </div>

        {/* Recent Uploads */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
              <CardDescription>Real-time status of uploaded files</CardDescription>
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
        </div>
      </div>

      {/* Quality Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Insights</CardTitle>
          <CardDescription>
            Files with detected issues requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentIssues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
              <p>All files passed quality checks</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentIssues.map((item: any) => (
                <div 
                  key={item.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedUploadId(item.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate">{item.file_name}</span>
                    <Badge variant="outline">{item.issueCount} issues</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.quality_score || 0} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">{item.quality_score}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
