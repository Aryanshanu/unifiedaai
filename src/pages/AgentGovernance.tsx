import { useState } from 'react';
import { formatModelName, getModelProvider } from '@/lib/utils';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAgents, useAgentTraces, useCreateAgent, type AIAgent } from '@/hooks/useAgents';
import { useModels } from '@/hooks/useModels';
import { useSystems } from '@/hooks/useSystems';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bot, Plus, Activity, ShieldAlert, Eye, Clock, AlertTriangle,
  CheckCircle, XCircle, Zap, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const DEMO_AGENTS = [
  {
    name: 'Customer Support Controller',
    agent_type: 'conversational',
    description: 'Handles tier-1 customer queries, escalates to human agents when confidence is low.',
    status: 'active',
    risk_tier: 'medium',
    max_autonomy_level: 'supervised',
    environment: 'production',
    trace_enabled: true,
    capabilities: ['query_resolution', 'escalation', 'sentiment_analysis'],
    permissions: ['read_customer_data', 'create_tickets'],
  },
  {
    name: 'Fraud Detection Controller',
    agent_type: 'autonomous',
    description: 'Real-time transaction analysis and anomaly flagging with auto-block on high-risk signals.',
    status: 'active',
    risk_tier: 'high',
    max_autonomy_level: 'human_in_loop',
    environment: 'production',
    trace_enabled: true,
    capabilities: ['anomaly_detection', 'risk_scoring', 'transaction_blocking'],
    permissions: ['read_transactions', 'flag_accounts'],
  },
  {
    name: 'HR Onboarding Controller',
    agent_type: 'semi_autonomous',
    description: 'Automates new employee onboarding workflows, document collection, and system provisioning.',
    status: 'under_review',
    risk_tier: 'low',
    max_autonomy_level: 'supervised',
    environment: 'staging',
    trace_enabled: true,
    capabilities: ['document_collection', 'system_provisioning', 'notification'],
    permissions: ['read_employee_data', 'send_emails', 'provision_accounts'],
  },
  {
    name: 'Code Review Controller',
    agent_type: 'tool_calling',
    description: 'Automated code quality checks, security scans, and PR summarization.',
    status: 'active',
    risk_tier: 'low',
    max_autonomy_level: 'fully_autonomous',
    environment: 'development',
    trace_enabled: false,
    capabilities: ['static_analysis', 'security_scanning', 'pr_summarization'],
    permissions: ['read_repositories', 'post_comments'],
  },
];

const statusIcon = (s: string) => {
  switch (s) {
    case 'active': return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'suspended': return <XCircle className="w-4 h-4 text-red-400" />;
    case 'under_review': return <Clock className="w-4 h-4 text-amber-400" />;
    default: return <Eye className="w-4 h-4 text-muted-foreground" />;
  }
};

const riskColor = (r: string) => {
  switch (r) {
    case 'critical': case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

function AgentRegistryTab() {
  const { data: agents, isLoading } = useAgents();
  const { data: models } = useModels();
  const createMutation = useCreateAgent();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({
    name: '', agent_type: 'autonomous', description: '', max_autonomy_level: 'supervised',
    environment: 'development', model_id: '', system_id: '',
  });

  const handleSubmit = () => {
    const payload: any = { ...form };
    if (!payload.model_id) delete payload.model_id;
    if (!payload.system_id) delete payload.system_id;
    createMutation.mutate(payload, {
      onSuccess: () => { setOpen(false); setForm({ name: '', agent_type: 'autonomous', description: '', max_autonomy_level: 'supervised', environment: 'development', model_id: '', system_id: '' }); },
    });
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const toInsert = DEMO_AGENTS.map(a => ({ ...a, created_by: user?.id }));
      const { error } = await supabase.from('ai_agents').insert(toInsert as never);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('4 demo controllers loaded successfully');
    } catch (e: any) {
      toast.error('Failed to load demo data: ' + e.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <p className="text-sm text-muted-foreground">Register and manage all autonomous controllers across your enterprise.</p>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Register Controller</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Register Controller</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                <div><Label>Controller Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Customer Support Controller" /></div>
                <div><Label>Controller Type</Label>
                  <Select value={form.agent_type} onValueChange={v => setForm(f => ({ ...f, agent_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="autonomous">Autonomous</SelectItem>
                      <SelectItem value="semi_autonomous">Semi-Autonomous</SelectItem>
                      <SelectItem value="tool_calling">Tool Calling</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div><Label>Autonomy Level</Label>
                  <Select value={form.max_autonomy_level} onValueChange={v => setForm(f => ({ ...f, max_autonomy_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fully_autonomous">Fully Autonomous</SelectItem>
                      <SelectItem value="supervised">Supervised</SelectItem>
                      <SelectItem value="human_in_loop">Human-in-the-Loop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Environment</Label>
                  <Select value={form.environment} onValueChange={v => setForm(f => ({ ...f, environment: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {models?.length ? (
                  <div><Label>Linked Engine (optional)</Label>
                    <Select value={form.model_id} onValueChange={v => setForm(f => ({ ...f, model_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {models.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {formatModelName(m.name)}
                            {getModelProvider(m.name) && <span className="text-muted-foreground ml-1">· {getModelProvider(m.name)}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <Button onClick={handleSubmit} disabled={!form.name || createMutation.isPending} className="w-full">Register Controller</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading controllers...
        </div>
      ) : !agents?.length ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 flex flex-col items-center text-center gap-4">
            <Bot className="w-14 h-14 text-muted-foreground opacity-40" />
            <div>
              <p className="font-medium text-foreground">No controllers registered yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Register autonomous controllers to enable governance, trace execution, and enforce policies.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" size="sm" onClick={handleSeedDemo} disabled={seeding}>
                {seeding ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Load Demo Controllers
              </Button>
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Register Controller
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {agents.map(a => (
            <Card key={a.id} className="bg-card border-border">
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {statusIcon(a.status)}
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {a.agent_type?.replace(/_/g, ' ')} · {a.max_autonomy_level?.replace(/_/g, ' ')} · {a.environment}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={riskColor(a.risk_tier)}>{a.risk_tier}</Badge>
                    <Badge variant="outline">{a.status?.replace(/_/g, ' ')}</Badge>
                    {a.trace_enabled && <Badge variant="secondary" className="text-xs"><Activity className="w-3 h-3 mr-1" />Tracing</Badge>}
                  </div>
                </div>
                {a.description && <p className="text-xs text-muted-foreground mt-2">{a.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentTracesTab() {
  const { data: agents } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const { data: traces, isLoading } = useAgentTraces(selectedAgent || undefined);

  const traceStatusIcon = (s: string) => {
    switch (s) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failure': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'blocked': return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'escalated': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default: return <Zap className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select a controller" /></SelectTrigger>
          <SelectContent>
            {agents?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">View execution traces, policy violations, and controller behavior.</p>
      </div>

      {!selectedAgent ? (
        <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Select a controller to view its traces.</p>
        </CardContent></Card>
      ) : !traces?.length ? (
        <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">
          <p>No traces recorded yet for this controller.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {traces.map(t => (
            <Card key={t.id} className="bg-card border-border">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {traceStatusIcon(t.status)}
                  <div>
                    <div className="text-sm font-medium text-foreground">{t.trace_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), 'MMM d, HH:mm:ss')}
                      {t.duration_ms && ` · ${t.duration_ms}ms`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{t.status}</Badge>
                  {t.policy_violations?.length > 0 && (
                    <Badge variant="destructive">{t.policy_violations.length} violations</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentGovernance() {
  return (
    <MainLayout title="Controller Governance">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Controller Governance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register, monitor, and govern all autonomous controllers with trace-level visibility and policy enforcement.
          </p>
        </div>

        <Tabs defaultValue="registry" className="space-y-4">
          <TabsList>
            <TabsTrigger value="registry"><Bot className="w-4 h-4 mr-1" /> Controller Registry</TabsTrigger>
            <TabsTrigger value="traces"><Activity className="w-4 h-4 mr-1" /> Execution Traces</TabsTrigger>
          </TabsList>
          <TabsContent value="registry"><AgentRegistryTab /></TabsContent>
          <TabsContent value="traces"><AgentTracesTab /></TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
