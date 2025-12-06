import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { 
  Activity, ShieldAlert, Clock, AlertTriangle, 
  Server, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; direction: "up" | "down" | "neutral" };
  status?: "success" | "warning" | "danger" | "neutral";
}

function MetricCard({ title, value, subtitle, icon, trend, status = "neutral" }: MetricCardProps) {
  const statusColors = {
    success: "text-green-500",
    warning: "text-yellow-500",
    danger: "text-red-500",
    neutral: "text-muted-foreground",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className={cn("text-xs mt-1", statusColors[status])}>{subtitle}</p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg bg-muted", statusColors[status])}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.direction === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
            {trend.direction === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
            {trend.direction === "neutral" && <Minus className="h-3 w-3 text-muted-foreground" />}
            <span className={cn(
              "text-xs",
              trend.direction === "up" ? "text-green-500" : 
              trend.direction === "down" ? "text-red-500" : "text-muted-foreground"
            )}>
              {trend.value}% from yesterday
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PlatformHealthCards() {
  const { data: metrics, isLoading } = usePlatformMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const blockRate = metrics?.totalRequests 
    ? Math.round((metrics.blockedRequests / metrics.totalRequests) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Gateway Requests (24h)"
        value={metrics?.totalRequests?.toLocaleString() || "0"}
        subtitle={`${metrics?.blockedRequests || 0} blocked (${blockRate}%)`}
        icon={<Activity className="h-5 w-5" />}
        status={blockRate > 10 ? "warning" : "success"}
      />
      <MetricCard
        title="Active Systems"
        value={metrics?.systemsCount || 0}
        subtitle={`${metrics?.highRiskSystems || 0} high risk`}
        icon={<Server className="h-5 w-5" />}
        status={(metrics?.highRiskSystems || 0) > 0 ? "warning" : "success"}
      />
      <MetricCard
        title="Pending Approvals"
        value={metrics?.pendingApprovals || 0}
        subtitle={metrics?.pendingApprovals ? "Requires action" : "All clear"}
        icon={<ShieldAlert className="h-5 w-5" />}
        status={(metrics?.pendingApprovals || 0) > 0 ? "warning" : "success"}
      />
      <MetricCard
        title="Avg Latency"
        value={`${metrics?.avgLatency || 0}ms`}
        subtitle={`${metrics?.recentIncidents || 0} open incidents`}
        icon={<Clock className="h-5 w-5" />}
        status={(metrics?.recentIncidents || 0) > 0 ? "danger" : "neutral"}
      />
    </div>
  );
}
