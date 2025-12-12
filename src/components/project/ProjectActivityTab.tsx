import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, BarChart3, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface ProjectActivityTabProps {
  projectId: string;
}

export function ProjectActivityTab({ projectId }: ProjectActivityTabProps) {
  // Fetch request logs for all systems in this project
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["project-request-logs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_logs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch systems count
  const { data: systems } = useQuery({
    queryKey: ["project-systems-count", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("systems")
        .select("id, name")
        .eq("project_id", projectId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const isLoading = logsLoading;

  // Calculate metrics
  const totalRequests = logs?.length || 0;
  const blockedRequests = logs?.filter(l => l.decision === "BLOCK").length || 0;
  const warnedRequests = logs?.filter(l => l.decision === "WARN").length || 0;
  const passedRequests = logs?.filter(l => l.decision === "ALLOW" || l.decision === "PASS").length || 0;
  
  const latencies = logs?.map(l => l.latency_ms || 0).filter(l => l > 0) || [];
  const avgLatency = latencies.length > 0 
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) 
    : 0;

  const errorRate = totalRequests > 0 
    ? Math.round((logs?.filter(l => (l.status_code || 0) >= 400).length || 0) / totalRequests * 100) 
    : 0;

  // Prepare hourly chart data
  const hourlyData: Record<string, number> = {};
  for (let i = 23; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i, 0, 0, 0);
    hourlyData[hour.toISOString().slice(0, 13)] = 0;
  }

  logs?.forEach(log => {
    const hourKey = new Date(log.created_at).toISOString().slice(0, 13);
    if (hourlyData[hourKey] !== undefined) {
      hourlyData[hourKey]++;
    }
  });

  const chartData = Object.entries(hourlyData).map(([hour, count]) => ({
    hour: new Date(hour + ":00:00Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    requests: count,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (totalRequests === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Activity className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No Activity Yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Request activity will appear here once your AI systems start processing requests through the gateway.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRequests}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{passedRequests}</p>
                <p className="text-sm text-muted-foreground">Allowed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warnedRequests}</p>
                <p className="text-sm text-muted-foreground">Warned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-danger/10">
                <XCircle className="h-5 w-5 text-danger" />
              </div>
              <div>
                <p className="text-2xl font-bold">{blockedRequests}</p>
                <p className="text-sm text-muted-foreground">Blocked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgLatency}ms</p>
                <p className="text-sm text-muted-foreground">Avg Latency</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Request Volume (24h)</CardTitle>
          <CardDescription>Hourly request distribution across all systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="hour" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorRequests)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>Latest 20 requests across all systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs?.slice(0, 20).map(log => (
              <div 
                key={log.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={
                      log.decision === "BLOCK" ? "bg-danger/10 text-danger border-danger/20" :
                      log.decision === "WARN" ? "bg-warning/10 text-warning border-warning/20" :
                      "bg-success/10 text-success border-success/20"
                    }
                  >
                    {log.decision || "ALLOW"}
                  </Badge>
                  <span className="text-sm font-mono text-muted-foreground">
                    {log.trace_id?.slice(0, 8) || "N/A"}
                  </span>
                  {log.latency_ms && (
                    <span className="text-sm text-muted-foreground">
                      {log.latency_ms}ms
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
