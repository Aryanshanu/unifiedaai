import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { DeploymentStatusBadge } from "@/components/governance/DeploymentStatusBadge";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { RiskAssessmentWizard } from "@/components/risk/RiskAssessmentWizard";
import { ImpactAssessmentWizard } from "@/components/impact/ImpactAssessmentWizard";
import { RuntimeRiskOverlay } from "@/components/dashboard/RuntimeRiskOverlay";
import { RequestLogsList } from "@/components/activity/RequestLogsList";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useModel } from "@/hooks/useModels";
import { useSystem } from "@/hooks/useSystems";
import { useRequestLogs } from "@/hooks/useRequestLogs";
import { useRiskAssessments } from "@/hooks/useRiskAssessments";
import { useImpactAssessments } from "@/hooks/useImpactAssessments";
import { useSystemApprovals, useRequestApproval } from "@/hooks/useSystemApprovals";
import { useIncidents } from "@/hooks/useIncidents";
import { useEvaluationRuns } from "@/hooks/useEvaluations";
import { useDriftAlerts } from "@/hooks/useDriftAlerts";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Play, 
  Edit, 
  Archive,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Eye,
  Brain,
  Lock,
  Scale,
  FolderOpen,
  ExternalLink,
  Activity,
  MessageSquare,
  Target,
  FileCheck
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Helper component to load logs by systemId
function SystemActivityLogs({ systemId }: { systemId: string }) {
  const { data: logs, isLoading } = useRequestLogs(systemId, 20);
  return <RequestLogsList logs={logs} isLoading={isLoading} />;
}

function getScoreExplanation(score: number | null, type: string): { status: string; reason: string; recommendation: string } {
  const value = score ?? 0;
  
  const explanations: Record<string, { low: string; medium: string; high: string; rec: string }> = {
    fairness: {
      low: "Significant bias detected across demographic groups. Model shows disparate impact on protected classes.",
      medium: "Minor bias patterns detected. Some demographic groups receive different treatment.",
      high: "Model demonstrates equitable treatment across all demographic groups.",
      rec: "Review training data distribution, implement fairness constraints, conduct cohort analysis."
    },
    robustness: {
      low: "Model is highly vulnerable to adversarial inputs and edge cases.",
      medium: "Model shows some vulnerability to perturbations and adversarial attacks.",
      high: "Model handles edge cases and adversarial inputs reliably.",
      rec: "Implement adversarial training, add input validation, increase test coverage."
    },
    privacy: {
      low: "High risk of PII leakage and data exposure detected.",
      medium: "Some privacy concerns identified in model outputs.",
      high: "Model maintains strong privacy protections.",
      rec: "Implement differential privacy, add PII detection, review data handling practices."
    },
    toxicity: {
      low: "Model frequently generates harmful or toxic content.",
      medium: "Occasional harmful content detected in edge cases.",
      high: "Model consistently produces safe, non-toxic outputs.",
      rec: "Add content filters, implement RLHF for safety, expand safety test cases."
    },
    overall: {
      low: "Model requires significant improvements before production use.",
      medium: "Model meets basic requirements but needs attention in some areas.",
      high: "Model meets all quality and safety requirements.",
      rec: "Focus on lowest scoring areas first, implement continuous monitoring."
    }
  };

  const exp = explanations[type] || explanations.overall;
  
  if (value < 60) {
    return { status: "critical", reason: exp.low, recommendation: exp.rec };
  } else if (value < 80) {
    return { status: "warning", reason: exp.medium, recommendation: exp.rec };
  }
  return { status: "healthy", reason: exp.high, recommendation: "Continue monitoring and regular evaluations." };
}

interface ScoreCardProps {
  title: string;
  score: number | null;
  icon: React.ReactNode;
  type: string;
}

function ScoreCard({ title, score, icon, type }: ScoreCardProps) {
  const explanation = getScoreExplanation(score, type);
  const value = score ?? 0;
  
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            explanation.status === "critical" ? "bg-danger/20 text-danger" :
            explanation.status === "warning" ? "bg-warning/20 text-warning" :
            "bg-success/20 text-success"
          )}>
            {icon}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">Threshold: 70%</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn(
            "text-3xl font-bold font-mono",
            value >= 80 ? "text-success" : value >= 60 ? "text-warning" : "text-danger"
          )}>
            {score !== null ? `${score}%` : "N/A"}
          </p>
          <Badge variant={explanation.status === "critical" ? "destructive" : explanation.status === "warning" ? "secondary" : "default"} className="mt-1">
            {explanation.status.toUpperCase()}
          </Badge>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Analysis</p>
          <p className="text-sm text-foreground">{explanation.reason}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Recommendation</p>
          <p className="text-sm text-muted-foreground">{explanation.recommendation}</p>
        </div>
      </div>
    </div>
  );
}

export default function ModelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showRiskWizard, setShowRiskWizard] = useState(false);
  const [showImpactWizard, setShowImpactWizard] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  
  const { data: model, isLoading: modelLoading, error: modelError } = useModel(id || "");
  const { data: system, isLoading: systemLoading } = useSystem(model?.system_id || "");
  const { data: incidents } = useIncidents();
  const { data: evaluationRuns } = useEvaluationRuns();
  const { data: driftAlerts } = useDriftAlerts();
  const { data: riskAssessments } = useRiskAssessments(model?.system_id);
  const { data: impactAssessments } = useImpactAssessments(model?.system_id);
  const { data: approvals } = useSystemApprovals(model?.system_id);
  const requestApproval = useRequestApproval();
  
  const modelIncidents = incidents?.filter(i => i.model_id === id) || [];
  const modelEvaluations = evaluationRuns?.filter(e => e.model_id === id) || [];
  const modelDriftAlerts = driftAlerts?.filter(d => d.model_id === id) || [];
  
  const latestRisk = riskAssessments?.[0];
  const latestImpact = impactAssessments?.[0];
  const latestApproval = approvals?.[0];
  
  const isLoading = modelLoading || systemLoading;
  
  if (isLoading) {
    return (
      <MainLayout title="Loading..." subtitle="">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (modelError || !model) {
    return (
      <MainLayout title="Model Not Found" subtitle="">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load model details</p>
          <Button variant="outline" onClick={() => navigate("/models")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Models
          </Button>
        </div>
      </MainLayout>
    );
  }
  
  const handleRequestApproval = async () => {
    if (!system) return;
    try {
      await requestApproval.mutateAsync(system.id);
      toast.success("Approval requested successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to request approval");
    }
  };

  return (
    <MainLayout 
      title={model.name} 
      subtitle={`${model.model_type} • v${model.version} • ${model.provider || "Custom"}`}
    >
      {/* Header Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/models")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1" />
        
        {/* System badges */}
        {system && (
          <>
            <RiskBadge tier={latestRisk?.risk_tier || 'low'} />
            <DeploymentStatusBadge status={system.deployment_status} />
          </>
        )}
        
        <Button variant="default" size="sm" className="bg-gradient-primary">
          <Play className="w-4 h-4 mr-2" />
          Run Evaluation
        </Button>
        
        {system && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/systems/${system.id}`)}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open System
          </Button>
        )}
      </div>

      {/* Project & System Context */}
      {(model.project || system) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {model.project && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate(`/projects/${model.project!.id}`)}
            >
              <FolderOpen className="w-4 h-4" />
              {model.project.name}
            </Button>
          )}
          {system && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              System: {system.name}
            </Badge>
          )}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ScoreRing score={model.overall_score ?? 0} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground">Overall Score</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-mono text-foreground">{modelEvaluations.length}</p>
          <p className="text-xs text-muted-foreground">Evaluations Run</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className={cn(
            "text-2xl font-bold font-mono",
            modelIncidents.filter(i => i.status !== 'resolved').length > 0 ? "text-warning" : "text-success"
          )}>
            {modelIncidents.filter(i => i.status !== 'resolved').length}
          </p>
          <p className="text-xs text-muted-foreground">Active Incidents</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className={cn(
            "text-2xl font-bold font-mono",
            modelDriftAlerts.filter(d => d.status !== 'resolved').length > 0 ? "text-warning" : "text-success"
          )}>
            {modelDriftAlerts.filter(d => d.status !== 'resolved').length}
          </p>
          <p className="text-xs text-muted-foreground">Drift Alerts</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className={cn(
            "text-2xl font-bold font-mono",
            system?.uri_score != null ? (
              system.uri_score >= 61 ? "text-danger" : 
              system.uri_score >= 31 ? "text-warning" : "text-success"
            ) : "text-muted-foreground"
          )}>
            {system?.uri_score != null ? `${Math.round(system.uri_score)}` : "--"}
          </p>
          <p className="text-xs text-muted-foreground">URI Score</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scores">RAI Scores</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h4 className="font-medium text-foreground">Model Information</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm text-foreground">{model.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm text-foreground">{model.model_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="text-sm text-foreground">v{model.version}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="text-sm text-foreground">{model.provider || "Custom"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className="mt-1">{model.status}</Badge>
                </div>
              </div>
            </div>
            
            {system && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h4 className="font-medium text-foreground">Linked System</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">System Name</p>
                    <p className="text-sm text-foreground">{system.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deployment Status</p>
                    <DeploymentStatusBadge status={system.deployment_status} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Tier</p>
                    <RiskBadge tier={latestRisk?.risk_tier || 'low'} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Requires Approval</p>
                    <p className="text-sm text-foreground">{system.requires_approval ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => navigate(`/systems/${system.id}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Full System Details
                </Button>
              </div>
            )}
            
            {!system && (
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center justify-center text-center">
                <AlertTriangle className="w-10 h-10 text-warning mb-3" />
                <h4 className="font-medium text-foreground">No Linked System</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  This model is not linked to a governed system.
                </p>
              </div>
            )}
          </div>
          
          {model.description && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="font-medium text-foreground mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{model.description}</p>
            </div>
          )}
        </TabsContent>

        {/* RAI Scores Tab */}
        <TabsContent value="scores" className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Responsible AI Score Breakdown</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Detailed analysis of each RAI pillar with explanations and recommendations.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ScoreCard 
              title="Fairness Score" 
              score={model.fairness_score} 
              icon={<Scale className="w-5 h-5" />}
              type="fairness"
            />
            <ScoreCard 
              title="Robustness Score" 
              score={model.robustness_score} 
              icon={<Shield className="w-5 h-5" />}
              type="robustness"
            />
            <ScoreCard 
              title="Privacy Score" 
              score={model.privacy_score} 
              icon={<Lock className="w-5 h-5" />}
              type="privacy"
            />
            <ScoreCard 
              title="Safety Score" 
              score={model.toxicity_score} 
              icon={<Eye className="w-5 h-5" />}
              type="toxicity"
            />
            <ScoreCard 
              title="Overall Score" 
              score={model.overall_score} 
              icon={<Brain className="w-5 h-5" />}
              type="overall"
            />
          </div>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Risk Assessment</h3>
              <p className="text-sm text-muted-foreground">Static and runtime risk analysis</p>
            </div>
            {system && (
              <Button onClick={() => setShowRiskWizard(true)}>
                <Target className="w-4 h-4 mr-2" />
                {latestRisk ? "Update Assessment" : "Run Assessment"}
              </Button>
            )}
          </div>
          
          {system && <RuntimeRiskOverlay systemId={system.id} />}
          
          {latestRisk ? (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-foreground">Latest Risk Assessment</h4>
                <RiskBadge tier={latestRisk.risk_tier} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Static Risk</p>
                  <p className="text-lg font-bold font-mono">{latestRisk.static_risk_score}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Runtime Risk</p>
                  <p className="text-lg font-bold font-mono">{latestRisk.runtime_risk_score}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">URI Score</p>
                  <p className="text-lg font-bold font-mono">{latestRisk.uri_score}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="text-lg font-bold font-mono">v{latestRisk.version}</p>
                </div>
              </div>
              {latestRisk.summary && (
                <p className="text-sm text-muted-foreground mt-4">{latestRisk.summary}</p>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">No Risk Assessment</p>
              <p className="text-sm text-muted-foreground mt-1">Run a risk assessment to evaluate this model.</p>
            </div>
          )}
        </TabsContent>

        {/* Impact Tab */}
        <TabsContent value="impact" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Impact Assessment</h3>
              <p className="text-sm text-muted-foreground">Business and societal impact analysis</p>
            </div>
            {system && (
              <Button onClick={() => setShowImpactWizard(true)}>
                <FileCheck className="w-4 h-4 mr-2" />
                {latestImpact ? "Update Assessment" : "Run Assessment"}
              </Button>
            )}
          </div>
          
          {latestImpact ? (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-foreground">Latest Impact Assessment</h4>
                <Badge>{latestImpact.quadrant.replace('_', ' / ')}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Overall Score</p>
                  <p className="text-lg font-bold font-mono">{latestImpact.overall_score}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="text-lg font-bold font-mono">v{latestImpact.version}</p>
                </div>
              </div>
              {latestImpact.summary && (
                <p className="text-sm text-muted-foreground mt-4">{latestImpact.summary}</p>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">No Impact Assessment</p>
              <p className="text-sm text-muted-foreground mt-1">Run an impact assessment to evaluate business impact.</p>
            </div>
          )}
        </TabsContent>

        {/* Governance Tab */}
        <TabsContent value="governance" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Governance Status</h3>
              <p className="text-sm text-muted-foreground">Approval workflow and deployment gates</p>
            </div>
            {system && system.requires_approval && !latestApproval && (
              <Button onClick={handleRequestApproval} disabled={requestApproval.isPending}>
                <FileCheck className="w-4 h-4 mr-2" />
                Request Approval
              </Button>
            )}
          </div>
          
          {system ? (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-foreground">Deployment Status</h4>
                  <DeploymentStatusBadge status={system.deployment_status} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Requires Approval</p>
                    <p className="text-sm font-medium">{system.requires_approval ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">System Type</p>
                    <p className="text-sm font-medium capitalize">{system.system_type}</p>
                  </div>
                </div>
              </div>
              
              {latestApproval && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h4 className="font-medium text-foreground mb-3">Latest Approval</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className="mt-1">{latestApproval.status}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Requested</p>
                      <p className="text-sm">{format(new Date(latestApproval.created_at), "PPP")}</p>
                    </div>
                  </div>
                  {latestApproval.reason && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">Reason</p>
                      <p className="text-sm">{latestApproval.reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-3" />
              <p className="text-foreground font-medium">No Linked System</p>
              <p className="text-sm text-muted-foreground mt-1">Governance requires a linked system.</p>
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Request Activity</h3>
          <p className="text-sm text-muted-foreground mb-4">Recent gateway traffic and decisions</p>
          
          {system ? (
            <SystemActivityLogs systemId={system.id} />
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">No Activity Data</p>
              <p className="text-sm text-muted-foreground mt-1">Activity requires a linked system.</p>
            </div>
          )}
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Evaluation History</h3>
            <Button variant="default" size="sm" className="bg-gradient-primary">
              <Play className="w-4 h-4 mr-2" />
              New Evaluation
            </Button>
          </div>
          
          {modelEvaluations.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No evaluations run yet</p>
              <Button variant="default" size="sm" className="mt-4 bg-gradient-primary">
                Run First Evaluation
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Fairness</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Robustness</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {modelEvaluations.map((eval_run) => (
                    <tr key={eval_run.id} className="border-t border-border hover:bg-secondary/30 transition-colors cursor-pointer">
                      <td className="p-4 text-sm text-foreground">
                        {format(new Date(eval_run.created_at), "MMM d, yyyy HH:mm")}
                      </td>
                      <td className="p-4">
                        <Badge variant={eval_run.status === 'completed' ? 'default' : eval_run.status === 'failed' ? 'destructive' : 'secondary'}>
                          {eval_run.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "font-mono font-medium",
                          (eval_run.fairness_score ?? 0) >= 80 ? "text-success" : (eval_run.fairness_score ?? 0) >= 60 ? "text-warning" : "text-danger"
                        )}>
                          {eval_run.fairness_score ?? "-"}%
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "font-mono font-medium",
                          (eval_run.robustness_score ?? 0) >= 80 ? "text-success" : (eval_run.robustness_score ?? 0) >= 60 ? "text-warning" : "text-danger"
                        )}>
                          {eval_run.robustness_score ?? "-"}%
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "font-mono font-medium",
                          (eval_run.overall_score ?? 0) >= 80 ? "text-success" : (eval_run.overall_score ?? 0) >= 60 ? "text-warning" : "text-danger"
                        )}>
                          {eval_run.overall_score ?? "-"}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Related Incidents</h3>
          
          {modelIncidents.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-foreground font-medium">No incidents reported</p>
              <p className="text-sm text-muted-foreground">This model has a clean incident record.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {modelIncidents.map((incident) => (
                <div key={incident.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center mt-0.5",
                        incident.severity === 'critical' ? "bg-danger/20 text-danger" :
                        incident.severity === 'high' ? "bg-warning/20 text-warning" :
                        "bg-muted text-muted-foreground"
                      )}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{incident.title}</h4>
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                          </span>
                          <Badge variant={incident.status === 'resolved' ? 'default' : 'secondary'}>
                            {incident.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {incident.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Copilot FAB */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-primary"
        onClick={() => setCopilotOpen(true)}
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      {/* Wizards */}
      {system && model.project_id && (
        <>
          <RiskAssessmentWizard
            open={showRiskWizard}
            onOpenChange={setShowRiskWizard}
            systemId={system.id}
            projectId={model.project_id}
            systemName={system.name}
          />
          <ImpactAssessmentWizard
            open={showImpactWizard}
            onOpenChange={setShowImpactWizard}
            systemId={system.id}
            projectId={model.project_id}
            systemName={system.name}
          />
        </>
      )}
      
      {/* Copilot Drawer */}
      {system && (
        <CopilotDrawer
          systemId={system.id}
          systemName={system.name}
        />
      )}
    </MainLayout>
  );
}
