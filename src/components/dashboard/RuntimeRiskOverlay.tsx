import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface RuntimeRiskOverlayProps {
  systemId: string;
}

export function RuntimeRiskOverlay({ systemId }: RuntimeRiskOverlayProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["runtime-risk", systemId],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [systemRes, logsRes, metricsRes] = await Promise.all([
        supabase
          .from("systems")
          .select("uri_score, runtime_risk_score, last_risk_calculation")
          .eq("id", systemId)
          .single(),
        supabase
          .from("request_logs")
          .select("decision, latency_ms, status_code")
          .eq("system_id", systemId)
          .gte("created_at", twentyFourHoursAgo),
        supabase
          .from("risk_metrics")
          .select("metric_name, metric_value")
          .eq("system_id", systemId)
          .eq("time_window", "24h")
          .order("recorded_at", { ascending: false })
          .limit(10),
      ]);

      const system = systemRes.data;
      const logs = logsRes.data || [];
      const metrics = metricsRes.data || [];

      const totalRequests = logs.length;
      const blockedRequests = logs.filter(l => l.decision === "BLOCK").length;
      const warnedRequests = logs.filter(l => l.decision === "WARN").length;
      const errorRequests = logs.filter(l => (l.status_code || 0) >= 500).length;
      const avgLatency = totalRequests > 0
        ? Math.round(logs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / totalRequests)
        : 0;

      return {
        uriScore: system?.uri_score || 0,
        runtimeRiskScore: system?.runtime_risk_score || 0,
        lastCalculation: system?.last_risk_calculation,
        totalRequests,
        blockedRequests,
        warnedRequests,
        errorRequests,
        avgLatency,
        blockRate: totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0,
        warnRate: totalRequests > 0 ? (warnedRequests / totalRequests) * 100 : 0,
        errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    enabled: !!systemId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (score: number) => {
    if (score <= 30) return "text-green-500";
    if (score <= 60) return "text-yellow-500";
    if (score <= 80) return "text-orange-500";
    return "text-red-500";
  };

  const getRiskBg = (score: number) => {
    if (score <= 30) return "bg-green-500";
    if (score <= 60) return "bg-yellow-500";
    if (score <= 80) return "bg-orange-500";
    return "bg-red-500";
  };

  const getRateStatus = (rate: number, threshold: number) => {
    if (rate >= threshold * 2) return "critical";
    if (rate >= threshold) return "warning";
    return "healthy";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Runtime Risk Overlay
        </CardTitle>
        <CardDescription>
          Live metrics from the last 24 hours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1">Runtime Risk Score</p>
            <p className={cn("text-2xl font-bold", getRiskColor(data?.runtimeRiskScore || 0))}>
              {Math.round(data?.runtimeRiskScore || 0)}
            </p>
            <Progress 
              value={data?.runtimeRiskScore || 0} 
              className={cn("h-1.5 mt-2", getRiskBg(data?.runtimeRiskScore || 0))}
            />
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1">Unified Risk Index</p>
            <p className={cn("text-2xl font-bold", getRiskColor(data?.uriScore || 0))}>
              {Math.round(data?.uriScore || 0)}
            </p>
            <Progress 
              value={data?.uriScore || 0} 
              className={cn("h-1.5 mt-2", getRiskBg(data?.uriScore || 0))}
            />
          </div>
        </div>

        {/* Traffic Stats */}
        <div>
          <p className="text-sm font-medium mb-3">Traffic Summary (24h)</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard 
              label="Total Requests" 
              value={data?.totalRequests || 0} 
              status="neutral"
            />
            <StatCard 
              label="Blocked" 
              value={data?.blockedRequests || 0}
              suffix={`(${Math.round(data?.blockRate || 0)}%)`}
              status={getRateStatus(data?.blockRate || 0, 10)}
            />
            <StatCard 
              label="Warned" 
              value={data?.warnedRequests || 0}
              suffix={`(${Math.round(data?.warnRate || 0)}%)`}
              status={getRateStatus(data?.warnRate || 0, 20)}
            />
            <StatCard 
              label="Avg Latency" 
              value={`${data?.avgLatency || 0}ms`}
              status={data?.avgLatency && data.avgLatency > 500 ? "warning" : "healthy"}
            />
          </div>
        </div>

        {/* Rate Gauges */}
        <div className="space-y-3">
          <RateGauge label="Block Rate" value={data?.blockRate || 0} threshold={10} />
          <RateGauge label="Error Rate" value={data?.errorRate || 0} threshold={5} />
          <RateGauge label="Warn Rate" value={data?.warnRate || 0} threshold={20} />
        </div>

        {data?.lastCalculation && (
          <p className="text-xs text-muted-foreground text-center">
            Last calculated: {new Date(data.lastCalculation).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  label, 
  value, 
  suffix, 
  status 
}: { 
  label: string; 
  value: string | number; 
  suffix?: string;
  status: "healthy" | "warning" | "critical" | "neutral";
}) {
  const statusColors = {
    healthy: "border-green-500/30 bg-green-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    critical: "border-red-500/30 bg-red-500/5",
    neutral: "border-border",
  };

  return (
    <div className={cn("p-3 rounded-lg border", statusColors[status])}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">
        {value} {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}

function RateGauge({ label, value, threshold }: { label: string; value: number; threshold: number }) {
  const status = value >= threshold * 2 ? "critical" : value >= threshold ? "warning" : "healthy";
  const colors = {
    healthy: "bg-green-500",
    warning: "bg-yellow-500",
    critical: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", colors[status])}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className={cn("text-xs font-mono w-12 text-right", {
        "text-green-500": status === "healthy",
        "text-yellow-500": status === "warning",
        "text-red-500": status === "critical",
      })}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}
