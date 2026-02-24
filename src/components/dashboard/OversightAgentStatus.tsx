import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bot, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Play, 
  RefreshCw, 
  Clock,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface AgentStats {
  eventsProcessed24h: number;
  alertsGenerated24h: number;
  pendingEvents: number;
  lastProcessedAt: string | null;
  agentStatus: 'running' | 'idle' | 'error';
}

export function OversightAgentStatus() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['oversight-agent-status'],
    queryFn: async (): Promise<AgentStats> => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Count processed events in last 24h
      const { count: eventsProcessed } = await supabase
        .from('events_raw')
        .select('*', { count: 'exact', head: true })
        .eq('processed', true)
        .gte('processed_at', twentyFourHoursAgo);

      // Count alerts/incidents generated in last 24h
      const { count: alertsGenerated } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo);

      // Count pending (unprocessed) events
      const { count: pendingEvents } = await supabase
        .from('events_raw')
        .select('*', { count: 'exact', head: true })
        .eq('processed', false);

      // Get last processed event timestamp
      const { data: lastProcessed } = await supabase
        .from('events_raw')
        .select('processed_at')
        .eq('processed', true)
        .order('processed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Determine agent status more intelligently
      let agentStatus: 'running' | 'idle' | 'error' = 'idle';
      
      if (pendingEvents && pendingEvents > 100) {
        agentStatus = 'error'; // Backlog building up - needs attention
      } else if (pendingEvents && pendingEvents > 0) {
        // If there are pending events, show as needing processing
        agentStatus = 'idle';
      } else if (eventsProcessed && eventsProcessed > 0) {
        // No pending events but we've processed events recently = healthy/running
        agentStatus = 'running';
      } else if (lastProcessed?.processed_at) {
        // Check if we processed within last hour (not just 5 minutes)
        const lastProcessedTime = new Date(lastProcessed.processed_at).getTime();
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (lastProcessedTime > oneHourAgo) {
          agentStatus = 'running';
        }
      }

      return {
        eventsProcessed24h: eventsProcessed || 0,
        alertsGenerated24h: alertsGenerated || 0,
        pendingEvents: pendingEvents || 0,
        lastProcessedAt: lastProcessed?.processed_at || null,
        agentStatus,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000, // Refresh every 2 minutes
  });

  const triggerProcessing = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-events', {
        body: { batch_size: 100 },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Processed ${data.processed_count} events, created ${data.alerts_created} alerts`);
      queryClient.invalidateQueries({ queryKey: ['oversight-agent-status'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (error) => {
      toast.error("Failed to trigger processing");
      console.error(error);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Oversight Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Healthy
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Backlog
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Waiting
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Oversight Agent
          </div>
          {stats && getStatusBadge(stats.agentStatus)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <div className="text-2xl font-bold font-mono text-primary">
              {stats?.eventsProcessed24h || 0}
            </div>
            <div className="text-xs text-muted-foreground">Events (24h)</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <div className="text-2xl font-bold font-mono text-warning">
              {stats?.alertsGenerated24h || 0}
            </div>
            <div className="text-xs text-muted-foreground">Alerts (24h)</div>
          </div>
          <div className={cn(
            "text-center p-3 rounded-lg",
            stats?.pendingEvents && stats.pendingEvents > 50 
              ? "bg-destructive/10" 
              : "bg-secondary/30"
          )}>
            <div className={cn(
              "text-2xl font-bold font-mono",
              stats?.pendingEvents && stats.pendingEvents > 50 
                ? "text-destructive" 
                : "text-muted-foreground"
            )}>
              {stats?.pendingEvents || 0}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Last Processed */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last processed:</span>
          <span className="font-medium">
            {stats?.lastProcessedAt 
              ? formatDistanceToNow(new Date(stats.lastProcessedAt), { addSuffix: true })
              : "Never"
            }
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => triggerProcessing.mutate()}
            disabled={triggerProcessing.isPending || (stats?.pendingEvents || 0) === 0}
          >
            {triggerProcessing.isPending ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Process Now
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['oversight-agent-status'] })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Health Indicator */}
        {stats?.agentStatus === 'error' && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-sm">
              <span className="font-medium text-destructive">Backlog detected</span>
              <p className="text-muted-foreground text-xs mt-0.5">
                {stats.pendingEvents} events waiting. Consider triggering manual processing.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
