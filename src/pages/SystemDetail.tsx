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
import { RiskAssessmentWizard } from "@/components/risk/RiskAssessmentWizard";
import { RiskScoreCard } from "@/components/risk/RiskScoreCard";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { 
  ArrowLeft, Cpu, Server, Globe, FileText, AlertTriangle, Activity, 
  Settings, Play, Calendar, CheckCircle2, Clock, Archive, History
} from "lucide-react";
import { format } from "date-fns";

export default function SystemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showRiskWizard, setShowRiskWizard] = useState(false);

  const { data: system, isLoading: systemLoading } = useSystem(id ?? "");
  const { data: project } = useProject(system?.project_id ?? "");
  const { data: latestAssessment, isLoading: assessmentLoading } = useLatestRiskAssessment(id ?? "");
  const { data: allAssessments } = useRiskAssessments(id);

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
              </div>
            </div>
          </div>

          <Button onClick={() => setShowRiskWizard(true)} className="gap-2">
            <Play className="h-4 w-4" />
            Run Risk Assessment
          </Button>
        </div>

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
          <TabsList>
            <TabsTrigger value="risk" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Assessment
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="gap-2">
              <Activity className="h-4 w-4" />
              Evaluations
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
                  <div className="space-y-3">
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
        <RiskAssessmentWizard
          projectId={project.id}
          systemId={system.id}
          systemName={system.name}
          open={showRiskWizard}
          onOpenChange={setShowRiskWizard}
        />
      )}
    </MainLayout>
  );
}
