import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ComplianceGauge } from "@/components/dashboard/ComplianceGauge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Shield, FileCheck, Download, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useControlFrameworks, useControls, useComplianceStats, useAttestations } from "@/hooks/useGovernance";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function Governance() {
  const { data: frameworks, isLoading: frameworksLoading } = useControlFrameworks();
  const { data: controls } = useControls();
  const { data: complianceStats } = useComplianceStats();
  const { data: attestations, isLoading: attestationsLoading } = useAttestations();

  // Control groups for compliance gauge
  const controlGroups = frameworks?.map(f => ({
    name: f.name,
    satisfied: Math.round((complianceStats?.complianceScore || 0) / 100 * f.total_controls),
    total: f.total_controls,
  })) || [];

  // Get pending controls (not compliant)
  const pendingControls = controls?.filter(c => {
    // In a real implementation, we'd check assessments
    return true; // For now show all controls
  }).slice(0, 3) || [];

  const recentAttestations = attestations?.slice(0, 3) || [];

  return (
    <MainLayout title="Governance & Compliance" subtitle="Regulatory controls, risk assessments, and compliance attestations">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Overall Score"
          value={`${complianceStats?.complianceScore || 0}%`}
          subtitle={`${complianceStats?.compliantAssessments || 0} of ${complianceStats?.totalControls || 0} controls`}
          icon={<Shield className="w-4 h-4 text-success" />}
          status="success"
          trend={{ value: 5, direction: "up" }}
        />
        <MetricCard
          title="Pending Controls"
          value={((complianceStats?.totalControls || 0) - (complianceStats?.compliantAssessments || 0)).toString()}
          subtitle="Need assessment"
          icon={<FileCheck className="w-4 h-4 text-warning" />}
          status="warning"
        />
        <MetricCard
          title="Attestations"
          value={(complianceStats?.signedAttestations || 0).toString()}
          subtitle={`${complianceStats?.pendingAttestations || 0} pending`}
          icon={<FileCheck className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Frameworks"
          value={(frameworks?.length || 0).toString()}
          subtitle="Active frameworks"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Compliance Overview */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Compliance Posture by Framework
            </h2>
            
            {frameworksLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : frameworks?.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No control frameworks configured</p>
                <Button variant="outline" size="sm" className="mt-4">Add Framework</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {frameworks?.map((framework) => {
                  const satisfied = Math.round((complianceStats?.complianceScore || 0) / 100 * framework.total_controls);
                  const pct = framework.total_controls > 0 ? Math.round((satisfied / framework.total_controls) * 100) : 0;
                  const status = pct >= 90 ? "success" : pct >= 70 ? "warning" : "danger";
                  return (
                    <div key={framework.id} className="bg-secondary/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-foreground">{framework.name}</span>
                        <span className={cn(
                          "text-2xl font-bold font-mono",
                          status === "success" ? "text-success" : status === "warning" ? "text-warning" : "text-danger"
                        )}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            status === "success" ? "bg-success" : status === "warning" ? "bg-warning" : "bg-danger"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {satisfied} of {framework.total_controls} controls satisfied
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Controls */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Controls Overview</h2>
              <Button variant="outline" size="sm">View All</Button>
            </div>

            {controls?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No controls defined yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingControls.map((control) => (
                  <div
                    key={control.id}
                    className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      control.severity === "high" || control.severity === "critical" ? "bg-danger" : 
                      control.severity === "medium" ? "bg-warning" : "bg-muted-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{control.code}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{control.title}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ComplianceGauge 
            overallScore={complianceStats?.complianceScore || 0} 
            controlGroups={controlGroups.length > 0 ? controlGroups : [{ name: "No frameworks", satisfied: 0, total: 0 }]} 
          />

          {/* Attestations */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Recent Attestations</h3>
            {attestationsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : recentAttestations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No attestations yet</p>
            ) : (
              <div className="space-y-3">
                {recentAttestations.map((att) => (
                  <div key={att.id} className="p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{att.title}</span>
                      <StatusBadge status={att.status === "approved" ? "compliant" : "pending"} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}</span>
                      {att.signed_by && (
                        <>
                          <span>•</span>
                          <span>Signed</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
