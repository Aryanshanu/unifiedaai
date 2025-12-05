import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PillarOverview } from "@/components/dashboard/PillarOverview";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { LiveMetrics } from "@/components/dashboard/LiveMetrics";
import { ComplianceGauge } from "@/components/dashboard/ComplianceGauge";
import { ModelCard } from "@/components/dashboard/ModelCard";
import {
  Database,
  Activity,
  Shield,
  Users,
  GitBranch,
  Lock,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { useModels, Model } from "@/hooks/useModels";
import { useIncidents } from "@/hooks/useIncidents";
import { useReviewQueueStats } from "@/hooks/useReviewQueue";
import { useComplianceStats } from "@/hooks/useGovernance";
import { useEvaluationStats } from "@/hooks/useEvaluations";
import { useDriftAlertStats } from "@/hooks/useDriftAlerts";
import { usePolicyStats } from "@/hooks/usePolicies";
import { Skeleton } from "@/components/ui/skeleton";

// Helper to derive status from scores
function getModelStatus(model: Model): "healthy" | "warning" | "critical" {
  const fairness = model.fairness_score ?? 100;
  const robustness = model.robustness_score ?? 100;
  const minScore = Math.min(fairness, robustness);
  
  if (minScore < 60) return "critical";
  if (minScore < 80) return "warning";
  return "healthy";
}

// Static live metrics for now (would be real-time in production)
const liveMetrics = [
  { label: "Requests/min", value: 12847, unit: "req/m", trend: [120, 125, 118, 130, 128, 135, 142, 138] },
  { label: "Avg Latency", value: 42, unit: "ms", trend: [45, 42, 48, 44, 41, 43, 42, 40] },
  { label: "Safety Blocks", value: 23, unit: "today", trend: [2, 3, 1, 4, 2, 3, 5, 3] },
];

export default function Index() {
  const { data: models, isLoading: modelsLoading } = useModels();
  const { data: incidents, isLoading: incidentsLoading } = useIncidents();
  const { data: reviewStats } = useReviewQueueStats();
  const { data: complianceStats } = useComplianceStats();
  const { data: evalStats } = useEvaluationStats();
  const { data: driftStats } = useDriftAlertStats();
  const { data: policyStats } = usePolicyStats();

  // Count incidents per model
  const incidentCountByModel = incidents?.reduce((acc, inc) => {
    if (inc.model_id && inc.status !== 'resolved') {
      acc[inc.model_id] = (acc[inc.model_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  // Prepare alerts from incidents
  const alerts = incidents?.slice(0, 5).map(inc => ({
    id: inc.id,
    type: inc.severity === 'critical' ? 'critical' as const : 
          inc.severity === 'high' ? 'warning' as const : 
          inc.status === 'resolved' ? 'success' as const : 'info' as const,
    title: inc.title,
    description: inc.description || '',
    timestamp: new Date(inc.created_at).toLocaleString(),
    model: undefined,
  })) || [];

  // Compute stats
  const modelStats = {
    total: models?.length || 0,
    pending: models?.filter(m => m.status === 'draft').length || 0,
  };

  const incidentStats = {
    total: incidents?.filter(i => i.status !== 'resolved').length || 0,
    critical: incidents?.filter(i => i.severity === 'critical' && i.status !== 'resolved').length || 0,
    warning: incidents?.filter(i => (i.severity === 'high' || i.severity === 'medium') && i.status !== 'resolved').length || 0,
  };

  // Control groups for compliance gauge
  const controlGroups = complianceStats?.frameworks?.map(f => ({
    name: f.name,
    satisfied: Math.round((complianceStats.complianceScore / 100) * f.total_controls),
    total: f.total_controls,
  })) || [
    { name: "Loading...", satisfied: 0, total: 0 },
  ];

  // Get top 4 models for display
  const topModels = models?.slice(0, 4) || [];

  return (
    <MainLayout title="Control Tower" subtitle="Enterprise AI Governance Overview">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Active Models"
          value={modelStats.total.toString()}
          subtitle={`${modelStats.pending} pending review`}
          icon={<Database className="w-4 h-4 text-primary" />}
          trend={{ value: 12, direction: "up" }}
          status="neutral"
        />
        <MetricCard
          title="Risk Incidents"
          value={incidentStats.total.toString()}
          subtitle={`${incidentStats.critical} critical, ${incidentStats.warning} warning`}
          icon={<AlertTriangle className="w-4 h-4 text-warning" />}
          trend={{ value: 8, direction: "down" }}
          status={incidentStats.critical > 0 ? "danger" : incidentStats.warning > 0 ? "warning" : "success"}
        />
        <MetricCard
          title="Compliance Score"
          value={`${complianceStats?.complianceScore || 0}%`}
          subtitle={`${complianceStats?.pendingAttestations || 0} attestations pending`}
          icon={<Shield className="w-4 h-4 text-success" />}
          trend={{ value: 5, direction: "up" }}
          status="success"
        />
        <MetricCard
          title="HITL Queue"
          value={(reviewStats?.pending || 0).toString()}
          subtitle={`${reviewStats?.overdue || 0} overdue`}
          icon={<Users className="w-4 h-4 text-muted-foreground" />}
          trend={{ value: 15, direction: reviewStats?.overdue ? "up" : "down" }}
          status={reviewStats?.overdue ? "warning" : "neutral"}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pillars */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pillar Overview Cards */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Core Pillars
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <PillarOverview
                title="Evaluation"
                icon={<Activity className="w-5 h-5" />}
                score={evalStats?.avgScore || 0}
                metrics={[
                  { label: "Tests Run", value: evalStats?.total || 0 },
                  { label: "Pass Rate", value: `${evalStats?.completed ? Math.round((evalStats.completed / evalStats.total) * 100) : 0}%` },
                ]}
                href="/evaluation"
              />
              <PillarOverview
                title="Observability"
                icon={<Activity className="w-5 h-5" />}
                score={100 - (driftStats?.open || 0) * 5}
                metrics={[
                  { label: "Uptime", value: "99.9%" },
                  { label: "Drift Alerts", value: driftStats?.open || 0 },
                ]}
                href="/observability"
              />
              <PillarOverview
                title="Governance"
                icon={<Shield className="w-5 h-5" />}
                score={complianceStats?.complianceScore || 0}
                metrics={[
                  { label: "Controls", value: `${complianceStats?.compliantAssessments || 0}/${complianceStats?.totalControls || 0}` },
                  { label: "Attestations", value: complianceStats?.signedAttestations || 0 },
                ]}
                href="/governance"
              />
              <PillarOverview
                title="HITL"
                icon={<Users className="w-5 h-5" />}
                score={reviewStats?.pending ? Math.max(0, 100 - reviewStats.pending * 5) : 100}
                metrics={[
                  { label: "Pending", value: reviewStats?.pending || 0 },
                  { label: "In Progress", value: reviewStats?.inProgress || 0 },
                ]}
                href="/hitl"
                accentColor={reviewStats?.overdue ? "warning" : undefined}
              />
              <PillarOverview
                title="Knowledge Graph"
                icon={<GitBranch className="w-5 h-5" />}
                score={95}
                metrics={[
                  { label: "Nodes", value: "2.4K" },
                  { label: "Relations", value: "8.1K" },
                ]}
                href="/lineage"
              />
              <PillarOverview
                title="Policy"
                icon={<Lock className="w-5 h-5" />}
                score={policyStats?.activePolicies ? 89 : 0}
                metrics={[
                  { label: "Active Rules", value: policyStats?.activePolicies || 0 },
                  { label: "Blocked", value: policyStats?.blockedViolations || 0 },
                ]}
                href="/policy"
              />
            </div>
          </div>

          {/* Model Registry Preview */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Model Registry
            </h2>
            {modelsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-3 w-24 mb-4" />
                    <div className="flex gap-6 mb-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <Skeleton className="h-12 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : topModels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    name={model.name}
                    type={model.model_type}
                    version={model.version}
                    status={getModelStatus(model)}
                    fairnessScore={model.fairness_score}
                    robustnessScore={model.robustness_score}
                    incidents={incidentCountByModel[model.id] || 0}
                    updatedAt={model.updated_at}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-card border border-border rounded-xl">
                <p className="text-muted-foreground">No models registered yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Alerts & Metrics */}
        <div className="space-y-6">
          <LiveMetrics metrics={liveMetrics} />
          <ComplianceGauge 
            overallScore={complianceStats?.complianceScore || 0} 
            controlGroups={controlGroups} 
          />
          <AlertFeed alerts={alerts.length > 0 ? alerts : [
            { id: "empty", type: "info" as const, title: "No recent alerts", description: "System is operating normally", timestamp: "Now" }
          ]} />
        </div>
      </div>
    </MainLayout>
  );
}
