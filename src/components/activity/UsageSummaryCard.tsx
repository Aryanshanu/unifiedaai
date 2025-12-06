import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Clock, XCircle, Zap } from "lucide-react";
import type { ActivityMetrics } from "@/hooks/useRequestLogs";

interface UsageSummaryCardProps {
  metrics: ActivityMetrics | null;
  isLoading?: boolean;
}

export function UsageSummaryCard({ metrics, isLoading }: UsageSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Summary (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Summary (24h)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">No activity data yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start making requests through the AI Gateway
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      icon: Zap,
      label: "Total Requests",
      value: metrics.totalRequests,
      color: "text-primary",
    },
    {
      icon: XCircle,
      label: "Blocked",
      value: metrics.blockedRequests,
      color: metrics.blockedRequests > 0 ? "text-red-500" : "text-muted-foreground",
    },
    {
      icon: AlertTriangle,
      label: "Warned",
      value: metrics.warnedRequests,
      color: metrics.warnedRequests > 0 ? "text-yellow-500" : "text-muted-foreground",
    },
    {
      icon: Clock,
      label: "Avg Latency",
      value: `${metrics.avgLatency}ms`,
      color: metrics.avgLatency > 2000 ? "text-orange-500" : "text-muted-foreground",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activity Summary (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {metrics.errorRate > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm font-medium text-red-500">
              Error Rate: {metrics.errorRate}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
