import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useModel } from "@/hooks/useModels";
import { useIncidents } from "@/hooks/useIncidents";
import { useEvaluationRuns } from "@/hooks/useEvaluations";
import { useDriftAlerts } from "@/hooks/useDriftAlerts";
import { 
  ArrowLeft, 
  Play, 
  Edit, 
  Archive, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Shield,
  Eye,
  Brain,
  Lock,
  Scale
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

function getModelStatus(model: { fairness_score: number | null; robustness_score: number | null }): "healthy" | "warning" | "critical" {
  const fairness = model.fairness_score ?? 100;
  const robustness = model.robustness_score ?? 100;
  const minScore = Math.min(fairness, robustness);
  
  if (minScore < 60) return "critical";
  if (minScore < 80) return "warning";
  return "healthy";
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
  
  const { data: model, isLoading, error } = useModel(id || "");
  const { data: incidents } = useIncidents();
  const { data: evaluationRuns } = useEvaluationRuns();
  const { data: driftAlerts } = useDriftAlerts();
  
  const modelIncidents = incidents?.filter(i => i.model_id === id) || [];
  const modelEvaluations = evaluationRuns?.filter(e => e.model_id === id) || [];
  const modelDriftAlerts = driftAlerts?.filter(d => d.model_id === id) || [];
  
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
  
  if (error || !model) {
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
  
  const status = getModelStatus(model);

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
        <StatusBadge status={status} />
        <Button variant="default" size="sm" className="bg-gradient-primary">
          <Play className="w-4 h-4 mr-2" />
          Run Evaluation
        </Button>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button variant="outline" size="sm">
          <Archive className="w-4 h-4 mr-2" />
          Archive
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
      </div>

      <Tabs defaultValue="scores" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="scores">RAI Scores</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluation History</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="details">Model Details</TabsTrigger>
        </TabsList>

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

        <TabsContent value="details" className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Model Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h4 className="font-medium text-foreground">Basic Information</h4>
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
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className="mt-1">{model.status}</Badge>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h4 className="font-medium text-foreground">Configuration</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="text-sm text-foreground">{model.provider || "Custom"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Use Case</p>
                  <p className="text-sm text-foreground">{model.use_case || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Endpoint</p>
                  <p className="text-sm text-foreground font-mono text-xs">{model.endpoint || "Not configured"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm text-foreground">{model.description || "No description provided"}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h4 className="font-medium text-foreground">Timestamps</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">{format(new Date(model.created_at), "PPP 'at' p")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm text-foreground">{format(new Date(model.updated_at), "PPP 'at' p")}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
