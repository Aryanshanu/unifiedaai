import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LiveMetrics } from "@/components/dashboard/LiveMetrics";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, TrendingUp, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const liveMetrics = [
  { label: "Requests/min", value: 12847, unit: "req/m", trend: [120, 125, 118, 130, 128, 135, 142, 138] },
  { label: "Avg Latency", value: 42, unit: "ms", trend: [45, 42, 48, 44, 41, 43, 42, 40] },
  { label: "Error Rate", value: 0.12, unit: "%", trend: [0.1, 0.15, 0.12, 0.11, 0.13, 0.12, 0.11, 0.12] },
  { label: "Safety Blocks", value: 23, unit: "today", trend: [2, 3, 1, 4, 2, 3, 5, 3] },
];

const driftAlerts = [
  { id: "1", model: "Fraud Detection v3", feature: "transaction_amount", drift: "PSI: 0.23", severity: "warning", detected: "15m ago" },
  { id: "2", model: "Credit Scoring v2", feature: "income_bracket", drift: "KL: 0.18", severity: "warning", detected: "1h ago" },
  { id: "3", model: "Loan Approval v1", feature: "employment_status", drift: "EMD: 0.31", severity: "critical", detected: "2h ago" },
];

const modelHealth = [
  { name: "Credit Scoring v2", status: "warning", uptime: "99.2%", latency: "45ms", throughput: "2.1K/min" },
  { name: "Fraud Detection v3", status: "healthy", uptime: "99.9%", latency: "32ms", throughput: "5.4K/min" },
  { name: "Support Chatbot", status: "healthy", uptime: "99.8%", latency: "120ms", throughput: "890/min" },
  { name: "Loan Approval v1", status: "critical", uptime: "98.1%", latency: "78ms", throughput: "1.2K/min" },
];

export default function Observability() {
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
          value="3"
          subtitle="1 critical, 2 warning"
          icon={<TrendingUp className="w-4 h-4 text-warning" />}
          status="warning"
        />
        <MetricCard
          title="Avg Latency"
          value="42ms"
          subtitle="p99: 156ms"
          icon={<Clock className="w-4 h-4 text-primary" />}
          trend={{ value: 8, direction: "down" }}
        />
        <MetricCard
          title="Safety Events"
          value="23"
          subtitle="Last 24 hours"
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

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-3 text-xs font-semibold text-muted-foreground uppercase">Model</th>
                    <th className="text-center pb-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase">Uptime</th>
                    <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase">Latency</th>
                    <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase">Throughput</th>
                  </tr>
                </thead>
                <tbody>
                  {modelHealth.map((model) => (
                    <tr key={model.name} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 font-medium text-foreground">{model.name}</td>
                      <td className="py-3 text-center">
                        <StatusBadge status={model.status as any} />
                      </td>
                      <td className="py-3 text-right font-mono text-sm text-foreground">{model.uptime}</td>
                      <td className="py-3 text-right font-mono text-sm text-muted-foreground">{model.latency}</td>
                      <td className="py-3 text-right font-mono text-sm text-muted-foreground">{model.throughput}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

            <div className="space-y-3">
              {driftAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-l-2",
                    alert.severity === "critical" ? "bg-danger/5 border-l-danger" : "bg-warning/5 border-l-warning"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{alert.model}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs font-mono text-primary">{alert.feature}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{alert.drift}</span>
                      <span>Detected {alert.detected}</span>
                    </div>
                  </div>
                  <StatusBadge status={alert.severity === "critical" ? "critical" : "warning"} />
                </div>
              ))}
            </div>
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
