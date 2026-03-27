import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Activity, Play, Calendar, Plus } from "lucide-react";
import { useEvaluationRuns, useEvaluationSuites, useEvaluationStats, EvaluationRun } from "@/hooks/useEvaluations";
import { useModels } from "@/hooks/useModels";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, subMonths, isAfter } from "date-fns";
import { EvaluationSuiteForm } from "@/components/evaluation/EvaluationSuiteForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function getEvalStatus(run: EvaluationRun): "healthy" | "warning" | "critical" {
  const score = run.overall_score ?? 0;
  if (score >= 80) return "healthy";
  if (score >= 60) return "warning";
  return "critical";
}

export default function Evaluation() {
  const navigate = useNavigate();
  const { data: runs, isLoading: runsLoading } = useEvaluationRuns();
  const { data: suites, isLoading: suitesLoading } = useEvaluationSuites();
  const { data: stats } = useEvaluationStats();
  const { data: models } = useModels();

  // Compute trend from real data
  const now = new Date();
  const oneMonthAgo = subMonths(now, 1);
  const twoMonthsAgo = subMonths(now, 2);
  const thisMonthCount = runs?.filter(r => isAfter(new Date(r.created_at), oneMonthAgo)).length ?? 0;
  const lastMonthCount = runs?.filter(r => {
    const d = new Date(r.created_at);
    return isAfter(d, twoMonthsAgo) && !isAfter(d, oneMonthAgo);
  }).length ?? 0;
  const trendValue = lastMonthCount > 0 ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) : thisMonthCount > 0 ? 100 : 0;
  const trendDirection: "up" | "down" = trendValue >= 0 ? "up" : "down";

  const modelMap = models?.reduce((acc, m) => {
    acc[m.id] = m.name;
    return acc;
  }, {} as Record<string, string>) || {};

  const suiteMap = suites?.reduce((acc, s) => {
    acc[s.id] = s.name;
    return acc;
  }, {} as Record<string, string>) || {};

  const recentRuns = runs?.slice(0, 10) || [];

  const handleRunSuite = async (suiteId: string) => {
    try {
      const { error } = await supabase.functions.invoke('run-scheduled-evaluations', {
        body: { suite_id: suiteId }
      });
      if (error) throw error;
      toast.success("Evaluation triggered successfully");
    } catch (err: unknown) {
      toast.error("Failed to trigger evaluation: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <MainLayout title="Evaluation Hub" subtitle="Systematic testing for fairness, robustness, safety, and compliance">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Runs"
          value={(stats?.total || 0).toString()}
          subtitle="All time"
          icon={<Activity className="w-4 h-4 text-primary" />}
          trend={{ value: Math.abs(trendValue), direction: trendDirection }}
        />
        <MetricCard
          title="Completed"
          value={(stats?.completed || 0).toString()}
          subtitle="Successfully finished"
          icon={<Activity className="w-4 h-4 text-success" />}
          status="success"
        />
        <MetricCard
          title="Avg Score"
          value={(stats?.avgScore || 0).toString()}
          subtitle="Across all metrics"
          trend={{ value: 5, direction: "up" }}
        />
        <MetricCard
          title="Running"
          value={(stats?.running || 0).toString()}
          subtitle="In progress"
          status={stats?.running ? "warning" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Recent Evaluations</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/continuous-evaluation')}>
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {runsLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentRuns.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium">No evaluations yet</p>
                <p className="text-sm text-muted-foreground mt-1">Run your first evaluation to see results here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Model</th>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Suite</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Fairness</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Robust</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Privacy</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.map((run) => (
                      <tr key={run.id} className="border-t border-border hover:bg-secondary/30 transition-colors cursor-pointer">
                        <td className="p-4">
                          <span className="font-medium text-foreground">{modelMap[run.model_id] || 'Unknown'}</span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {run.suite_id ? suiteMap[run.suite_id] || 'Custom' : 'Ad-hoc'}
                        </td>
                        <td className="p-4 text-center">
                          <ScoreRing score={run.fairness_score ?? 0} size="sm" />
                        </td>
                        <td className="p-4 text-center">
                          <ScoreRing score={run.robustness_score ?? 0} size="sm" />
                        </td>
                        <td className="p-4 text-center">
                          <ScoreRing score={run.privacy_score ?? 0} size="sm" />
                        </td>
                        <td className="p-4 text-center">
                          <StatusBadge status={run.status === 'completed' ? getEvalStatus(run) : run.status === 'running' ? 'warning' : 'pending'} />
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Evaluation Suites */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Evaluation Suites</h2>
            <EvaluationSuiteForm />
          </div>

          {suitesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          ) : suites?.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-muted-foreground text-sm">No evaluation suites created yet</p>
              <Button variant="outline" size="sm" className="mt-4">
                <EvaluationSuiteForm />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {suites?.map((suite) => (
                <div
                  key={suite.id}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {suite.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRunSuite(suite.id)}
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{suite.test_count} tests</span>
                    <span className="ml-auto">{formatDistanceToNow(new Date(suite.updated_at), { addSuffix: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
