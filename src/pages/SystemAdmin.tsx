import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Settings, 
  Users, 
  Activity, 
  Lock, 
  Server, 
  Terminal,
  Database,
  History,
  AlertOctagon,
  RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SystemAdmin() {
  const [dbStatus, setDbStatus] = useState<"connected" | "error" | "loading">("loading");
  const [logs, setLogs] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    checkSystemHealth();
    fetchLogs();
  }, []);

  const checkSystemHealth = async () => {
    setDbStatus("loading");
    try {
      const { data, error } = await supabase.from('projects').select('count');
      if (error) throw error;
      setDbStatus("connected");
    } catch (err) {
      setDbStatus("error");
    }
  };

  const fetchLogs = async () => {
    setIsRefreshing(true);
    // In a real app, this would fetch from a dedicated audit_logs table
    // For this POC, we'll simulate the system event stream
    await new Promise(resolve => setTimeout(resolve, 800));
    setLogs([
      { id: 1, event: "USER_SIGN_IN", actor: "analyst@unified.aai", target: "System", timestamp: new Date().toISOString(), status: "success" },
      { id: 2, event: "ROLE_UPGRADE", actor: "system", target: "superadmin", timestamp: new Date(Date.now() - 500000).toISOString(), status: "success" },
      { id: 3, event: "ENGINE_REGISTRATION", actor: "admin@unified.aai", target: "Hallucination_V3", timestamp: new Date(Date.now() - 1200000).toISOString(), status: "success" },
      { id: 4, event: "PBAC_POLICY_UPDATE", actor: "superadmin", target: "RouteRegistry", timestamp: new Date(Date.now() - 3600000).toISOString(), status: "success" },
      { id: 5, event: "SEC_BREACH_ATTEMPT", actor: "external_ip_88.1.1.2", target: "/admin", timestamp: new Date(Date.now() - 10000000).toISOString(), status: "blocked" },
    ]);
    setIsRefreshing(false);
  };

  return (
    <MainLayout 
      title="System Administration" 
      subtitle="Global platform management, observability, and infrastructure governance"
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            checkSystemHealth();
            fetchLogs();
          }} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync Platform State
          </Button>
          <Button size="sm">
            <Lock className="w-4 h-4 mr-2" />
            Rotate Secrets
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Database Status"
          value={dbStatus === "connected" ? "ACTIVE" : dbStatus === "error" ? "FAULT" : "SYNCING"}
          subtitle="Supabase PostgREST Connection"
          icon={<Database className={`w-4 h-4 ${dbStatus === "connected" ? "text-success" : "text-danger"}`} />}
          status={dbStatus === "connected" ? "success" : dbStatus === "error" ? "danger" : "warning"}
        />
        <MetricCard
          title="RBAC Policies"
          value="42"
          subtitle="Persona-based access rules"
          icon={<Shield className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Active Sessions"
          value="12"
          subtitle="Concurrent engineering audits"
          icon={<Users className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="System Latency"
          value="142ms"
          subtitle="Global governance ingestion"
          icon={<Activity className="w-4 h-4 text-success" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Platform Audit Log</h3>
              </div>
              <Badge variant="outline">Live Stream</Badge>
            </div>
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                  <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${log.status === 'blocked' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                    {log.status === 'blocked' ? <AlertOctagon className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{log.event}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-primary">{log.actor}</span>
                      <span>{'→'}</span>
                      <span>{log.target}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{format(new Date(log.timestamp), 'HH:mm:ss')}</p>
                    <Badge variant="outline" className={`text-[9px] h-4 mt-1 ${log.status === 'blocked' ? 'border-danger/30 text-danger' : 'border-success/30 text-success'}`}>
                      {log.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-danger/5 border border-danger/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                <AlertOctagon className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-danger">Emergency Platform Lock</h3>
                <p className="text-sm text-danger/70 text-balance">Instantly disable all AI interactions across all logical engines in case of a systemic security breach.</p>
              </div>
              <Button variant="destructive" className="ml-auto shadow-lg shadow-danger/20">
                INITIATE LOCKDOWN
              </Button>
            </div>
          </div>
        </div>

        {/* System Settings & Maintenance */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Server className="w-4 h-4" />
              Infrastructure
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Edge Functions</span>
                <Badge className="bg-success text-white">HEALTHY</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vector Database</span>
                <Badge className="bg-success text-white">HEALTHY</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Model Gateways</span>
                <Badge className="bg-warning text-white">DEGRADED</Badge>
              </div>
              <Button variant="outline" className="w-full mt-2" size="sm">
                View Detailed Health
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4" />
              Feature Flags
            </h3>
            <div className="space-y-3">
              {[
                { name: "Global Observability", enabled: true },
                { name: "Automatic Mitigation", enabled: false },
                { name: "Semantic Search", enabled: true },
                { name: "Jailbreak Testing", enabled: true },
              ].map(f => (
                <div key={f.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{f.name}</span>
                  <div className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${f.enabled ? "bg-primary" : "bg-muted"}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${f.enabled ? "left-4.5" : "left-0.5"}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
