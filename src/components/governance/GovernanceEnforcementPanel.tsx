import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useGovernancePolicies, useCreateGovernancePolicy, useToggleGovernancePolicy, useDeleteGovernancePolicy, useGovernanceEnforcements } from '@/hooks/useGovernancePolicies';
import { usePlatformConfig, useUpdateConfig } from '@/hooks/usePlatformConfig';
import { ShieldCheck, ShieldAlert, Plus, Trash2, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { Json } from '@/integrations/supabase/types';

const CONDITION_TYPES = [
  { id: 'min_quality_score', label: 'Minimum Quality Score', unit: '%' },
  { id: 'max_risk_score', label: 'Maximum Risk Score', unit: '' },
  { id: 'required_approval', label: 'Required Approval', unit: '' },
  { id: 'min_fairness_score', label: 'Minimum Fairness Score', unit: '%' },
  { id: 'max_toxicity_score', label: 'Maximum Toxicity Score', unit: '%' },
];

const ACTION_TYPES = [
  { id: 'warn', label: 'Warn', color: 'text-warning' },
  { id: 'block', label: 'Block', color: 'text-destructive' },
  { id: 'require_approval', label: 'Require Approval', color: 'text-primary' },
];

export function GovernanceEnforcementPanel() {
  const { data: policies, isLoading: policiesLoading } = useGovernancePolicies();
  const { data: enforcements } = useGovernanceEnforcements();
  const createPolicy = useCreateGovernancePolicy();
  const togglePolicy = useToggleGovernancePolicy();
  const deletePolicy = useDeleteGovernancePolicy();
  const { data: configs } = usePlatformConfig();
  const updateConfig = useUpdateConfig();
  
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    condition_type: 'min_quality_score',
    threshold: 70,
    action_type: 'warn',
  });

  const govConfig = configs?.find(c => c.config_key === 'governance_mode')?.config_value;
  const governanceMode = (govConfig && typeof govConfig === 'object' && 'mode' in (govConfig as Record<string, unknown>)) ? (govConfig as Record<string, string>).mode : 'advisory';
  const isEnforced = governanceMode === 'enforced';

  const handleModeToggle = async (enforced: boolean) => {
    try {
      await updateConfig.mutateAsync({
        configKey: 'governance_mode',
        value: { mode: enforced ? 'enforced' : 'advisory' },
      });
      toast.success(`Governance mode set to ${enforced ? 'enforced' : 'advisory'}`);
    } catch {
      toast.error("Failed to update governance mode");
    }
  };

  const handleCreatePolicy = async () => {
    if (!form.name) return;
    try {
      await createPolicy.mutateAsync({
        name: form.name,
        description: form.description,
        condition_type: form.condition_type,
        condition_config: { threshold: form.threshold } as unknown as Json,
        action_type: form.action_type,
      });
      toast.success("Policy created");
      setOpen(false);
      setForm({ name: '', description: '', condition_type: 'min_quality_score', threshold: 70, action_type: 'warn' });
    } catch {
      toast.error("Failed to create policy");
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <Card className="border-border">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEnforced ? <ShieldCheck className="w-5 h-5 text-success" /> : <ShieldAlert className="w-5 h-5 text-warning" />}
            <div>
              <p className="font-medium text-foreground">Governance Mode</p>
              <p className="text-xs text-muted-foreground">
                {isEnforced ? 'Policies are enforced — violations will be blocked or escalated.' : 'Advisory mode — violations generate warnings only.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isEnforced ? 'default' : 'secondary'}>
              {isEnforced ? 'Enforced' : 'Advisory'}
            </Badge>
            <Switch checked={isEnforced} onCheckedChange={handleModeToggle} />
          </div>
        </CardContent>
      </Card>

      {/* Policies */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Governance Policies</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Policy</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Governance Policy</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Policy Name</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Minimum Quality Gate" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Block deployments below quality threshold" />
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select value={form.condition_type} onValueChange={v => setForm(p => ({ ...p, condition_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_TYPES.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Threshold</Label>
                  <Input type="number" value={form.threshold} onChange={e => setForm(p => ({ ...p, threshold: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Action</Label>
                  <Select value={form.action_type} onValueChange={v => setForm(p => ({ ...p, action_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map(at => <SelectItem key={at.id} value={at.id}>{at.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreatePolicy} disabled={!form.name || createPolicy.isPending} className="w-full">
                  {createPolicy.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Policy
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!policies?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">No governance policies defined.</p>
        ) : (
          <div className="space-y-2">
            {policies.map(p => (
              <Card key={p.id} className="border-border">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch checked={p.is_active} onCheckedChange={v => togglePolicy.mutate({ id: p.id, is_active: v })} />
                    <div>
                      <p className="font-medium text-foreground text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CONDITION_TYPES.find(ct => ct.id === p.condition_type)?.label || p.condition_type}
                        {' · '}
                        Threshold: {(p.condition_config as Record<string, number>)?.threshold ?? 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.action_type === 'block' ? 'destructive' : p.action_type === 'require_approval' ? 'default' : 'secondary'}>
                      {p.action_type}
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deletePolicy.mutate(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Enforcement Log */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Enforcement Log</h3>
        {!enforcements?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">No enforcement events recorded.</p>
        ) : (
          <div className="space-y-2">
            {enforcements.slice(0, 10).map(e => (
              <div key={e.id} className="flex items-center justify-between text-sm py-2 px-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  {e.decision === 'allowed' ? <CheckCircle className="w-4 h-4 text-success" /> :
                   e.decision === 'blocked' ? <XCircle className="w-4 h-4 text-destructive" /> :
                   <AlertTriangle className="w-4 h-4 text-warning" />}
                  <span className="text-foreground">{e.attempted_action}</span>
                  <span className="text-muted-foreground">on {e.target_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={e.decision === 'allowed' ? 'default' : e.decision === 'blocked' ? 'destructive' : 'secondary'} className="text-xs">
                    {e.decision}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
