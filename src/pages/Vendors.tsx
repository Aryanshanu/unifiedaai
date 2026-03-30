import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Building2, Globe, Mail, ShieldCheck, Plus } from "lucide-react";
import { useVendors, type AIVendor } from "@/hooks/useVendors";
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

export default function Vendors() {
  const { data: vendors, isLoading } = useVendors();

  const total        = vendors?.length ?? 0;
  const active       = vendors?.filter(v => v.contract_status === "active").length ?? 0;
  const critical     = vendors?.filter(v => v.risk_tier === "critical").length ?? 0;
  const assessed     = vendors?.filter(v => v.last_assessment_at).length ?? 0;

  return (
    <MainLayout
      title="AI Vendor Registry"
      subtitle="Third-party AI service providers and supply-chain risk management"
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Vendors"    value={String(total)}    subtitle="Registered" icon={<Building2 className="w-4 h-4 text-primary" />} />
        <MetricCard title="Active Contracts" value={String(active)}   subtitle="In service"  icon={<ShieldCheck className="w-4 h-4 text-success" />} status="success" />
        <MetricCard title="Critical Risk"    value={String(critical)} subtitle="High-risk vendors" icon={<ShieldCheck className="w-4 h-4 text-destructive" />} status="danger" />
        <MetricCard title="Assessed"         value={String(assessed)} subtitle="Risk-assessed" />
      </div>

      {/* Header + Add */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Vendor List</h2>
        <Button variant="gradient" size="sm" disabled>
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !vendors?.length ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-foreground">No AI vendors registered</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add vendors to track supply-chain risk and compliance
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map((vendor: AIVendor) => (
            <div
              key={vendor.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{vendor.name}</p>
                  <p className="text-xs text-muted-foreground">{vendor.vendor_type}</p>
                </div>
                <Badge variant={contractColor(vendor.contract_status) as any}>
                  {vendor.contract_status}
                </Badge>
              </div>

              <div className="flex items-center gap-1 mb-3">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", riskColor(vendor.risk_tier))}>
                  {vendor.risk_tier?.toUpperCase()} RISK
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {vendor.website && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                       className="hover:text-foreground transition-colors truncate">
                      {vendor.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {vendor.contact_email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{vendor.contact_email}</span>
                  </div>
                )}
                {vendor.data_processing_location && (
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{vendor.data_processing_location}</span>
                  </div>
                )}
              </div>

              {vendor.compliance_certifications?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {vendor.compliance_certifications.slice(0, 3).map((cert: string) => (
                    <span key={cert} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                      {cert}
                    </span>
                  ))}
                  {vendor.compliance_certifications.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{vendor.compliance_certifications.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {vendor.last_assessment_at && (
                <p className="text-[10px] text-muted-foreground mt-3">
                  Last assessed: {new Date(vendor.last_assessment_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
