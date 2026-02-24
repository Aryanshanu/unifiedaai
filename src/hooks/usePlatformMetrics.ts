import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformMetrics {
  totalRequests: number;
  blockedRequests: number;
  warnedRequests: number;
  avgLatency: number;
  errorCount: number;
  systemsCount: number;
  highRiskSystems: number;
  pendingApprovals: number;
  recentIncidents: number;
}

export function usePlatformMetrics() {
  return useQuery({
    queryKey: ["platform-metrics"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Use count queries instead of fetching all rows
      const [
        totalLogsRes,
        blockedLogsRes,
        warnedLogsRes,
        errorLogsRes,
        latencyLogsRes,
        systemsRes,
        approvalsRes,
        incidentsRes,
      ] = await Promise.all([
        supabase
          .from("request_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", twentyFourHoursAgo),
        supabase
          .from("request_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", twentyFourHoursAgo)
          .eq("decision", "BLOCK"),
        supabase
          .from("request_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", twentyFourHoursAgo)
          .eq("decision", "WARN"),
        supabase
          .from("request_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", twentyFourHoursAgo)
          .gte("status_code", 500),
        // Only fetch latest 100 logs for avg latency calculation
        supabase
          .from("request_logs")
          .select("latency_ms")
          .gte("created_at", twentyFourHoursAgo)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("systems")
          .select("id, uri_score"),
        supabase
          .from("system_approvals")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("incidents")
          .select("*", { count: "exact", head: true })
          .eq("status", "open"),
      ]);

      const latencyLogs = latencyLogsRes.data || [];
      const systems = systemsRes.data || [];
      const totalRequests = totalLogsRes.count || 0;
      const avgLatency = latencyLogs.length > 0
        ? Math.round(latencyLogs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / latencyLogs.length)
        : 0;

      return {
        totalRequests,
        blockedRequests: blockedLogsRes.count || 0,
        warnedRequests: warnedLogsRes.count || 0,
        avgLatency,
        errorCount: errorLogsRes.count || 0,
        systemsCount: systems.length,
        highRiskSystems: systems.filter(s => (s.uri_score || 0) > 60).length,
        pendingApprovals: approvalsRes.count || 0,
        recentIncidents: incidentsRes.count || 0,
      } as PlatformMetrics;
    },
    staleTime: 60_000,
    refetchInterval: 60000,
  });
}

export interface SystemHealthSummary {
  id: string;
  name: string;
  provider: string;
  systemType: string;
  deploymentStatus: string;
  requiresApproval: boolean;
  uriScore: number;
  runtimeRiskScore: number;
  totalRequests: number;
  blockedRequests: number;
  avgLatency: number;
  healthStatus: "healthy" | "warning" | "critical";
}

export function useSystemHealthSummary() {
  return useQuery({
    queryKey: ["system-health-summary"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Fetch systems and ALL recent logs in parallel (no N+1)
      const [systemsRes, logsRes] = await Promise.all([
        supabase
          .from("systems")
          .select("id, name, provider, system_type, deployment_status, requires_approval, uri_score, runtime_risk_score"),
        supabase
          .from("request_logs")
          .select("system_id, decision, latency_ms")
          .gte("created_at", twentyFourHoursAgo),
      ]);

      if (systemsRes.error) throw systemsRes.error;

      const logs = logsRes.data || [];
      // Group logs by system_id client-side
      const logsBySystem = new Map<string, typeof logs>();
      for (const log of logs) {
        if (!log.system_id) continue;
        if (!logsBySystem.has(log.system_id)) {
          logsBySystem.set(log.system_id, []);
        }
        logsBySystem.get(log.system_id)!.push(log);
      }

      const summaries: SystemHealthSummary[] = (systemsRes.data || []).map((system) => {
        const systemLogs = logsBySystem.get(system.id) || [];
        const totalRequests = systemLogs.length;
        const blockedRequests = systemLogs.filter(l => l.decision === "BLOCK").length;
        const avgLatency = totalRequests > 0
          ? Math.round(systemLogs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / totalRequests)
          : 0;

        const uriScore = system.uri_score || 0;
        const blockRate = totalRequests > 0 ? blockedRequests / totalRequests : 0;

        let healthStatus: "healthy" | "warning" | "critical" = "healthy";
        if (uriScore > 80 || blockRate > 0.2) {
          healthStatus = "critical";
        } else if (uriScore > 60 || blockRate > 0.1) {
          healthStatus = "warning";
        }

        return {
          id: system.id,
          name: system.name,
          provider: system.provider,
          systemType: system.system_type,
          deploymentStatus: system.deployment_status,
          requiresApproval: system.requires_approval,
          uriScore,
          runtimeRiskScore: system.runtime_risk_score || 0,
          totalRequests,
          blockedRequests,
          avgLatency,
          healthStatus,
        };
      });

      return summaries;
    },
    staleTime: 60_000,
    refetchInterval: 60000,
  });
}

export function useUnsafeDeployments() {
  return useQuery({
    queryKey: ["unsafe-deployments"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: unapprovedSystems, error: systemsError } = await supabase
        .from("systems")
        .select("id, name, project_id, uri_score, deployment_status")
        .eq("requires_approval", true)
        .not("deployment_status", "in", '("approved","deployed")');

      if (systemsError) throw systemsError;

      const unsafeDeployments = [];

      for (const system of unapprovedSystems || []) {
        const { count } = await supabase
          .from("request_logs")
          .select("id", { count: "exact", head: true })
          .eq("system_id", system.id)
          .gte("created_at", twentyFourHoursAgo);

        if ((count || 0) > 0) {
          unsafeDeployments.push({
            ...system,
            recentRequests: count,
          });
        }
      }

      return unsafeDeployments;
    },
    staleTime: 60_000,
    refetchInterval: 60000,
  });
}
