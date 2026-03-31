import { useState } from 'react';
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
import { useShadowAIDiscoveries, useReportShadowAI, useUpdateShadowAI } from '@/hooks/useShadowAI';
import { useVendors, useCreateVendor } from '@/hooks/useVendors';
import { useAgents } from '@/hooks/useAgents';
import { useModels } from '@/hooks/useModels';
import { useSystems } from '@/hooks/useSystems';
import {
  ScanSearch, Building2, Bot, AlertTriangle, Plus, Eye,
  ShieldAlert, CheckCircle, Clock, XCircle, Search,
} from 'lucide-react';
import { format } from 'date-fns';
import LiveDiscoveryScanner from '@/components/discovery/LiveDiscoveryScanner';

function InventorySummary() {
  const { data: agents } = useAgents();
  const { data: models } = useModels();
  const { data: systems } = useSystems();
  const { data: vendors } = useVendors();
  const { data: shadows } = useShadowAIDiscoveries();

  const stats = [
    { label: 'Registered Logic Engines', count: models?.length ?? 0, icon: Eye, color: 'text-blue-400' },
    { label: 'Autonomous Assets', count: systems?.length ?? 0, icon: ShieldAlert, color: 'text-green-400' },
    { label: 'Logic Controllers', count: agents?.length ?? 0, icon: Bot, color: 'text-purple-400' },
    { label: 'Solution Providers', count: vendors?.length ?? 0, icon: Building2, color: 'text-amber-400' },
    { label: 'Unregistered Logic Alerts', count: shadows?.filter(s => s.status === 'discovered')?.length ?? 0, icon: AlertTriangle, color: 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map(s => (
        <Card key={s.label} className="bg-card border-border">
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <s.icon className={`w-8 h-8 ${s.color}`} />
            <div>
              <div className="text-2xl font-bold text-foreground">{s.count}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const riskColor = (r: string) => {
  switch (r) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    case 'low': return 'outline';
    default: return 'secondary';
  }
};

function ShadowAITab() {
  const { data: discoveries, isLoading } = useShadowAIDiscoveries();
  const reportMutation = useReportShadowAI();
  const updateMutation = useUpdateShadowAI();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ai_system_name: '', ai_system_type: 'unknown', department: '', discovery_method: 'manual' });

  const handleSubmit = () => {
    reportMutation.mutate(form as any, { onSuccess: () => { setOpen(false); setForm({ ai_system_name: '', ai_system_type: 'unknown', department: '', discovery_method: 'manual' }); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Report and track unauthorized or unregistered logic engines discovered in your organization.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Report Unregistered Logic</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Report Unregistered Logic</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Logic Name</Label><Input value={form.ai_system_name} onChange={e => setForm(f => ({ ...f, ai_system_name: e.target.value }))} placeholder="e.g. Shadow API in Analytics" /></div>
              <div><Label>Logic Type</Label>
                <Select value={form.ai_system_type} onValueChange={v => setForm(f => ({ ...f, ai_system_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="model">Logic Engine</SelectItem>
                    <SelectItem value="agent">Controller</SelectItem>
                    <SelectItem value="api">External API</SelectItem>
                    <SelectItem value="saas_tool">SaaS Component</SelectItem>
                    <SelectItem value="plugin">Plugin / Extension</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Department</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Marketing" /></div>
              <div><Label>Discovery Method</Label>
                <Select value={form.discovery_method} onValueChange={v => setForm(f => ({ ...f, discovery_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Report</SelectItem>
                    <SelectItem value="network_scan">Network Scan</SelectItem>
                    <SelectItem value="api_audit">API Audit</SelectItem>
                    <SelectItem value="log_analysis">Log Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} disabled={!form.ai_system_name || reportMutation.isPending} className="w-full">Submit Report</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : !discoveries?.length ? (
        <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">
          <ScanSearch className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No unregistered logic discoveries yet. Use the report button to log unauthorized systems.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {discoveries.map(d => (
            <Card key={d.id} className="bg-card border-border">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${d.status === 'discovered' ? 'text-red-400' : d.status === 'under_review' ? 'text-amber-400' : 'text-green-400'}`} />
                  <div>
                    <div className="font-medium text-foreground">{d.ai_system_name}</div>
                    <div className="text-xs text-muted-foreground">{d.ai_system_type} · {d.department || 'No dept'} · {d.discovery_method}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={riskColor(d.risk_assessment)}>{d.risk_assessment}</Badge>
                  <Badge variant="outline">{d.status}</Badge>
                  {d.status === 'discovered' && (
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: d.id, status: 'under_review' } as any)}>
                      Review
                    </Button>
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

function VendorTab() {
  const { data: vendors, isLoading } = useVendors();
  const createMutation = useCreateVendor();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', vendor_type: 'third_party', website: '', data_processing_location: '' });

  const handleSubmit = () => {
    createMutation.mutate(form as any, { onSuccess: () => { setOpen(false); setForm({ name: '', vendor_type: 'third_party', website: '', data_processing_location: '' }); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Track third-party solution providers and their compliance status.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Provider</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register Solution Provider</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Vendor Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Type</Label>
                <Select value={form.vendor_type} onValueChange={v => setForm(f => ({ ...f, vendor_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="third_party">Third Party</SelectItem>
                    <SelectItem value="open_source">Open Source</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
              <div><Label>Data Processing Location</Label><Input value={form.data_processing_location} onChange={e => setForm(f => ({ ...f, data_processing_location: e.target.value }))} placeholder="e.g. EU, US" /></div>
              <Button onClick={handleSubmit} disabled={!form.name || createMutation.isPending} className="w-full">Register Vendor</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!vendors?.length ? (
        <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No providers registered. Add your solution providers to track their compliance.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {vendors.map(v => (
            <Card key={v.id} className="bg-card border-border">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">{v.name}</div>
                  <div className="text-xs text-muted-foreground">{v.vendor_type} · {v.data_processing_location || 'Unknown location'}</div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={riskColor(v.risk_tier)}>{v.risk_tier}</Badge>
                  <Badge variant="outline">{v.contract_status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Discovery() {
  return (
    <MainLayout title="Infrastructure Audit & Inventory">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Infrastructure Audit & Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete visibility into all autonomous systems — logic engines, controllers, providers, and unregistered logic across your enterprise.
          </p>
        </div>

        <InventorySummary />

        <Tabs defaultValue="auto" className="space-y-4">
          <TabsList>
            <TabsTrigger value="auto"><ScanSearch className="w-4 h-4 mr-1" /> Active logic Auditor</TabsTrigger>
            <TabsTrigger value="shadow"><AlertTriangle className="w-4 h-4 mr-1" /> Unregistered Logic</TabsTrigger>
            <TabsTrigger value="vendors"><Building2 className="w-4 h-4 mr-1" /> Providers</TabsTrigger>
          </TabsList>
          <TabsContent value="auto"><LiveDiscoveryScanner /></TabsContent>
          <TabsContent value="shadow"><ShadowAITab /></TabsContent>
          <TabsContent value="vendors"><VendorTab /></TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
