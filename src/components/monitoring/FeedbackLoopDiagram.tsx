import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertCircle, ArrowRight, Database, RefreshCw, 
  CheckCircle, TrendingUp, Shield, Clock, User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LoopStats {
  issuesDetected: number;
  actionsTaken: number;
  improvements: number;
  pendingReview: number;
}

export function FeedbackLoopDiagram() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['feedback-loop-stats'],
    queryFn: async () => {
      const [incidentsRes, decisionsRes, resolvedRes, reviewQueueRes] = await Promise.all([
        // Issues detected (open incidents)
        supabase.from('incidents').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
        // Actions taken (decisions made)
        supabase.from('decisions').select('id', { count: 'exact', head: true }),
        // Improvements verified (resolved incidents)
        supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
        // Pending HITL review
        supabase.from('review_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      return {
        issuesDetected: incidentsRes.count || 0,
        actionsTaken: decisionsRes.count || 0,
        improvements: resolvedRes.count || 0,
        pendingReview: reviewQueueRes.count || 0,
      } as LoopStats;
    },
    refetchInterval: 30000,
  });

  const stages = [
    {
      id: 1,
      title: 'Issue Detected',
      subtitle: 'Incident Created',
      icon: AlertCircle,
      count: stats?.issuesDetected || 0,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      id: 2,
      title: 'Action Taken',
      subtitle: 'HITL Review',
      icon: User,
      count: stats?.actionsTaken || 0,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      id: 3,
      title: 'Improvement Verified',
      subtitle: 'Re-profile / Retrain',
      icon: CheckCircle,
      count: stats?.improvements || 0,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-5 w-5 text-primary" />
          Continuous Improvement Loop
        </CardTitle>
        <CardDescription>
          Track issues from detection through resolution
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Main Flow */}
        <div className="relative">
          <div className="grid grid-cols-3 gap-4">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="relative">
                  {/* Arrow between stages */}
                  {index < stages.length - 1 && (
                    <ArrowRight className="absolute -right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground z-10" />
                  )}
                  
                  <div className={cn(
                    "p-4 rounded-xl border-2 text-center transition-all",
                    stage.bgColor,
                    "border-border hover:border-primary/30"
                  )}>
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3",
                      stage.bgColor
                    )}>
                      <Icon className={cn("h-6 w-6", stage.color)} />
                    </div>
                    
                    <h4 className="font-semibold text-sm text-foreground">
                      {stage.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stage.subtitle}
                    </p>
                    
                    <Badge variant="outline" className={cn("mt-3", stage.color)}>
                      {stage.count}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feedback Loop Arrow */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-muted-foreground">
            <div className="h-px w-20 bg-border" />
            <RefreshCw className="h-4 w-4" />
            <span className="text-xs">Continuous Loop</span>
            <div className="h-px w-20 bg-border" />
          </div>
        </div>

        {/* Pending Review Alert */}
        {(stats?.pendingReview || 0) > 0 && (
          <div className="mt-12 p-3 rounded-lg bg-warning/5 border border-warning/20 flex items-center gap-3">
            <Shield className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {stats?.pendingReview} items pending human review
              </p>
              <p className="text-xs text-muted-foreground">
                Navigate to HITL Console to process
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
