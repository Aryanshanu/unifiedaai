import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck, Users, AlertCircle, FileText, ArrowRight,
  Clock, AlertTriangle, GitBranch,
} from "lucide-react";

export function GovernanceDashboard() {
  const navigate = useNavigate();
  const { data: metrics } = usePlatformMetrics();

  const { data: reviewQueue } = useQuery({
    queryKey: ['governance-review-queue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('review_queue')
        .select('id, title, severity, status, sla_deadline, created_at')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: false,
  });

  const { data: policyViolations } = useQuery({
    queryKey: ['governance-violations'],
    queryFn: async () => {
      const { count } = await supabase
        .from('policy_violations')
        .select('*', { count: 'exact', head: true })
        .eq('blocked', true);
      return count || 0;
    },
    refetchInterval: false,
  });

  const { data: driftAlerts } = useQuery({
    queryKey: ['governance-drift'],
    queryFn: async () => {
      const { count } = await supabase
        .from('drift_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      return count || 0;
    },
    refetchInterval: false,
  });


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Governance & Risk Operations</h2>
          <p className="text-sm text-muted-foreground">Policy enforcement, reviews, and incident management</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => navigate('/hitl')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-3xl font-bold text-primary">{reviewQueue?.length || 0}</p>
              </div>
              <Users className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50" onClick={() => navigate('/incidents')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Incidents</p>
                <p className="text-3xl font-bold text-destructive">{metrics?.recentIncidents || 0}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Policy Blocks</p>
                <p className="text-3xl font-bold text-warning">{policyViolations}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drift Alerts</p>
                <p className="text-3xl font-bold text-muted-foreground">{driftAlerts}</p>
              </div>
              <GitBranch className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HITL Queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4" />
            HITL Review Queue
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/hitl')}>
            Open Console <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {reviewQueue && reviewQueue.length > 0 ? (
            <div className="space-y-3">
              {reviewQueue.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.sla_deadline ? `SLA: ${new Date(item.sla_deadline).toLocaleString()}` : 'No SLA'}
                    </p>
                  </div>
                  <Badge variant={item.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                    {item.severity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-sm text-muted-foreground">Queue is empty</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
