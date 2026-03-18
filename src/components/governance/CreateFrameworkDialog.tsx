import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Shield } from 'lucide-react';
import { useCreateFramework, type SeverityLevel } from '@/hooks/useGovernance';
import { toast } from 'sonner';

interface ControlInput {
  code: string;
  title: string;
  description: string;
  severity: SeverityLevel;
}

const TEMPLATES: Record<string, { name: string; version: string; description: string; controls: ControlInput[] }> = {
  empty: { name: '', version: '1.0', description: '', controls: [] },
  soc2: {
    name: 'SOC 2 Type II',
    version: '2024',
    description: 'Service Organization Control 2 — Trust Service Criteria for AI systems',
    controls: [
      { code: 'CC6.1', title: 'Logical access security', description: 'Restrict access to AI systems and data', severity: 'high' },
      { code: 'CC6.2', title: 'Access removal on termination', description: 'Revoke access when personnel leave', severity: 'high' },
      { code: 'CC7.1', title: 'Configuration management', description: 'Track model configurations and changes', severity: 'medium' },
      { code: 'CC7.2', title: 'Change management', description: 'Formal process for model updates', severity: 'high' },
      { code: 'PI1.1', title: 'Processing accuracy', description: 'Ensure model outputs are accurate', severity: 'critical' },
    ],
  },
  nist: {
    name: 'NIST AI RMF',
    version: '1.0',
    description: 'NIST AI Risk Management Framework — Govern, Map, Measure, Manage',
    controls: [
      { code: 'GV-1', title: 'AI governance policies', description: 'Establish organizational AI governance', severity: 'high' },
      { code: 'GV-2', title: 'Accountability structures', description: 'Define roles and responsibilities', severity: 'high' },
      { code: 'MAP-1', title: 'Context mapping', description: 'Understand AI system context and impact', severity: 'medium' },
      { code: 'MS-1', title: 'Performance metrics', description: 'Define and track AI performance', severity: 'high' },
      { code: 'MG-1', title: 'Risk response', description: 'Plan and implement risk mitigations', severity: 'critical' },
    ],
  },
  iso42001: {
    name: 'ISO/IEC 42001',
    version: '2023',
    description: 'AI Management System — Requirements and guidance',
    controls: [
      { code: 'A.2.1', title: 'AI policy', description: 'Establish AI management policy', severity: 'high' },
      { code: 'A.3.1', title: 'Leadership commitment', description: 'Management demonstrates AI governance', severity: 'medium' },
      { code: 'A.5.1', title: 'Risk assessment', description: 'Systematic AI risk identification', severity: 'critical' },
      { code: 'A.6.1', title: 'Objectives and planning', description: 'Set measurable AI management objectives', severity: 'medium' },
      { code: 'A.8.1', title: 'Operational control', description: 'Control AI system operations', severity: 'high' },
    ],
  },
};

export function CreateFrameworkDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('');
  const [controls, setControls] = useState<ControlInput[]>([]);
  const createFramework = useCreateFramework();

  const loadTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setName(t.name);
    setVersion(t.version);
    setDescription(t.description);
    setControls([...t.controls]);
  };

  const addControl = () => {
    setControls(prev => [...prev, { code: '', title: '', description: '', severity: 'medium' }]);
  };

  const removeControl = (idx: number) => {
    setControls(prev => prev.filter((_, i) => i !== idx));
  };

  const updateControl = (idx: number, field: keyof ControlInput, value: string) => {
    setControls(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Framework name is required');
      return;
    }
    if (controls.length === 0) {
      toast.error('Add at least one control');
      return;
    }
    const invalidControls = controls.filter(c => !c.code.trim() || !c.title.trim());
    if (invalidControls.length > 0) {
      toast.error('All controls need a code and title');
      return;
    }

    try {
      await createFramework.mutateAsync({
        name: name.trim(),
        version: version.trim(),
        description: description.trim() || undefined,
        controls,
      });
      toast.success(`Framework "${name}" created with ${controls.length} controls`);
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create framework');
    }
  };

  const resetForm = () => {
    setName('');
    setVersion('1.0');
    setDescription('');
    setControls([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Framework
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Create Compliance Framework
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Templates */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Start from template</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(TEMPLATES).filter(([k]) => k !== 'empty').map(([key, t]) => (
                <Button key={key} variant="outline" size="sm" onClick={() => loadTemplate(key)}>
                  {t.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Framework details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., SOC 2 Type II" className="mt-1" />
            </div>
            <div>
              <Label>Version</Label>
              <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Framework purpose and scope" className="mt-1" rows={2} />
          </div>

          {/* Controls */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Controls ({controls.length})</Label>
              <Button variant="ghost" size="sm" onClick={addControl}>
                <Plus className="w-3 h-3 mr-1" /> Add Control
              </Button>
            </div>

            {controls.length === 0 ? (
              <div className="text-center py-6 bg-muted/30 rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">No controls yet. Add manually or load a template.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {controls.map((ctrl, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                    <div className="grid grid-cols-[80px_1fr] gap-2 flex-1">
                      <Input
                        value={ctrl.code}
                        onChange={e => updateControl(idx, 'code', e.target.value)}
                        placeholder="CC6.1"
                        className="font-mono text-xs"
                      />
                      <Input
                        value={ctrl.title}
                        onChange={e => updateControl(idx, 'title', e.target.value)}
                        placeholder="Control title"
                        className="text-sm"
                      />
                      <Select value={ctrl.severity} onValueChange={v => updateControl(idx, 'severity', v)}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={ctrl.description}
                        onChange={e => updateControl(idx, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        className="text-xs"
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeControl(idx)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createFramework.isPending}>
              {createFramework.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Framework
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
