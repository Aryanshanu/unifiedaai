import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Activity, 
  ShieldCheck, 
  Server, 
  CheckCircle, 
  AlertTriangle, 
  Loader2 
} from "lucide-react";
import { useInfrastructureHealth } from "@/hooks/useInfrastructureHealth";

export function InfrastructureHealth() {
  const { data: health, isLoading } = useInfrastructureHealth();

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800 text-white">
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: 'online' | 'degraded' | 'offline') => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'offline': return <AlertTriangle className="h-4 w-4 text-rose-400" />;
    }
  };

  const getStatusBadge = (status: 'online' | 'degraded' | 'offline') => {
    switch (status) {
      case 'online': return <Badge variant="outline" className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20 text-[10px] uppercase">Online</Badge>;
      case 'degraded': return <Badge variant="outline" className="bg-amber-400/10 text-amber-400 border-amber-400/20 text-[10px] uppercase">Degraded</Badge>;
      case 'offline': return <Badge variant="outline" className="bg-rose-400/10 text-rose-400 border-rose-400/20 text-[10px] uppercase">Offline</Badge>;
    }
  };

  return (
    <Card className="bg-[#0f172a] border-slate-800/60 shadow-xl overflow-hidden group">
      <CardHeader className="bg-slate-900/40 border-b border-slate-800/40 p-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-100">
          <Activity className="h-4 w-4 text-primary animate-pulse" />
          Infrastructure Pulse
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-800/40">
          {/* Database */}
          <div className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Database className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">{health?.database.name}</p>
                <p className="text-[10px] text-slate-500">Latency: {health?.database.latency}ms</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(health?.database.status || 'online')}
              {getStatusIcon(health?.database.status || 'online')}
            </div>
          </div>

          {/* Edge Functions */}
          <div className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Server className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">{health?.edgeFunctions.name}</p>
                <p className="text-[10px] text-slate-500">Function Runtime Check</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(health?.edgeFunctions.status || 'online')}
              {getStatusIcon(health?.edgeFunctions.status || 'online')}
            </div>
          </div>

          {/* Gateway Status */}
          <div className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">{health?.gateway.name}</p>
                <p className="text-[10px] text-slate-500">Version {health?.gateway.version} · Protocol v1</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(health?.gateway.status || 'online')}
              {getStatusIcon(health?.gateway.status || 'online')}
            </div>
          </div>
        </div>
        
        <div className="p-3 bg-slate-900/60 flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-800/40">
          <span>Active Nodes: 12</span>
          <span>Last Check: {new Date(health?.lastChecked || '').toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
