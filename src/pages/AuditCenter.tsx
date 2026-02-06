import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  FileText,
  Database,
  Brain,
  AlertTriangle,
  Clock,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  History,
  Scale,
  Hash,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';

interface AuditEvent {
  id: string;
  action_type: string;
  table_name: string;
  record_id: string | null;
  change_summary: string | null;
  performed_at: string;
  performed_by: string | null;
  record_hash: string | null;
  previous_hash: string | null;
}

function TimelineTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');

  const { data: events, isLoading } = useQuery({
    queryKey: ['audit-timeline', tableFilter],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_log')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(200);

      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditEvent[];
    },
  });

  const filteredEvents = events?.filter(e => 
    !searchQuery || 
    e.change_summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.table_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Badge className="bg-success/10 text-success border-success/30">CREATE</Badge>;
      case 'UPDATE':
        return <Badge className="bg-warning/10 text-warning border-warning/30">UPDATE</Badge>;
      case 'DELETE':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">DELETE</Badge>;
      case 'LOCK':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">LOCK</Badge>;
      case 'UNLOCK':
        return <Badge className="bg-success/10 text-success border-success/30">UNLOCK</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by table" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            <SelectItem value="systems">Systems</SelectItem>
            <SelectItem value="models">Models</SelectItem>
            <SelectItem value="datasets">Datasets</SelectItem>
            <SelectItem value="system_approvals">Approvals</SelectItem>
            <SelectItem value="incidents">Incidents</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredEvents?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No audit events found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents?.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm">
                      {format(new Date(event.performed_at), 'MMM d, HH:mm:ss')}
                    </TableCell>
                    <TableCell>{getActionBadge(event.action_type)}</TableCell>
                    <TableCell className="font-mono text-xs">{event.table_name}</TableCell>
                    <TableCell className="max-w-md truncate">{event.change_summary || '—'}</TableCell>
                    <TableCell>
                      {event.record_hash && (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {event.record_hash.substring(0, 8)}...
                        </code>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}

function DataGovernanceTab() {
  const { data: qualityRuns, isLoading: loadingQuality } = useQuery({
    queryKey: ['audit-quality-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dataset_quality_runs')
        .select('*, datasets(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: approvals, isLoading: loadingApprovals } = useQuery({
    queryKey: ['audit-dataset-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('datasets')
        .select('id, name, ai_approval_status, ai_approved_at, version')
        .not('ai_approved_at', 'is', null)
        .order('ai_approved_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Quality Evaluations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {loadingQuality ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !qualityRuns?.length ? (
              <p className="text-center py-8 text-muted-foreground">No quality runs</p>
            ) : (
              <div className="space-y-2">
                {qualityRuns.map((run: any) => (
                  <div key={run.id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{run.datasets?.name || 'Unknown'}</span>
                      <Badge variant={run.verdict === 'PASS' ? 'default' : 'destructive'}>
                        {run.verdict}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{format(new Date(run.created_at), 'MMM d, HH:mm')}</span>
                      <span>•</span>
                      <span>{((run.overall_score || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            AI Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {loadingApprovals ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !approvals?.length ? (
              <p className="text-center py-8 text-muted-foreground">No approvals</p>
            ) : (
              <div className="space-y-2">
                {approvals.map((dataset: any) => (
                  <div key={dataset.id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{dataset.name}</span>
                      <Badge className="bg-success/10 text-success border-success/30">
                        v{dataset.version || '1.0'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Approved {format(new Date(dataset.ai_approved_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function ModelGovernanceTab() {
  const { data: models, isLoading } = useQuery({
    queryKey: ['audit-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('models')
        .select('id, name, version, status, risk_classification, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: evaluations, isLoading: loadingEvals } = useQuery({
    queryKey: ['audit-evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_runs')
        .select('*, models(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Model Registry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !models?.length ? (
              <p className="text-center py-8 text-muted-foreground">No models registered</p>
            ) : (
              <div className="space-y-2">
                {models.map((model: any) => (
                  <div key={model.id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{model.name}</span>
                      <Badge variant="outline">{model.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>v{model.version}</span>
                      <span>•</span>
                      <span>{model.risk_classification || 'Unclassified'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Evaluations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {loadingEvals ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !evaluations?.length ? (
              <p className="text-center py-8 text-muted-foreground">No evaluations</p>
            ) : (
              <div className="space-y-2">
                {evaluations.map((evaluation: any) => (
                  <div key={evaluation.id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{evaluation.models?.name || 'Unknown'}</span>
                      <Badge variant={evaluation.status === 'completed' ? 'default' : 'secondary'}>
                        {evaluation.engine_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{format(new Date(evaluation.created_at), 'MMM d, HH:mm')}</span>
                      <span>•</span>
                      <span>{((evaluation.overall_score || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function IncidentsTab() {
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['audit-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-destructive/10 text-destructive border-destructive/30',
      high: 'bg-warning/10 text-warning border-warning/30',
      medium: 'bg-primary/10 text-primary border-primary/30',
      low: 'bg-muted text-muted-foreground',
    };
    return <Badge className={colors[severity] || colors.low}>{severity}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Incident History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : !incidents?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No incidents recorded
                  </TableCell>
                </TableRow>
              ) : (
                incidents.map((incident: any) => (
                  <TableRow key={incident.id}>
                    <TableCell className="text-sm">
                      {format(new Date(incident.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{incident.title}</TableCell>
                    <TableCell className="text-xs">{incident.incident_type}</TableCell>
                    <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                    <TableCell>
                      <Badge variant={incident.status === 'resolved' ? 'default' : 'secondary'}>
                        {incident.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ReportsTab() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['audit-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_report_ledger')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generated Reports
        </CardTitle>
        <CardDescription>
          Regulatory compliance reports with cryptographic verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : !reports?.length ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No reports generated yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report: any) => (
              <div key={report.id} className="p-4 bg-muted/30 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{report.report_type}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generated {format(new Date(report.generated_at), 'MMM d, yyyy HH:mm')}
                  </p>
                  {report.record_hash && (
                    <code className="text-xs bg-muted px-1 py-0.5 rounded mt-2 inline-block">
                      SHA-256: {report.record_hash.substring(0, 16)}...
                    </code>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={report.verification_status === 'verified' ? 'default' : 'secondary'}>
                    {report.verification_status || 'Pending'}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AuditCenter() {
  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const [auditCount, incidentCount, approvalCount] = await Promise.all([
        supabase.from('admin_audit_log').select('*', { count: 'exact', head: true }).gte('performed_at', thirtyDaysAgo),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
        supabase.from('datasets').select('*', { count: 'exact', head: true }).not('ai_approved_at', 'is', null),
      ]);

      return {
        auditEvents: auditCount.count || 0,
        incidents: incidentCount.count || 0,
        approvals: approvalCount.count || 0,
      };
    },
  });

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Audit Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Consolidated governance audit trail with cryptographic verification
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            EU AI Act Compliant
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.auditEvents || 0}</p>
                <p className="text-sm text-muted-foreground">Audit Events (30d)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.incidents || 0}</p>
                <p className="text-sm text-muted-foreground">Incidents (30d)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.approvals || 0}</p>
                <p className="text-sm text-muted-foreground">AI Approvals</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              Data Governance
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-1">
              <Brain className="h-4 w-4" />
              Model Governance
            </TabsTrigger>
            <TabsTrigger value="incidents" className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Incidents
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <TimelineTab />
          </TabsContent>
          <TabsContent value="data">
            <DataGovernanceTab />
          </TabsContent>
          <TabsContent value="models">
            <ModelGovernanceTab />
          </TabsContent>
          <TabsContent value="incidents">
            <IncidentsTab />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
