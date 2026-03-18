import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystems } from '@/hooks/useSystems';
import { useAgents } from '@/hooks/useAgents';
import { Server, Shield, CheckCircle, AlertTriangle, Lock, Unlock, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeploymentEnvironment {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_production: boolean;
  approval_required: boolean;
  max_risk_tier: string;
  auto_monitoring: boolean;
  status: string;
  region: string | null;
  auto_destroy_at: string | null;
}

function useEnvironments() {
  return useQuery({
    queryKey: ['deployment-environments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deployment_environments')
        .select('*')
        .order('is_production', { ascending: true });
      if (error) throw error;
      return data as unknown as DeploymentEnvironment[];
    },
  });
}

function useCreateEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      display_name: string;
      description?: string;
      is_production: boolean;
      approval_required: boolean;
      max_risk_tier: string;
      auto_monitoring: boolean;
      region: string;
    }) => {
      const { data, error } = await supabase
        .from('deployment_environments')
        .insert([input])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment-environments'] });
    },
  });
}

function useDeleteEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deployment_environments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment-environments'] });
    },
  });
}

export default function EnvironmentManagement() {
  const { data: environments } = useEnvironments();
  const { data: systems } = useSystems();
  const { data: agents } = useAgents();
  const createEnv = useCreateEnvironment();
  const deleteEnv = useDeleteEnvironment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    display_name: '',
    description: '',
    is_production: false,
    approval_required: false,
    max_risk_tier: 'medium',
    auto_monitoring: true,
    region: 'us-east-1',
  });

  const getEnvCounts = (envName: string) => {
    const systemCount = systems?.filter(s => (s as Record<string, unknown>).environment === envName || (envName === 'production' && (s as Record<string, unknown>).deployment_status === 'deployed'))?.length ?? 0;
    const agentCount = agents?.filter(a => a.environment === envName)?.length ?? 0;
    return { systemCount, agentCount };
  };

  const handleCreate = async () => {
    if (!form.name || !form.display_name) return;
    try {
      await createEnv.mutateAsync(form);
      toast.success(`Environment "${form.display_name}" created`);
      setOpen(false);
      setForm({ name: '', display_name: '', description: '', is_production: false, approval_required: false, max_risk_tier: 'medium', auto_monitoring: true, region: 'us-east-1' });
    } catch {
      toast.error("Failed to create environment");
    }
  };

  const handleDelete = async (env: DeploymentEnvironment) => {
    if (env.is_production) {
      toast.error("Cannot delete production environments");
      return;
    }
    try {
      await deleteEnv.mutateAsync(env.id);
      toast.success(`Environment "${env.display_name}" deleted`);
    } catch {
      toast.error("Failed to delete environment");
    }
  };

  return (
    <MainLayout title="Environment Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Environment Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage deployment environments with governance controls, approval gates, and risk isolation.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1" />Create Environment</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Deployment Environment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name (slug)</Label>
                    <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s/g, '-') }))} placeholder="e.g., staging" />
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder="e.g., Staging" />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Pre-production testing environment" />
                </div>
                <div>
                  <Label>Region</Label>
                  <Select value={form.region} onValueChange={v => setForm(p => ({ ...p, region: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us-east-1">US East</SelectItem>
                      <SelectItem value="us-west-2">US West</SelectItem>
                      <SelectItem value="eu-west-1">EU West</SelectItem>
                      <SelectItem value="eu-central-1">EU Central</SelectItem>
                      <SelectItem value="ap-southeast-1">Asia Pacific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Max Risk Tier</Label>
                  <Select value={form.max_risk_tier} onValueChange={v => setForm(p => ({ ...p, max_risk_tier: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Production Environment</Label>
                    <Switch checked={form.is_production} onCheckedChange={v => setForm(p => ({ ...p, is_production: v, approval_required: v ? true : p.approval_required }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Require Approval for Deploy</Label>
                    <Switch checked={form.approval_required} onCheckedChange={v => setForm(p => ({ ...p, approval_required: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Auto Monitoring</Label>
                    <Switch checked={form.auto_monitoring} onCheckedChange={v => setForm(p => ({ ...p, auto_monitoring: v }))} />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={!form.name || !form.display_name || createEnv.isPending} className="w-full">
                  {createEnv.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Environment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {environments?.map(env => {
            const counts = getEnvCounts(env.name);
            return (
              <Card key={env.id} className={`bg-card border-border ${env.is_production ? 'ring-1 ring-primary/30' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Server className={`w-5 h-5 ${env.is_production ? 'text-primary' : 'text-muted-foreground'}`} />
                      {env.display_name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {env.is_production && <Badge variant="default">Production</Badge>}
                      {env.region && <Badge variant="outline" className="text-xs">{env.region}</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{env.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-foreground">{counts.systemCount}</div>
                      <div className="text-xs text-muted-foreground">Systems</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-foreground">{counts.agentCount}</div>
                      <div className="text-xs text-muted-foreground">Agents</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {env.approval_required ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        Approval Required
                      </span>
                      <Badge variant={env.approval_required ? 'default' : 'outline'}>
                        {env.approval_required ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Max Risk Tier
                      </span>
                      <Badge variant="secondary">{env.max_risk_tier}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {env.auto_monitoring ? <CheckCircle className="w-3 h-3 text-green-400" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
                        Auto Monitoring
                      </span>
                      <Badge variant={env.auto_monitoring ? 'default' : 'outline'}>
                        {env.auto_monitoring ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>

                  {!env.is_production && (
                    <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive mt-2" onClick={() => handleDelete(env)}>
                      <Trash2 className="w-4 h-4 mr-1" />Delete Environment
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
