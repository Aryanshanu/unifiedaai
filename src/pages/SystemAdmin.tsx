import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, Settings, Users, Activity, Lock, Server, Terminal,
  Database, History, AlertOctagon, RefreshCw, CheckCircle,
  XCircle, Clock, Loader2,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";

// ── Real data hooks ─────────────────────────────────────────────────────────

function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [rolesRes, systemsRes, modelsRes, incidentsRes] = await Promise.all([
        supabase.from("user_roles").select("*", { count: "exact", head: true }),
        supabase.from("systems").select("*", { count: "exact", head: true }),
        supabase.from("models").select("*", { count: "exact", head: true }),
        supabase.from("incidents").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return {
        roleAssignments: rolesRes.count ?? 0,
        totalSystems: systemsRes.count ?? 0,
        totalModels: modelsRes.count ?? 0,
        openIncidents: incidentsRes.count ?? 0,
      };
    },
    staleTime: 60_000,
  });
}

function useAuditLog() {
  return useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, action_type, table_name, record_id, performed_by, performed_at, change_summary")
        .order("performed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function useDbHealth() {
  return useQuery({
    queryKey: ["db-health"],
    queryFn: async () => {
      const start = Date.now();
      const [p, m, s, r] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("models").select("*", { count: "exact", head: true }),
        supabase.from("systems").select("*", { count: "exact", head: true }),
        supabase.from("request_logs").select("*", { count: "exact", head: true }),
      ]);
      const latency = Date.now() - start;
      const hasError = [p, m, s, r].some(r => r.error);
      return {
        status: hasError ? "error" : "connected",
        latencyMs: latency,
        tables: {
          projects: p.count ?? 0,
          models: m.count ?? 0,
          systems: s.count ?? 0,
          requestLogs: r.count ?? 0,
        },
      };
    },
    staleTime: 30_000,
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SystemAdmin() {
  const queryClient = useQueryClient();
  const [lockdownPending, setLockdownPending] = useState(false);

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = usePlatformMetrics();
  const { data: adminStats, isLoading: statsLoading, refetch: refetchStats } = useAdminStats();
  const { data: auditLog, isLoading: logsLoading, refetch: refetchLogs } = useAuditLog();
  const { data: dbHealth, isLoading: healthLoading, refetch: refetchHealth } = useDbHealth();

  const isRefreshing = metricsLoading || statsLoading || logsLoading || healthLoading;

  const handleRefresh = () => {
    refetchMetrics();
    refetchStats();
    refetchLogs();
    refetchHealth();
  };

  const handleLockdown = async () => {
    const confirmed = window.confirm(
      "⚠️ EMERGENCY LOCKDOWN\n\nThis will suspend ALL active AI systems immediately. This action is logged and irreversible without manual restoration.\n\nAre you sure?"
    );
    if (!confirmed) return;

    setLockdownPending(true);
    try {
      const { error } = await supabase
        .from("systems")
        .update({ deployment_status: "suspended" })
        .neq("deployment_status", "archived");
      if (error) throw error;
      toast.error("Platform lockdown initiated — all systems suspended", { duration: 8000 });
      queryClient.invalidateQueries({ queryKey: ["systems"] });
    } catch (e: any) {
      toast.error("Lockdown failed: " + e.message);
    } finally {
      setLockdownPending(false);
    }
  };

  const dbStatusColor = dbHealth?.status === "connected" ? "text-success" : "text-danger";
  const dbStatusLabel = healthLoading ? "Checking..." : dbHealth?.status === "connected" ? "CONNECTED" : "ERROR";

  return (
    <MainLayout
      title="System Administration"
      subtitle="Global platform management, observability, and infrastructure governance"
      headerActions={
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Database",
            value: dbStatusLabel,
            sub: `${dbHealth?.latencyMs ?? "--"}ms round-trip`,
            icon: <Database className={`w-4 h-4 ${dbStatusColor}`} />,
            color: dbHealth?.status === "connected" ? "text-success" : "text-danger",
          },
          {
            label: "Role Assignments",
            value: statsLoading ? "—" : String(adminStats?.roleAssignments ?? 0),
            sub: "Active user role grants",
            icon: <Shield className="w-4 h-4 text-primary" />,
            color: "text-foreground",
          },
          {
            label: "Avg Latency (24h)",
            value: metricsLoading ? "—" : `${metrics?.avgLatency ?? 0}ms`,
            sub: `${metrics?.totalRequests ?? 0} requests processed`,
            icon: <Activity className="w-4 h-4 text-success" />,
            color: "text-foreground",
          },
          {
            label: "Open Incidents",
            value: statsLoading ? "—" : String(adminStats?.openIncidents ?? 0),
            sub: `${adminStats?.totalSystems ?? 0} systems · ${adminStats?.totalModels ?? 0} engines`,
            icon: <AlertOctagon className="w-4 h-4 text-warning" />,
            color: (adminStats?.openIncidents ?? 0) > 0 ? "text-warning" : "text-success",
          },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              {card.icon}
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Audit Log ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Platform Audit Log</h3>
              </div>
              <Badge variant="outline">Live · Last 20 events</Badge>
            </div>
            <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {logsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="w-8 h-8 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : !auditLog?.length ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Terminal className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No audit events yet. Events are logged automatically on data changes.</p>
                </div>
              ) : (
                auditLog.map((log: any) => (
                  <div key={log.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                      log.action_type === "DELETE" ? "bg-danger/10 text-danger" :
                      log.action_type === "INSERT" ? "bg-success/10 text-success" :
                      "bg-primary/10 text-primary"
                    }`}>
                      {log.action_type === "DELETE"
                        ? <XCircle className="w-4 h-4" />
                        : log.action_type === "INSERT"
                        ? <CheckCircle className="w-4 h-4" />
                        : <Terminal className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <span className="font-mono text-primary">{log.action_type}</span>
                        {" on "}
                        <span className="text-foreground">{log.table_name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {log.change_summary || log.record_id || "No details"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {log.performed_at ? formatDistanceToNow(new Date(log.performed_at), { addSuffix: true }) : "—"}
                      </p>
                      <Badge variant="outline" className="text-[9px] h-4 mt-1">
                        {log.action_type}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Emergency Lockdown ── */}
          <div className="bg-danger/5 border border-danger/20 rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5 text-danger" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-danger">Emergency Platform Lock</h3>
                <p className="text-sm text-danger/70 mt-0.5">
                  Suspend ALL active AI systems immediately. Use only during a confirmed security breach.
                </p>
              </div>
              <Button
                variant="destructive"
                className="shadow-lg shadow-danger/20"
                onClick={handleLockdown}
                disabled={lockdownPending}
              >
                {lockdownPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                INITIATE LOCKDOWN
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-6">
          {/* DB Table Health */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Server className="w-4 h-4" /> Infrastructure
            </h3>
            {healthLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(dbHealth?.tables ?? {}).map(([table, count]) => (
                  <div key={table} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{table.replace(/([A-Z])/g, " $1").trim()}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-foreground">{count as number} rows</span>
                      <Badge className="bg-success text-white text-[9px] h-4 px-1">OK</Badge>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-border">
                  <span className="text-muted-foreground">Round-trip</span>
                  <span className="font-mono text-xs text-foreground">{dbHealth?.latencyMs}ms</span>
                </div>
              </div>
            )}
          </div>

          {/* Request breakdown */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" /> Traffic (24h)
            </h3>
            {metricsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-5 w-full" />)}</div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Requests</span>
                  <span className="font-mono font-semibold">{metrics?.totalRequests ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Blocked</span>
                  <span className="font-mono text-danger">{metrics?.blockedRequests ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Warned</span>
                  <span className="font-mono text-warning">{metrics?.warnedRequests ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Errors (5xx)</span>
                  <span className="font-mono text-muted-foreground">{metrics?.errorCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Avg Latency</span>
                  <span className={`font-mono font-semibold ${(metrics?.avgLatency ?? 0) > 1000 ? "text-danger" : (metrics?.avgLatency ?? 0) > 500 ? "text-warning" : "text-success"}`}>
                    {metrics?.avgLatency ?? 0}ms
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Platform summary */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4" /> Platform Summary
            </h3>
            {statsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-5 w-full" />)}</div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Systems</span>
                  <span className="font-mono font-semibold">{adminStats?.totalSystems ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Logic Engines</span>
                  <span className="font-mono font-semibold">{adminStats?.totalModels ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role Assignments</span>
                  <span className="font-mono font-semibold">{adminStats?.roleAssignments ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">High-Risk Systems</span>
                  <span className={`font-mono font-semibold ${(metrics?.highRiskSystems ?? 0) > 0 ? "text-danger" : "text-success"}`}>
                    {metrics?.highRiskSystems ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pending Approvals</span>
                  <span className={`font-mono font-semibold ${(metrics?.pendingApprovals ?? 0) > 0 ? "text-warning" : "text-success"}`}>
                    {metrics?.pendingApprovals ?? 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
