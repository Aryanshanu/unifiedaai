import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface RequestLog {
  id: string;
  project_id: string | null;
  system_id: string;
  environment: string | null;
  request_body: Json;
  response_body: Json;
  status_code: number | null;
  latency_ms: number | null;
  error_message: string | null;
  trace_id: string | null;
  user_id: string | null;
  engine_scores: Json;
  decision: string | null;
  created_at: string;
}

export interface ActivityMetrics {
  totalRequests: number;
  blockedRequests: number;
  warnedRequests: number;
  avgLatency: number;
  errorRate: number;
  requestsPerHour: { hour: string; count: number }[];
}

export function useRequestLogs(systemId: string, limit = 50) {
  return useQuery({
    queryKey: ["request-logs", systemId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_logs")
        .select("*")
        .eq("system_id", systemId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as RequestLog[];
    },
    enabled: !!systemId,
  });
}

export function useActivityMetrics(systemId: string) {
  return useQuery({
    queryKey: ["activity-metrics", systemId],
    queryFn: async () => {
      // Get logs from last 24 hours
      const since = new Date();
      since.setHours(since.getHours() - 24);

      const { data: logs, error } = await supabase
        .from("request_logs")
        .select("*")
        .eq("system_id", systemId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      const typedLogs = (logs || []) as RequestLog[];

      // Calculate metrics
      const totalRequests = typedLogs.length;
      const blockedRequests = typedLogs.filter(l => l.decision === "BLOCK").length;
      const warnedRequests = typedLogs.filter(l => l.decision === "WARN").length;
      const latencies = typedLogs.map(l => l.latency_ms || 0).filter(l => l > 0);
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0;
      const errorRate = totalRequests > 0 
        ? (typedLogs.filter(l => (l.status_code || 0) >= 400).length / totalRequests) * 100 
        : 0;

      // Group by hour for chart
      const hourlyData: Record<string, number> = {};
      for (let i = 23; i >= 0; i--) {
        const hour = new Date();
        hour.setHours(hour.getHours() - i, 0, 0, 0);
        hourlyData[hour.toISOString().slice(0, 13)] = 0;
      }

      typedLogs.forEach(log => {
        const hourKey = new Date(log.created_at).toISOString().slice(0, 13);
        if (hourlyData[hourKey] !== undefined) {
          hourlyData[hourKey]++;
        }
      });

      const requestsPerHour = Object.entries(hourlyData).map(([hour, count]) => ({
        hour: new Date(hour + ":00:00Z").toLocaleTimeString([], { hour: "2-digit" }),
        count,
      }));

      return {
        totalRequests,
        blockedRequests,
        warnedRequests,
        avgLatency: Math.round(avgLatency),
        errorRate: Math.round(errorRate * 10) / 10,
        requestsPerHour,
      } as ActivityMetrics;
    },
    enabled: !!systemId,
    staleTime: 60_000,
    refetchInterval: 60_000, // Refresh every 60 seconds
  });
}
