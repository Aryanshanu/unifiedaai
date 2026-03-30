import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, Globe, Mail, ShieldCheck } from "lucide-react";
import { useVendors } from "@/hooks/useVendors";
import { EmptyState } from "@/components/shared/EmptyState";

const riskTierColor = (tier: string | null) => {
  switch (tier) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

const statusColor = (status: string | null) => {
  switch (status) {
    case 'active': return 'default';
    case 'under_review': return 'secondary';
    case 'suspended': return 'destructive';
    default: return 'outline';
  }
};

export default function Vendors() {
  const { data: vendors, isLoading, error } = useVendors();

  return (
    <MainLayout
      title="Vendor Management"
      subtitle="AI vendor registry, risk assessment, and contract tracking"
      headerActions={
        <Button size="sm" disabled>
          <Plus className="h-4 w-4 mr-1" />
          Add Vendor
        </Button>
      }
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : error ? (
          <EmptyState
            icon={Building2}
            title="Failed to load vendors"
            description="There was an error loading vendor data."
          />
        ) : !vendors?.length ? (
          <EmptyState
            icon={Building2}
            title="No vendors registered"
            description="Register AI vendors to track risk, compliance, and contracts."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <Card key={vendor.id} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {vendor.name}
                    </CardTitle>
                    <Badge variant={riskTierColor(vendor.risk_tier)}>
                      {vendor.risk_tier || 'unassessed'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span className="capitalize">{vendor.vendor_type}</span>
                  </div>
                  {vendor.website && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                        {vendor.website}
                      </a>
                    </div>
                  )}
                  {vendor.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{vendor.contact_email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Badge variant={statusColor(vendor.contract_status)} className="text-xs">
                      {vendor.contract_status || 'no contract'}
                    </Badge>
                    {vendor.data_processing_location && (
                      <span className="text-xs text-muted-foreground">
                        📍 {vendor.data_processing_location}
                      </span>
                    )}
                  </div>
                  {vendor.compliance_certifications?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {vendor.compliance_certifications.slice(0, 3).map((cert) => (
                        <Badge key={cert} variant="outline" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                      {vendor.compliance_certifications.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{vendor.compliance_certifications.length - 3}
                        </Badge>
                      )}
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
