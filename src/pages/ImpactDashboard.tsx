import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Target, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  BarChart3,
  PieChart,
  FileText
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSystems } from "@/hooks/useSystems";
import { LongitudinalFairness } from "@/components/impact/LongitudinalFairness";
import { ImpactScoreCard } from "@/components/impact/ImpactScoreCard";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function ImpactDashboard() {
  const [selectedSystem, setSelectedSystem] = useState<string>("all");
  const [timeWindow, setTimeWindow] = useState<string>("30d");

  const { data: systems } = useSystems();

  const { data: populationMetrics, isLoading: metricsLoading, refetch } = useQuery({
    queryKey: ['population-impact-metrics', selectedSystem, timeWindow],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impact_assessments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] as { dimensions: Record<string, unknown>; overall_score: number } | undefined;
    }
  });

  const { data: harmOutcomes } = useQuery({
    queryKey: ['harm-outcomes', selectedSystem],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_outcomes")
        .select("harm_category, harm_severity, outcome_type")
        .eq("outcome_type", "harmful")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  const { data: appeals } = useQuery({
    queryKey: ['appeals-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_appeals")
        .select("status, final_decision, sla_deadline")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  const computeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('compute-population-impact', {
        body: { 
          systemId: selectedSystem === 'all' ? systems?.[0]?.id : selectedSystem, 
          timeWindow 
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Population impact metrics computed");
      if (data?.groups) {
        setComputedGroups(data.groups);
      }
      if (data?.overall) {
        setComputedOverall(data.overall);
      }
      if (data?.alerts) {
        setComputedAlerts(data.alerts);
      }
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to compute metrics: " + error.message);
    }
  });

  const [computedGroups, setComputedGroups] = useState<Array<{ group: string; attribute?: string; positiveRate: number; harmRate: number; decisionCount: number; appealRate: number; sampleSize?: number; metrics: { disparateImpactRatio?: number; disparateImpact?: number; demographicParity?: number; equalizedOdds?: number; calibration?: number } }>>([]);
  const [computedAlerts, setComputedAlerts] = useState<Array<{ type: string; message: string; severity: string }>>([]);
  const [computedOverall, setComputedOverall] = useState<{ totalDecisions: number; harmfulOutcomes: number; positiveDecisions: number; appealedDecisions: number; decisionsWithDemographics?: number; demographicCoverage?: number }>({ totalDecisions: 0, harmfulOutcomes: 0, positiveDecisions: 0, appealedDecisions: 0 });

  // Use computed data
  const groups = computedGroups;
  const alerts = computedAlerts;
  const overall = computedOverall;

  // Harm category breakdown
  const harmByCategory = harmOutcomes?.reduce((acc, h) => {
    const cat = h.harm_category || 'unspecified';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Appeal stats
  const appealStats = {
    total: appeals?.length || 0,
    pending: appeals?.filter(a => a.status === 'pending').length || 0,
    resolved: appeals?.filter(a => a.status === 'resolved').length || 0,
    overturned: appeals?.filter(a => a.final_decision === 'reversed').length || 0,
  };

  const slaBreaches = appeals?.filter(a => {
    if (!a.sla_deadline) return false;
    return new Date(a.sla_deadline) < new Date() && a.status === 'pending';
  }).length || 0;

  return (
    <MainLayout title="Impact Dashboard" subtitle="Population-level fairness and outcome tracking">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <Select value={selectedSystem} onValueChange={setSelectedSystem}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select System" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Systems</SelectItem>
              {systems?.map((sys) => (
                <SelectItem key={sys.id} value={sys.id}>{sys.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeWindow} onValueChange={setTimeWindow}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={() => computeMutation.mutate()}
            disabled={computeMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${computeMutation.isPending ? 'animate-spin' : ''}`} />
            Compute Metrics
          </Button>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive">Fairness Alerts Detected</h3>
                  <ul className="mt-2 space-y-1">
                    {(alerts as Array<{ type: string; message: string; severity: string }>).map((alert, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="mr-2">
                          {alert.type}
                        </Badge>
                        {alert.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overall?.totalDecisions || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Decisions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{overall?.harmfulOutcomes || 0}</p>
                  <p className="text-sm text-muted-foreground">Harmful Outcomes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-warning/10">
                  <Users className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{appealStats.total}</p>
                  <p className="text-sm text-muted-foreground">Appeals Filed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {appealStats.total > 0 ? Math.round((appealStats.resolved / appealStats.total) * 100) : 100}%
                  </p>
                  <p className="text-sm text-muted-foreground">SLA Compliance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Longitudinal Fairness Chart */}
          <LongitudinalFairness 
            groups={groups as Array<{ group: string; positiveRate: number; harmRate: number }>} 
            timeWindow={timeWindow}
          />

          {/* Harm Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Harm Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(harmByCategory).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No harmful outcomes recorded
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(harmByCategory).map(([category, count]) => {
                    const total = harmOutcomes?.length || 1;
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{category.replace('_', ' ')}</span>
                          <span className="font-medium">{count} ({percentage}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Group Metrics Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Group-Level Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No group metrics available. Click "Compute Metrics" to generate.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Group</th>
                      <th className="text-right py-3 px-4">Decisions</th>
                      <th className="text-right py-3 px-4">Positive Rate</th>
                      <th className="text-right py-3 px-4">Harm Rate</th>
                      <th className="text-right py-3 px-4">Appeal Rate</th>
                      <th className="text-right py-3 px-4">Disparate Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.group} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium capitalize">{group.group.replace('_', ' ')}</td>
                        <td className="py-3 px-4 text-right">{group.decisionCount}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={group.positiveRate < 0.5 ? 'text-warning' : ''}>
                            {(group.positiveRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={group.harmRate > 0.1 ? 'text-destructive' : ''}>
                            {(group.harmRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">{(group.appealRate * 100).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant={(group.metrics.disparateImpactRatio ?? group.metrics.disparateImpact ?? 1) < 0.8 ? 'destructive' : 'outline'}>
                            {((group.metrics.disparateImpactRatio ?? group.metrics.disparateImpact ?? 1) * 100).toFixed(0)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appeal Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Appeal Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{appealStats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-success">{appealStats.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{appealStats.overturned}</p>
                <p className="text-sm text-muted-foreground">Overturned</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className={`text-2xl font-bold ${slaBreaches > 0 ? 'text-destructive' : 'text-success'}`}>
                  {slaBreaches}
                </p>
                <p className="text-sm text-muted-foreground">SLA Breaches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
