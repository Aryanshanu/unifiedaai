import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useEvaluationSchedules, useCreateSchedule, useToggleSchedule } from '@/hooks/useEvaluationSchedules';
import { useModels } from '@/hooks/useModels';
import { Clock, Plus, Play, Pause, Calendar, Timer, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const ENGINE_OPTIONS = [
  { id: 'fairness', label: 'Fairness' },
  { id: 'toxicity', label: 'Toxicity' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'hallucination', label: 'Hallucination' },
  { id: 'explainability', label: 'Explainability' },
];

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Weekly (Monday)', value: '0 0 * * 1' },
  { label: 'Monthly (1st)', value: '0 0 1 * *' },
];

export default function ContinuousEvaluation() {
  const { data: schedules, isLoading } = useEvaluationSchedules();
  const { data: models } = useModels();
  const createMutation = useCreateSchedule();
  const toggleMutation = useToggleSchedule();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', model_id: '', cron_expression: '0 0 * * *',
    engine_types: ['fairness', 'toxicity', 'privacy', 'hallucination', 'explainability'],
  });

  const handleSubmit = () => {
    if (!form.name || !form.model_id) return;
    createMutation.mutate(form as any, {
      onSuccess: () => { setOpen(false); setForm({ name: '', model_id: '', cron_expression: '0 0 * * *', engine_types: ['fairness', 'toxicity', 'privacy', 'hallucination', 'explainability'] }); },
    });
  };

  const toggleEngine = (engineId: string) => {
    setForm(f => ({
      ...f,
      engine_types: f.engine_types.includes(engineId)
        ? f.engine_types.filter(e => e !== engineId)
        : [...f.engine_types, engineId],
    }));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Continuous Evaluation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule automated RAI evaluations to run continuously — not just on-demand.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Create Schedule</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Evaluation Schedule</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Schedule Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Daily Production Audit" /></div>
                <div><Label>Model</Label>
                  <Select value={form.model_id} onValueChange={v => setForm(f => ({ ...f, model_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                    <SelectContent>
                      {models?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Frequency</Label>
                  <Select value={form.cron_expression} onValueChange={v => setForm(f => ({ ...f, cron_expression: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CRON_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Engines</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ENGINE_OPTIONS.map(e => (
                      <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={form.engine_types.includes(e.id)}
                          onCheckedChange={() => toggleEngine(e.id)}
                        />
                        {e.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={handleSubmit} disabled={!form.name || !form.model_id || createMutation.isPending} className="w-full">Create Schedule</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!schedules?.length ? (
          <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium mb-1">No Evaluation Schedules</p>
            <p className="text-sm">Create a schedule to run automated RAI evaluations continuously.</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {schedules.map(s => (
              <Card key={s.id} className="bg-card border-border">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {s.is_active ? <Play className="w-5 h-5 text-green-400" /> : <Pause className="w-5 h-5 text-muted-foreground" />}
                      <div>
                        <div className="font-medium text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <Timer className="w-3 h-3" />
                          {CRON_PRESETS.find(p => p.value === s.cron_expression)?.label || s.cron_expression}
                          <span>·</span>
                          <span>{s.run_count} runs</span>
                          {s.failure_count > 0 && <><span>·</span><span className="text-red-400">{s.failure_count} failures</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {s.engine_types.map(e => (
                          <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                        ))}
                      </div>
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={checked => toggleMutation.mutate({ id: s.id, is_active: checked })}
                      />
                    </div>
                  </div>
                  {s.last_run_at && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Last run: {format(new Date(s.last_run_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
