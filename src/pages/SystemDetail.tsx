import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSystem } from "@/hooks/useSystems";
import { useProject } from "@/hooks/useProjects";
import { useLatestRiskAssessment, useRiskAssessments } from "@/hooks/useRiskAssessments";
import { useLatestImpactAssessment, useImpactAssessments } from "@/hooks/useImpactAssessments";
import { useSystemApprovals, useRequestApproval, useProcessApproval } from "@/hooks/useSystemApprovals";
import { useRequestLogs, useActivityMetrics } from "@/hooks/useRequestLogs";
import { RiskAssessmentWizard } from "@/components/risk/RiskAssessmentWizard";
import { RiskScoreCard } from "@/components/risk/RiskScoreCard";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { ImpactAssessmentWizard } from "@/components/impact/ImpactAssessmentWizard";
import { ImpactScoreCard } from "@/components/impact/ImpactScoreCard";
import { ImpactMatrix } from "@/components/impact/ImpactMatrix";
import { DeploymentStatusBadge } from "@/components/governance/DeploymentStatusBadge";
import { UsageSummaryCard } from "@/components/activity/UsageSummaryCard";
import { UsageChart } from "@/components/activity/UsageChart";
import { RequestLogsList } from "@/components/activity/RequestLogsList";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { RuntimeRiskOverlay } from "@/components/dashboard/RuntimeRiskOverlay";
import { 
  ArrowLeft, Cpu, Server, Globe, FileText, AlertTriangle, Activity, 
  Settings, Play, Calendar, CheckCircle2, Clock, Archive, History,
  Target, Shield, CheckCircle, XCircle, Zap
} from "lucide-react";
import { format } from "date-fns";

export default function SystemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showRiskWizard, setShowRiskWizard] = useState(false);
  const [showImpactWizard, setShowImpactWizard] = useState(false);

  const { data: system, isLoading: systemLoading, refetch: refetchSystem } = useSystem(id ?? "");
  const { data: project } = useProject(system?.project_id ?? "");
  const { data: latestAssessment, isLoading: assessmentLoading } = useLatestRiskAssessment(id ?? "");
  const { data: allAssessments } = useRiskAssessments(id);
  const { data: latestImpact, isLoading: impactLoading } = useLatestImpactAssessment(id ?? "");
  const { data: allImpactAssessments } = useImpactAssessments(id);
  const { data: approvals } = useSystemApprovals(id ?? "");
  const { data: requestLogs, isLoading: logsLoading } = useRequestLogs(id ?? "");
  const { data: activityMetrics, isLoading: metricsLoading } = useActivityMetrics(id ?? "");
  const requestApproval = useRequestApproval();
  const processApproval = useProcessApproval();

  const getSystemTypeIcon = (type: string) => {
    switch (type) {
      case "model": return Cpu;
      case "agent": return Server;
      case "provider": return Globe;
      case "pipeline": return FileText;
      default: return Cpu;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2, label: "Active" };
      case "draft":
        return { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock, label: "Draft" };
      case "deprecated":
        return { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Archive, label: "Deprecated" };
      default:
        return { color: "bg-muted text-muted-foreground", icon: Clock, label: status };
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case "openai": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "anthropic": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "google": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "huggingface": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    }
  };

  if (systemLoading) {
    return (
      <MainLayout title="Loading..." subtitle="Please wait">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!system) {
    return (
      <MainLayout title="System Not Found">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Cpu className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold">System Not Found</h2>
          <p className="text-muted-foreground mt-2">The system you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(-1)} className="mt-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </MainLayout>
    );
  }

  const Icon = getSystemTypeIcon(system.system_type);
  const statusConfig = getStatusConfig(system.status);
  const StatusIcon = statusConfig.icon;

  return (
    <MainLayout title={system.name} subtitle={`${system.system_type} • ${system.provider}`}>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* System Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{system.name}</h1>
              {project && (
                <p className="text-muted-foreground mt-1">
                  Project: {project.name}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className={statusConfig.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline" className={getProviderColor(system.provider)}>
                  {system.provider}
                </Badge>
                {system.model_name && (
                  <Badge variant="outline" className="bg-muted">
                    {system.model_name}
                  </Badge>
                )}
                <RiskBadge 
                  tier={latestAssessment?.risk_tier} 
                  score={latestAssessment?.uri_score}
                  showScore
                />
                <DeploymentStatusBadge 
                  status={system.deployment_status} 
                  requiresApproval={system.requires_approval}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopilotDrawer systemId={system.id} systemName={system.name} />
            <Button onClick={() => setShowRiskWizard(true)} variant="outline" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Assessment
            </Button>
            <Button onClick={() => setShowImpactWizard(true)} className="gap-2">
              <Target className="h-4 w-4" />
              Impact Assessment
            </Button>
          </div>
        </div>

        {/* Missing Assessments Banner - FIX #9: Show blocking message */}
        {(!latestAssessment || !latestImpact) && (
          <div className="p-4 rounded-xl border-2 border-destructive/50 bg-destructive/5 flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Assessments Required for Deployment</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {!latestAssessment && !latestImpact && (
                  <>
                    <strong>Risk and Impact assessments are missing.</strong> This system cannot be deployed or used via the gateway until both assessments are complete.
                  </>
                )}
                {!latestAssessment && latestImpact && (
                  <>
                    <strong>Risk assessment is missing.</strong> Complete it to enable gateway access and governance approval.
                  </>
                )}
                {latestAssessment && !latestImpact && (
                  <>
                    <strong>Impact assessment is missing.</strong> Complete it for full governance compliance and gateway access.
                  </>
                )}
              </p>
              <div className="flex gap-2 mt-3">
                {!latestAssessment && (
                  <Button size="sm" variant="default" onClick={() => setShowRiskWizard(true)}>
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Run Risk Assessment
                  </Button>
                )}
                {!latestImpact && (
                  <Button size="sm" variant="default" onClick={() => setShowImpactWizard(true)}>
                    <Target className="h-4 w-4 mr-1" />
                    Run Impact Assessment
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Use Case */}
        {system.use_case && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">{system.use_case}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {latestAssessment ? Math.round(latestAssessment.uri_score) : "--"}
                  </p>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{allAssessments?.length ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Assessments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Incidents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{format(new Date(system.created_at), "MMM d, yyyy")}</p>
                  <p className="text-sm text-muted-foreground">Created</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="risk" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="risk" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk
            </TabsTrigger>
            <TabsTrigger value="impact" className="gap-2">
              <Target className="h-4 w-4" />
              Impact
            </TabsTrigger>
            <TabsTrigger value="governance" className="gap-2">
              <Shield className="h-4 w-4" />
              Governance
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="gap-2">
              <Activity className="h-4 w-4" />
              Evaluations
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Zap className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="risk" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latest Assessment */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Current Risk Status</h3>
                  {latestAssessment && (
                    <span className="text-sm text-muted-foreground">
                      v{latestAssessment.version}
                    </span>
                  )}
                </div>
                {assessmentLoading ? (
                  <Skeleton className="h-[400px]" />
                ) : (
                  <RiskScoreCard assessment={latestAssessment ?? null} />
                )}
              </div>

              {/* Runtime Risk Overlay */}
              <div className="space-y-4">
                <RuntimeRiskOverlay systemId={id!} />
              </div>
            </div>

            {/* Assessment History */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Assessment History</h3>
              {allAssessments?.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No assessments yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allAssessments?.map((assessment) => (
                    <Card key={assessment.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <RiskBadge tier={assessment.risk_tier} size="sm" />
                            <div>
                              <p className="text-sm font-medium">Version {assessment.version}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(assessment.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{Math.round(assessment.uri_score)}</p>
                            <p className="text-xs text-muted-foreground">URI Score</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Impact Tab */}
          <TabsContent value="impact" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Impact Score Card */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Current Impact Status</h3>
                  {latestImpact && (
                    <span className="text-sm text-muted-foreground">
                      v{latestImpact.version}
                    </span>
                  )}
                </div>
                {impactLoading ? (
                  <Skeleton className="h-[400px]" />
                ) : (
                  <ImpactScoreCard assessment={latestImpact ?? null} />
                )}
              </div>

              {/* Impact Matrix */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Risk × Impact Matrix</h3>
                <ImpactMatrix 
                  riskTier={latestAssessment?.risk_tier}
                  impactScore={latestImpact?.overall_score}
                />
                
                {/* Impact History */}
                <h3 className="text-lg font-semibold mt-6">Assessment History</h3>
                {allImpactAssessments?.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <Target className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">No impact assessments yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {allImpactAssessments?.map((assessment) => (
                      <Card key={assessment.id} className="hover:border-primary/30 transition-colors">
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Version {assessment.version}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(assessment.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">{Math.round(assessment.overall_score)}</p>
                              <p className="text-xs text-muted-foreground capitalize">{assessment.quadrant.replace(/_/g, " ")}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Governance Tab */}
          <TabsContent value="governance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Deployment Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Deployment Governance
                  </CardTitle>
                  <CardDescription>
                    Current deployment status and approval requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <DeploymentStatusBadge 
                      status={system.deployment_status} 
                      requiresApproval={system.requires_approval}
                      size="lg"
                    />
                    {system.requires_approval && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        Requires Approval
                      </Badge>
                    )}
                  </div>

                  {system.requires_approval && system.deployment_status !== "approved" && system.deployment_status !== "deployed" && (
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm text-muted-foreground mb-3">
                        This system requires approval before deployment due to elevated risk or impact levels.
                      </p>
                      {/* FIX #9: Disable button if assessments missing */}
                      {system.deployment_status === "draft" && (
                        <>
                          {(!latestAssessment || !latestImpact) ? (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                              <p className="text-sm text-destructive font-medium">
                                Cannot request approval until Risk & Impact assessments are complete.
                              </p>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => requestApproval.mutate(system.id, {
                                onSuccess: () => refetchSystem()
                              })}
                              disabled={requestApproval.isPending}
                              className="gap-2"
                            >
                              <Shield className="h-4 w-4" />
                              Request Approval
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Approval Actions for pending */}
                  {approvals?.[0]?.status === "pending" && (
                    <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                      <p className="text-sm font-medium mb-3">Pending Approval Request</p>
                      <div className="flex gap-2">
                        <Button 
                          variant="default"
                          size="sm"
                          onClick={() => processApproval.mutate({ 
                            approvalId: approvals[0].id, 
                            systemId: system.id,
                            status: "approved",
                            reason: "Approved via governance review"
                          }, {
                            onSuccess: () => refetchSystem()
                          })}
                          className="gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => processApproval.mutate({ 
                            approvalId: approvals[0].id, 
                            systemId: system.id,
                            status: "rejected",
                            reason: "Rejected - requires remediation"
                          }, {
                            onSuccess: () => refetchSystem()
                          })}
                          className="gap-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Approval History */}
              <Card>
                <CardHeader>
                  <CardTitle>Approval History</CardTitle>
                  <CardDescription>
                    Track of all approval requests and decisions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {approvals?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <History className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">No approval requests yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {approvals?.map((approval) => (
                        <div key={approval.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            {approval.status === "approved" && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            {approval.status === "rejected" && (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            {approval.status === "pending" && (
                              <Clock className="h-5 w-5 text-yellow-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium capitalize">{approval.status}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(approval.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          {approval.reason && (
                            <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {approval.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evaluations">
            <Card>
              <CardHeader>
                <CardTitle>Evaluation Results</CardTitle>
                <CardDescription>
                  Run evaluations from the RAI engines to generate runtime risk data.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Evaluations Yet</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Use the RAI Engines (Fairness, Privacy, etc.) to evaluate this system and generate runtime risk metrics.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UsageSummaryCard metrics={activityMetrics ?? null} isLoading={metricsLoading} />
              <UsageChart metrics={activityMetrics ?? null} isLoading={metricsLoading} />
            </div>
            <RequestLogsList logs={requestLogs} isLoading={logsLoading} />
          </TabsContent>

          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>
                  Technical details and API configuration for this system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">System Type</p>
                    <p className="font-medium capitalize">{system.system_type}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p className="font-medium">{system.provider}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Model Name</p>
                    <p className="font-medium">{system.model_name || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{system.status}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Endpoint</p>
                    <p className="font-medium font-mono text-sm break-all">{system.endpoint || "Not configured"}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">API Token</p>
                    <p className="font-medium">{system.api_token_encrypted ? "••••••••" : "Not configured"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {project && (
        <>
          <RiskAssessmentWizard
            projectId={project.id}
            systemId={system.id}
            systemName={system.name}
            open={showRiskWizard}
            onOpenChange={setShowRiskWizard}
          />
          <ImpactAssessmentWizard
            projectId={project.id}
            systemId={system.id}
            systemName={system.name}
            open={showImpactWizard}
            onOpenChange={setShowImpactWizard}
          />
        </>
      )}
    </MainLayout>
  );
}
