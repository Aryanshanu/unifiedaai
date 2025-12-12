import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, 
  Zap, 
  Filter, 
  Trash2, 
  Download,
  Pause,
  Play,
  Search,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Database,
  Cpu,
  Clock,
  Terminal
} from "lucide-react";
import { format } from "date-fns";

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'action' | 'response' | 'error' | 'system' | 'security' | 'evaluation';
  source: string;
  message: string;
  details?: Record<string, unknown>;
  status?: 'success' | 'error' | 'warning' | 'info';
  latency?: number;
}

interface TelemetryMetric {
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export default function LiveLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [metrics, setMetrics] = useState<TelemetryMetric[]>([
    { label: "Requests/min", value: 0, unit: "req", trend: "stable", color: "text-primary" },
    { label: "Avg Latency", value: 0, unit: "ms", trend: "stable", color: "text-yellow-500" },
    { label: "Error Rate", value: 0, unit: "%", trend: "stable", color: "text-red-500" },
    { label: "Block Rate", value: 0, unit: "%", trend: "stable", color: "text-orange-500" },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Add a new log entry
  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    if (isPaused) return;
    
    const newLog: LogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    
    setLogs(prev => {
      const updated = [...prev, newLog];
      // Keep only last 500 logs
      return updated.slice(-500);
    });
  };

  // Subscribe to real-time events
  useEffect(() => {
    // Log initial connection
    addLog({
      type: 'system',
      source: 'Telemetry',
      message: 'Live telemetry stream connected',
      status: 'success'
    });

    // Subscribe to request_logs
    const requestLogsChannel = supabase
      .channel('live-logs-requests')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'request_logs' },
        (payload) => {
          const log = payload.new as Record<string, unknown>;
          addLog({
            type: log.decision === 'BLOCK' ? 'security' : 'action',
            source: 'AI Gateway',
            message: `Request ${log.decision}: ${log.status_code || 'N/A'}`,
            details: {
              decision: log.decision,
              latency: log.latency_ms,
              trace_id: log.trace_id,
              engine_scores: log.engine_scores
            },
            status: log.decision === 'ALLOW' ? 'success' : log.decision === 'BLOCK' ? 'error' : 'warning',
            latency: log.latency_ms as number
          });
        }
      )
      .subscribe();

    // Subscribe to drift_alerts
    const driftChannel = supabase
      .channel('live-logs-drift')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'drift_alerts' },
        (payload) => {
          const alert = payload.new as Record<string, unknown>;
          addLog({
            type: 'system',
            source: 'Drift Detection',
            message: `Drift detected: ${alert.drift_type} on ${alert.feature}`,
            details: { drift_value: alert.drift_value, severity: alert.severity },
            status: alert.severity === 'critical' ? 'error' : 'warning'
          });
        }
      )
      .subscribe();

    // Subscribe to incidents
    const incidentChannel = supabase
      .channel('live-logs-incidents')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          const incident = payload.new as Record<string, unknown>;
          addLog({
            type: 'error',
            source: 'Incident Manager',
            message: `New incident: ${incident.title}`,
            details: { severity: incident.severity, type: incident.incident_type },
            status: 'error'
          });
        }
      )
      .subscribe();

    // Subscribe to review_queue
    const reviewChannel = supabase
      .channel('live-logs-reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'review_queue' },
        (payload) => {
          const review = payload.new as Record<string, unknown>;
          const eventType = payload.eventType;
          addLog({
            type: 'action',
            source: 'HITL Queue',
            message: `Review ${eventType}: ${review?.title || 'Unknown'}`,
            details: { status: review?.status, severity: review?.severity },
            status: eventType === 'DELETE' ? 'success' : 'info'
          });
        }
      )
      .subscribe();

    // Subscribe to evaluation_runs
    const evalChannel = supabase
      .channel('live-logs-evals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'evaluation_runs' },
        (payload) => {
          const run = payload.new as Record<string, unknown>;
          addLog({
            type: 'evaluation',
            source: `${run?.engine_type || 'RAI'} Engine`,
            message: `Evaluation ${run?.status}: Score ${run?.overall_score || 'N/A'}%`,
            details: { 
              engine: run?.engine_type, 
              score: run?.overall_score,
              fairness: run?.fairness_score,
              privacy: run?.privacy_score
            },
            status: (run?.overall_score as number) >= 70 ? 'success' : 'warning'
          });
        }
      )
      .subscribe();

    // Fetch metrics periodically
    const metricsInterval = setInterval(async () => {
      const since = new Date();
      since.setMinutes(since.getMinutes() - 1);
      
      const { data: recentLogs } = await supabase
        .from('request_logs')
        .select('decision, latency_ms, status_code')
        .gte('created_at', since.toISOString());
      
      if (recentLogs) {
        const total = recentLogs.length;
        const errors = recentLogs.filter(l => (l.status_code || 0) >= 400).length;
        const blocks = recentLogs.filter(l => l.decision === 'BLOCK').length;
        const avgLatency = total > 0 
          ? recentLogs.reduce((a, b) => a + (b.latency_ms || 0), 0) / total 
          : 0;
        
        setMetrics([
          { 
            label: "Requests/min", 
            value: total, 
            unit: "req", 
            trend: total > 10 ? 'up' : 'stable',
            color: "text-primary" 
          },
          { 
            label: "Avg Latency", 
            value: Math.round(avgLatency), 
            unit: "ms", 
            trend: avgLatency > 1000 ? 'up' : 'stable',
            color: avgLatency > 2000 ? "text-red-500" : "text-yellow-500" 
          },
          { 
            label: "Error Rate", 
            value: total > 0 ? Math.round((errors / total) * 100) : 0, 
            unit: "%", 
            trend: errors > 0 ? 'up' : 'stable',
            color: "text-red-500" 
          },
          { 
            label: "Block Rate", 
            value: total > 0 ? Math.round((blocks / total) * 100) : 0, 
            unit: "%", 
            trend: blocks > 0 ? 'up' : 'stable',
            color: "text-orange-500" 
          },
        ]);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(requestLogsChannel);
      supabase.removeChannel(driftChannel);
      supabase.removeChannel(incidentChannel);
      supabase.removeChannel(reviewChannel);
      supabase.removeChannel(evalChannel);
      clearInterval(metricsInterval);
    };
  }, [isPaused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'action': return <Zap className="h-3.5 w-3.5 text-blue-400" />;
      case 'response': return <Database className="h-3.5 w-3.5 text-green-400" />;
      case 'error': return <XCircle className="h-3.5 w-3.5 text-red-400" />;
      case 'system': return <Cpu className="h-3.5 w-3.5 text-purple-400" />;
      case 'security': return <Shield className="h-3.5 w-3.5 text-orange-400" />;
      case 'evaluation': return <Activity className="h-3.5 w-3.5 text-cyan-400" />;
      default: return <Terminal className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: LogEntry['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">OK</Badge>;
      case 'error': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">ERR</Badge>;
      case 'warning': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">WARN</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">INFO</Badge>;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = !filter || 
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.source.toLowerCase().includes(filter.toLowerCase());
    
    const matchesTab = activeTab === 'all' || log.type === activeTab;
    
    return matchesFilter && matchesTab;
  });

  const clearLogs = () => {
    setLogs([]);
    addLog({
      type: 'system',
      source: 'Telemetry',
      message: 'Logs cleared',
      status: 'info'
    });
  };

  const exportLogs = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fractal-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    a.click();
  };

  return (
    <MainLayout title="Live Logs & Telemetry">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Logs & Telemetry</h1>
            <p className="text-muted-foreground text-sm">Real-time system activity and performance monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={isPaused ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}>
              {isPaused ? "Paused" : "Live"}
            </Badge>
            <span className="text-xs text-muted-foreground">{logs.length} entries</span>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="grid grid-cols-4 gap-3">
          {metrics.map((metric, i) => (
            <Card key={i} className="bg-card/50 border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  {metric.trend === 'up' && <ArrowUp className="h-3 w-3 text-red-400" />}
                  {metric.trend === 'down' && <ArrowDown className="h-3 w-3 text-green-400" />}
                </div>
                <div className={`text-xl font-bold ${metric.color}`}>
                  {metric.value}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{metric.unit}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Log Panel */}
        <Card className="border-border/50">
          <CardHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Activity Stream
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Filter Input */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter logs..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="h-7 w-48 pl-7 text-xs"
                  />
                </div>
                
                {/* Controls */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7"
                  onClick={() => setAutoScroll(!autoScroll)}
                >
                  <ArrowDown className={`h-3.5 w-3.5 ${autoScroll ? 'text-primary' : ''}`} />
                </Button>
                <Button variant="outline" size="sm" className="h-7" onClick={clearLogs}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7" onClick={exportLogs}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Type Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
              <TabsList className="h-7 bg-muted/50">
                <TabsTrigger value="all" className="text-xs h-6 px-2">All</TabsTrigger>
                <TabsTrigger value="action" className="text-xs h-6 px-2">Actions</TabsTrigger>
                <TabsTrigger value="security" className="text-xs h-6 px-2">Security</TabsTrigger>
                <TabsTrigger value="evaluation" className="text-xs h-6 px-2">Evaluations</TabsTrigger>
                <TabsTrigger value="error" className="text-xs h-6 px-2">Errors</TabsTrigger>
                <TabsTrigger value="system" className="text-xs h-6 px-2">System</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[500px]" ref={scrollRef}>
              <div className="font-mono text-xs">
                {filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Terminal className="h-8 w-8 mb-2 opacity-50" />
                    <p>No logs yet. Activity will appear here in real-time.</p>
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-start gap-3 px-4 py-2 border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      {/* Timestamp */}
                      <span className="text-muted-foreground shrink-0 w-20">
                        {format(log.timestamp, 'HH:mm:ss.SSS')}
                      </span>
                      
                      {/* Type Icon */}
                      <div className="shrink-0 mt-0.5">
                        {getTypeIcon(log.type)}
                      </div>
                      
                      {/* Source */}
                      <span className="text-primary shrink-0 w-28 truncate">
                        [{log.source}]
                      </span>
                      
                      {/* Message */}
                      <span className="flex-1 text-foreground">
                        {log.message}
                      </span>
                      
                      {/* Latency */}
                      {log.latency && (
                        <span className="text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.latency}ms
                        </span>
                      )}
                      
                      {/* Status Badge */}
                      <div className="shrink-0">
                        {getStatusBadge(log.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-blue-400" />
            <span>Action</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-orange-400" />
            <span>Security</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-cyan-400" />
            <span>Evaluation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3 w-3 text-red-400" />
            <span>Error</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3 w-3 text-purple-400" />
            <span>System</span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
