import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LiveMetrics } from "@/components/dashboard/LiveMetrics";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, TrendingUp, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDriftAlerts, useDriftAlertStats, DriftAlert } from "@/hooks/useDriftAlerts";
import { useModels, Model } from "@/hooks/useModels";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

// Static live metrics for now (would be real-time WebSocket in production)
const liveMetrics = [
  { label: "Requests/min", value: 12847, unit: "req/m", trend: [120, 125, 118, 130, 128, 135, 142, 138] },
  { label: "Avg Latency", value: 42, unit: "ms", trend: [45, 42, 48, 44, 41, 43, 42, 40] },
  { label: "Error Rate", value: 0.12, unit: "%", trend: [0.1, 0.15, 0.12, 0.11, 0.13, 0.12, 0.11, 0.12] },
  { label: "Safety Blocks", value: 23, unit: "today", trend: [2, 3, 1, 4, 2, 3, 5, 3] },
];

function getModelStatus(model: Model): "healthy" | "warning" | "critical" {
  const fairness = model.fairness_score ?? 100;
  const robustness = model.robustness_score ?? 100;
  const minScore = Math.min(fairness, robustness);
  
  if (minScore < 60) return "critical";
  if (minScore < 80) return "warning";
  return "healthy";
}

export default function Observability() {
  const { data: driftAlerts, isLoading: alertsLoading } = useDriftAlerts();
  const { data: driftStats } = useDriftAlertStats();
  const { data: models, isLoading: modelsLoading } = useModels();

  // Create model lookup
  const modelMap = models?.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
  }, {} as Record<string, Model>) || {};

  const openAlerts = driftAlerts?.filter(a => a.status !== 'resolved').slice(0, 5) || [];

  return (
    <MainLayout title="Observability" subtitle="Real-time telemetry, drift detection, and model health monitoring">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="System Health"
          value="98.7%"
          subtitle="All systems operational"
          icon={<Activity className="w-4 h-4 text-success" />}
          status="success"
        />
        <MetricCard
          title="Drift Alerts"
          value={(driftStats?.open || 0).toString()}
          subtitle={`${driftStats?.critical || 0} critical`}
          icon={<TrendingUp className="w-4 h-4 text-warning" />}
          status={driftStats?.critical ? "danger" : driftStats?.open ? "warning" : "success"}
        />
        <MetricCard
          title="Avg Latency"
          value="42ms"
          subtitle="p99: 156ms"
          icon={<Clock className="w-4 h-4 text-primary" />}
          trend={{ value: 8, direction: "down" }}
        />
        <MetricCard
          title="Total Alerts"
          value={(driftStats?.total || 0).toString()}
          subtitle="All time"
          icon={<AlertTriangle className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Model Health Table */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Model Health
              </h2>
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {modelsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : models?.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No models to monitor</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-3 text-xs font-semibold text-muted-foreground uppercase">Model</th>
                      <th className="text-center pb-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase">Fairness</th>
                      <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase">Robustness</th>
                      <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models?.map((model) => (
                      <tr key={model.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 font-medium text-foreground">{model.name}</td>
                        <td className="py-3 text-center">
                          <StatusBadge status={getModelStatus(model)} />
                        </td>
                        <td className="py-3 text-right font-mono text-sm text-foreground">{model.fairness_score ?? '-'}%</td>
                        <td className="py-3 text-right font-mono text-sm text-muted-foreground">{model.robustness_score ?? '-'}%</td>
                        <td className="py-3 text-right font-mono text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(model.updated_at), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Drift Alerts */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-warning" />
                Drift Alerts
              </h2>
              <Button variant="outline" size="sm">Configure Thresholds</Button>
            </div>

            {alertsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : openAlerts.length === 0 ? (
              <div className="text-center py-8 bg-success/5 rounded-xl border border-success/20">
                <Activity className="w-12 h-12 text-success mx-auto mb-4" />
                <p className="text-foreground font-medium">No active drift alerts</p>
                <p className="text-sm text-muted-foreground mt-1">All features are within normal distribution</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openAlerts.map((alert) => (
                  <DriftAlertCard 
                    key={alert.id} 
                    alert={alert} 
                    modelName={modelMap[alert.model_id]?.name || 'Unknown'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <LiveMetrics metrics={liveMetrics} />

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <RefreshCw className="w-4 h-4 mr-2" />
                Force Model Refresh
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="w-4 h-4 mr-2" />
                View All Alerts
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                Drift Analysis
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function DriftAlertCard({ alert, modelName }: { alert: DriftAlert; modelName: string }) {
  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-xl border-l-2",
      alert.severity === "critical" ? "bg-danger/5 border-l-danger" : "bg-warning/5 border-l-warning"
    )}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">{modelName}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-mono text-primary">{alert.feature}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono">{alert.drift_type}: {alert.drift_value.toFixed(2)}</span>
          <span>Detected {formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}</span>
        </div>
      </div>
      <StatusBadge status={alert.severity === "critical" ? "critical" : "warning"} />
    </div>
  );
}
