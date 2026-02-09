import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ComplianceGauge } from "@/components/dashboard/ComplianceGauge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, FileCheck, Download, ChevronRight, ExternalLink, Radio, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useControlFrameworks, useControls, useComplianceStats, useAttestations, useControlAssessments } from "@/hooks/useGovernance";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { useDataHealth } from "@/components/shared/DataHealthWrapper";
import { EnforcementBadge } from "@/components/shared/EnforcementBadge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function Governance() {
  const [realtimeCount, setRealtimeCount] = useState(0);
  const queryClient = useQueryClient();
  const { data: frameworks, isLoading: frameworksLoading, isError: frameworksError, refetch: refetchFrameworks } = useControlFrameworks();
  const { data: controls, isLoading: controlsLoading, refetch: refetchControls } = useControls();
  const { data: complianceStats, isLoading: statsLoading, refetch: refetchStats } = useComplianceStats();
  const { data: attestations, isLoading: attestationsLoading, refetch: refetchAttestations } = useAttestations();
  const { data: controlAssessments } = useControlAssessments();

  const isLoading = frameworksLoading || controlsLoading || statsLoading || attestationsLoading;
  const { status, lastUpdated } = useDataHealth(isLoading, frameworksError);
  
  const handleRetry = () => {
    refetchFrameworks();
    refetchControls();
    refetchStats();
    refetchAttestations();
  };

  // Build Map indexes for O(1) lookups instead of O(n²) nested finds
  const controlMap = new Map(controls?.map(c => [c.id, c]) || []);
  const assessmentsByFramework = new Map<string, typeof controlAssessments>();
  controlAssessments?.forEach(a => {
    const control = controlMap.get(a.control_id);
    if (!control) return;
    const fId = control.framework_id;
    if (!assessmentsByFramework.has(fId)) {
      assessmentsByFramework.set(fId, []);
    }
    assessmentsByFramework.get(fId)!.push(a);
  });

  // Build assessment lookup by control_id for pending controls
  const assessmentByControl = new Map(controlAssessments?.map(a => [a.control_id, a]) || []);

  // Control groups for compliance gauge - O(n) with Map
  const controlGroups = frameworks?.map(f => {
    const frameworkAssessments = assessmentsByFramework.get(f.id) || [];
    const satisfied = frameworkAssessments.filter(a => a.status === 'compliant').length;
    return {
      name: f.name,
      satisfied,
      total: f.total_controls,
    };
  }) || [];

  // Get pending controls - O(n) with Map lookup
  const pendingControls = controls?.filter(control => {
    const assessment = assessmentByControl.get(control.id);
    return !assessment || assessment.status !== 'compliant';
  }).slice(0, 5) || [];

  const recentAttestations = attestations?.slice(0, 3) || [];

  // Handle attestation download
  const handleDownloadAttestation = (attestation: typeof recentAttestations[0]) => {
    if (!attestation.document_url) {
      toast.error("No document available for this attestation");
      return;
    }
    
    try {
      // Handle data URLs
      if (attestation.document_url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = attestation.document_url;
        a.download = `attestation-${attestation.id.slice(0, 8)}.json`;
        a.click();
        toast.success("Attestation downloaded");
      } else {
        // Handle external URLs
        window.open(attestation.document_url, '_blank');
      }
    } catch (error) {
      toast.error("Failed to download attestation");
    }
  };

  // Handle attestation view
  const handleViewAttestation = (attestation: typeof recentAttestations[0]) => {
    if (!attestation.document_url) {
      toast.error("No document available for this attestation");
      return;
    }
    
    try {
      if (attestation.document_url.startsWith('data:')) {
        // Parse and display data URL content
        const jsonStr = decodeURIComponent(attestation.document_url.split(',')[1]);
        const data = JSON.parse(jsonStr);
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>Attestation - ${attestation.title}</title>
              <style>
                body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
                pre { background: white; padding: 20px; border-radius: 8px; overflow-x: auto; }
              </style>
              </head>
              <body>
                <h1>${attestation.title}</h1>
                <pre>${JSON.stringify(data, null, 2)}</pre>
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      } else {
        window.open(attestation.document_url, '_blank');
      }
    } catch (error) {
      toast.error("Failed to view attestation");
    }
  };

  // Realtime subscription for governance data
  useEffect(() => {
    const channel = supabase
      .channel('governance-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attestations' },
        (payload) => {
          setRealtimeCount(prev => prev + 1);
          queryClient.invalidateQueries({ queryKey: ['attestations'] });
          queryClient.invalidateQueries({ queryKey: ['compliance', 'stats'] });
          
          if (payload.eventType === 'INSERT') {
            toast.info('New attestation created');
          } else if (payload.eventType === 'UPDATE') {
            const att = payload.new as any;
            if (att.status === 'approved') {
              toast.success('Attestation signed');
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'control_assessments' },
        () => {
          setRealtimeCount(prev => prev + 1);
          queryClient.invalidateQueries({ queryKey: ['control-assessments'] });
          queryClient.invalidateQueries({ queryKey: ['compliance', 'stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <MainLayout 
      title="Governance & Compliance" 
      subtitle="Regulatory controls, risk assessments, and compliance attestations"
      headerActions={
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1.5">
            <Radio className="w-3 h-3 animate-pulse" />
            Realtime
          </Badge>
          {realtimeCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {realtimeCount} updates
            </Badge>
          )}
          <EnforcementBadge level="advisory" />
          <HealthIndicator 
            status={status} 
            lastUpdated={lastUpdated} 
            onRetry={handleRetry}
            showLabel 
          />
        </div>
      }
    >
      {/* Advisory Notice */}
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
        <div className="text-sm">
          <span className="font-medium text-warning">Advisory Mode:</span>{" "}
          <span className="text-muted-foreground">
            Compliance tracking is for planning purposes. Backend enforcement requires system approvals and risk gates to be configured.
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Overall Score"
          value={`${complianceStats?.complianceScore || 0}%`}
          subtitle={`${complianceStats?.compliantAssessments || 0} of ${complianceStats?.totalControls || 0} controls`}
          icon={<Shield className="w-4 h-4 text-success" />}
          status="success"
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="mt-4" disabled>Add Framework</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Framework management coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {frameworks?.map((framework) => {
                  const group = controlGroups.find(g => g.name === framework.name);
                  const satisfied = group?.satisfied || 0;
                  const pct = framework.total_controls > 0 ? Math.round((satisfied / framework.total_controls) * 100) : 0;
                  const fwStatus = pct >= 90 ? "success" : pct >= 70 ? "warning" : "danger";
                  return (
                    <div key={framework.id} className="bg-secondary/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-foreground">{framework.name}</span>
                        <span className={cn(
                          "text-2xl font-bold font-mono",
                          fwStatus === "success" ? "text-success" : fwStatus === "warning" ? "text-warning" : "text-danger"
                        )}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            fwStatus === "success" ? "bg-success" : fwStatus === "warning" ? "bg-warning" : "bg-danger"
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
              <h2 className="text-sm font-semibold text-foreground">Pending Controls</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" disabled>View All</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Controls detail page coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {controls?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No controls defined yet</p>
              </div>
            ) : pendingControls.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-success mx-auto mb-4" />
                <p className="text-muted-foreground">All controls are compliant</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingControls.map((control) => {
                  const assessment = controlAssessments?.find(a => a.control_id === control.id);
                  const assessmentStatus = assessment?.status || 'not_started';
                  return (
                    <div
                      key={control.id}
                      className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        control.severity === "high" || control.severity === "critical" ? "bg-danger" : 
                        control.severity === "medium" ? "bg-warning" : "bg-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{control.code}</span>
                          <Badge variant="outline" className="text-xs">
                            {assessmentStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{control.title}</p>
                      </div>
                    </div>
                  );
                })}
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => handleDownloadAttestation(att)}
                              disabled={!att.document_url}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </TooltipTrigger>
                          {!att.document_url && (
                            <TooltipContent>
                              <p>No document available</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => handleViewAttestation(att)}
                              disabled={!att.document_url}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </TooltipTrigger>
                          {!att.document_url && (
                            <TooltipContent>
                              <p>No document available</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
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