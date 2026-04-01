import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Globe, Mail, ShieldCheck, Plus, Calendar } from "lucide-react";
import { useVendors, useCreateVendor, type AIVendor } from "@/hooks/useVendors";
import { cn } from "@/lib/utils";

function riskColor(tier: string) {
  switch (tier?.toLowerCase()) {
    case "critical": return "bg-destructive/10 text-destructive";
    case "high":     return "bg-orange-500/10 text-orange-400";
    case "medium":   return "bg-yellow-500/10 text-yellow-400";
    default:         return "bg-green-500/10 text-green-400";
  }
}

function contractColor(status: string) {
  switch (status?.toLowerCase()) {
    case "active":   return "default";
    case "expired":  return "destructive";
    default:         return "secondary";
  }
}

function AddProviderDialog() {
  const [open, setOpen] = useState(false);
  const createVendor = useCreateVendor();
  const [form, setForm] = useState({
    name: "", vendor_type: "model_provider", website: "",
    contact_email: "", risk_tier: "low", contract_status: "active",
    data_processing_location: "",
  });

  const handleSubmit = async () => {
    if (!form.name) return;
    await createVendor.mutateAsync({ ...form, compliance_certifications: [], ai_services: {} } as any);
    setOpen(false);
    setForm({ name: "", vendor_type: "model_provider", website: "", contact_email: "", risk_tier: "low", contract_status: "active", data_processing_location: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Provider</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Register Solution Provider</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Provider Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. OpenAI, Anthropic" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.vendor_type} onValueChange={v => setForm(f => ({ ...f, vendor_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="model_provider">Model Provider</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="data_provider">Data Provider</SelectItem>
                  <SelectItem value="tooling">Tooling</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risk Tier</Label>
              <Select value={form.risk_tier} onValueChange={v => setForm(f => ({ ...f, risk_tier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contract Status</Label>
              <Select value={form.contract_status} onValueChange={v => setForm(f => ({ ...f, contract_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Location</Label>
              <Input value={form.data_processing_location} onChange={e => setForm(f => ({ ...f, data_processing_location: e.target.value }))} placeholder="e.g. US, EU" />
            </div>
          </div>
          <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." /></div>
          <div><Label>Contact Email</Label><Input value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="contact@provider.com" type="email" /></div>
          <Button className="w-full" onClick={handleSubmit} disabled={!form.name || createVendor.isPending}>
            {createVendor.isPending ? "Registering..." : "Register Provider"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Vendors() {
  const { data: vendors, isLoading } = useVendors();
  const total    = vendors?.length ?? 0;
  const active   = vendors?.filter(v => v.contract_status === "active").length ?? 0;
  const critical = vendors?.filter(v => v.risk_tier === "critical").length ?? 0;
  const assessed = vendors?.filter(v => v.last_assessment_at).length ?? 0;

  return (
    <MainLayout title="Solution Provider Registry" subtitle="Third-party AI solution providers and supply-chain risk management">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Providers"  value={String(total)}    subtitle="Registered" icon={<Building2 className="w-4 h-4 text-primary" />} />
        <MetricCard title="Active Contracts" value={String(active)}   subtitle="In service"  icon={<ShieldCheck className="w-4 h-4 text-success" />} status="success" />
        <MetricCard title="Critical Risk"    value={String(critical)} subtitle="High-risk" icon={<ShieldCheck className="w-4 h-4 text-destructive" />} status="danger" />
        <MetricCard title="Risk Assessed"    value={String(assessed)} subtitle="Assessed" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Provider List ({total})</h2>
        <AddProviderDialog />
      </div>
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : !vendors?.length ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-foreground">No solution providers registered</p>
          <p className="text-sm text-muted-foreground mt-1">Add providers to track supply-chain risk and compliance</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map((vendor: AIVendor) => (
            <div key={vendor.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{vendor.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{vendor.vendor_type?.replace(/_/g,' ')}</p>
                </div>
                <Badge variant={contractColor(vendor.contract_status) as any}>{vendor.contract_status}</Badge>
              </div>
              <div className="flex items-center gap-1 mb-3">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", riskColor(vendor.risk_tier))}>
                  {vendor.risk_tier?.toUpperCase()} RISK
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {vendor.website && <div className="flex items-center gap-1.5"><Globe className="w-3 h-3" /><a href={vendor.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground truncate">{vendor.website.replace(/^https?:\/\//, '')}</a></div>}
                {vendor.contact_email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /><span className="truncate">{vendor.contact_email}</span></div>}
                {vendor.data_processing_location && <div className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /><span>{vendor.data_processing_location}</span></div>}
              </div>
              {vendor.compliance_certifications?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {vendor.compliance_certifications.slice(0,3).map((cert: string) => <span key={cert} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">{cert}</span>)}
                  {vendor.compliance_certifications.length > 3 && <span className="text-[10px] text-muted-foreground">+{vendor.compliance_certifications.length-3} more</span>}
                </div>
              )}
              {vendor.last_assessment_at && (
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
                  <Calendar className="w-3 h-3" /><span>Last assessed: {new Date(vendor.last_assessment_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
