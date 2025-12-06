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

      // Fetch all data in parallel
      const [logsRes, systemsRes, approvalsRes, incidentsRes] = await Promise.all([
        supabase
          .from("request_logs")
          .select("decision, latency_ms, status_code")
          .gte("created_at", twentyFourHoursAgo),
        supabase
          .from("systems")
          .select("id, uri_score, deployment_status, requires_approval"),
        supabase
          .from("system_approvals")
          .select("id")
          .eq("status", "pending"),
        supabase
          .from("incidents")
          .select("id")
          .eq("status", "open"),
      ]);

      const logs = logsRes.data || [];
      const systems = systemsRes.data || [];
      const pendingApprovals = approvalsRes.data?.length || 0;
      const recentIncidents = incidentsRes.data?.length || 0;

      const totalRequests = logs.length;
      const blockedRequests = logs.filter(l => l.decision === "BLOCK").length;
      const warnedRequests = logs.filter(l => l.decision === "WARN").length;
      const errorCount = logs.filter(l => (l.status_code || 0) >= 500).length;
      const avgLatency = totalRequests > 0
        ? Math.round(logs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / totalRequests)
        : 0;

      const systemsCount = systems.length;
      const highRiskSystems = systems.filter(s => (s.uri_score || 0) > 60).length;

      return {
        totalRequests,
        blockedRequests,
        warnedRequests,
        avgLatency,
        errorCount,
        systemsCount,
        highRiskSystems,
        pendingApprovals,
        recentIncidents,
      } as PlatformMetrics;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
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

      const { data: systems, error: systemsError } = await supabase
        .from("systems")
        .select("id, name, provider, system_type, deployment_status, requires_approval, uri_score, runtime_risk_score");

      if (systemsError) throw systemsError;

      const summaries: SystemHealthSummary[] = [];

      for (const system of systems || []) {
        const { data: logs } = await supabase
          .from("request_logs")
          .select("decision, latency_ms")
          .eq("system_id", system.id)
          .gte("created_at", twentyFourHoursAgo);

        const totalRequests = logs?.length || 0;
        const blockedRequests = logs?.filter(l => l.decision === "BLOCK").length || 0;
        const avgLatency = totalRequests > 0
          ? Math.round(logs!.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / totalRequests)
          : 0;

        // Determine health status
        const uriScore = system.uri_score || 0;
        const blockRate = totalRequests > 0 ? blockedRequests / totalRequests : 0;
        
        let healthStatus: "healthy" | "warning" | "critical" = "healthy";
        if (uriScore > 80 || blockRate > 0.2) {
          healthStatus = "critical";
        } else if (uriScore > 60 || blockRate > 0.1) {
          healthStatus = "warning";
        }

        summaries.push({
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
        });
      }

      return summaries;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useUnsafeDeployments() {
  return useQuery({
    queryKey: ["unsafe-deployments"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get systems that require approval but aren't approved
      const { data: unapprovedSystems, error: systemsError } = await supabase
        .from("systems")
        .select("id, name, project_id, uri_score, deployment_status")
        .eq("requires_approval", true)
        .not("deployment_status", "in", '("approved","deployed")');

      if (systemsError) throw systemsError;

      // Check which have live traffic
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
    refetchInterval: 30000,
  });
}
