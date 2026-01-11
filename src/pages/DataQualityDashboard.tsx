import { useState } from 'react';
import { 
  FileCheck, AlertTriangle, Clock, TrendingUp, 
  File, CheckCircle2, XCircle, Loader2, AlertCircle,
  RefreshCw, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploadCard } from '@/components/data/FileUploadCard';
import { useAllUploads, useQualityStats, useFileUploadStatus, QualityIssue } from '@/hooks/useFileUploadStatus';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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
          <div className={`p-3 rounded-full ${trend === 'up' ? 'bg-green-500/10' : trend === 'down' ? 'bg-red-500/10' : 'bg-primary/10'}`}>
            <Icon className={`h-5 w-5 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Complete</Badge>;
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
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Warning</Badge>;
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
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p>No quality issues detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <div key={issue.id} className="flex items-start gap-3 p-3 border rounded-lg">
          {issue.severity === 'critical' ? (
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          ) : issue.severity === 'warning' ? (
            <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back to list
        </Button>
        <StatusBadge status={status.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            {status.file_name}
          </CardTitle>
          <CardDescription>
            Uploaded {format(new Date(status.created_at), 'MMMM d, yyyy HH:mm')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Quality Score</p>
              <p className="text-2xl font-bold">{status.quality_score ?? '-'}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rows</p>
              <p className="text-2xl font-bold">{status.parsed_row_count ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Columns</p>
              <p className="text-2xl font-bold">{status.parsed_column_count ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Processing Time</p>
              <p className="text-2xl font-bold">{status.processing_time_ms ?? '-'}ms</p>
            </div>
          </div>

          {status.metadata && typeof status.metadata === 'object' && (
            <div className="grid grid-cols-4 gap-2 mb-6">
              {['completeness', 'validity', 'uniqueness', 'freshness'].map((metric) => {
                const value = (status.metadata as any)?.metrics?.[metric];
                return (
                  <div key={metric} className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground capitalize">{metric}</p>
                    <p className="text-lg font-semibold">
                      {value !== undefined ? `${Math.round(value * 100)}%` : '-'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {status.error_message && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-6">
              <p className="text-sm text-destructive">{status.error_message}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
          <h1 className="text-3xl font-bold">Data Quality Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time file quality auditing with semantic analysis
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
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
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
