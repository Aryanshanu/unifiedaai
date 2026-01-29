import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, AlertTriangle, CheckCircle, ChevronRight, RefreshCw, Bot, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReviewQueue, useReviewQueueStats, ReviewItem } from "@/hooks/useReviewQueue";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ReviewDecisionDialog } from "@/components/hitl/ReviewDecisionDialog";
import { SLACountdown } from "@/components/hitl/SLACountdown";
import { BulkTriagePanel } from "@/components/hitl/BulkTriagePanel";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EnforcementBadge } from "@/components/shared/EnforcementBadge";
import { RiskIndicator } from "@/components/fractal";
import { FRACTAL_RISK, normalizeRiskLevel } from "@/lib/fractal-theme";

export default function HITL() {
  const { data: reviews, isLoading, refetch } = useReviewQueue();
  const { data: stats, refetch: refetchStats } = useReviewQueueStats();
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);

  // Supabase Realtime subscriptions for HITL
  useEffect(() => {
    const channel = supabase
      .channel('hitl-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'review_queue' },
        (payload) => {
          refetch();
          refetchStats();
          if (payload.eventType === 'INSERT') {
            const newReview = payload.new as any;
            toast.warning("New Review Queued", {
              description: newReview?.title || "Review requires attention",
              action: {
                label: "View",
                onClick: () => {}
              }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'decisions' },
        () => {
          refetch();
          refetchStats();
          toast.success("Decision Recorded", {
            description: "Audit trail updated"
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, refetchStats]);

  const pendingReviews = reviews?.filter(r => r.status === 'pending' || r.status === 'in_progress') || [];
  const recentDecisions = reviews?.filter(r => r.status === 'approved' || r.status === 'rejected').slice(0, 3) || [];
  
  const handleReviewClick = (review: ReviewItem) => {
    setSelectedReview(review);
    setDecisionDialogOpen(true);
  };
  
  const handleRefresh = () => {
    refetch();
    refetchStats();
    toast.success("Queue synchronized");
  };

  // Calculate queue distribution
  const queueDistribution = pendingReviews.reduce((acc, review) => {
    const type = review.review_type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const distributionItems = Object.entries(queueDistribution).map(([label, count]) => ({
    label,
    count,
    color: label.toLowerCase().includes('safety') ? 'bg-risk-critical' :
           label.toLowerCase().includes('fairness') ? 'bg-risk-high' :
           label.toLowerCase().includes('privacy') ? 'bg-primary' : 'bg-success',
  }));

  return (
    <MainLayout 
      title="HITL Console" 
      subtitle="Human authority decisions and escalations"
      headerActions={
        <EnforcementBadge level="enforced" />
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Pending Reviews"
          value={(stats?.pending || 0).toString()}
          subtitle={`${pendingReviews.filter(r => r.severity === 'critical').length} critical`}
          icon={<Clock className="w-4 h-4 text-risk-high" />}
          status={stats?.pending ? "warning" : "success"}
        />
        <MetricCard
          title="In Progress"
          value={(stats?.inProgress || 0).toString()}
          subtitle="Being reviewed"
          icon={<Clock className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Overdue"
          value={(stats?.overdue || 0).toString()}
          subtitle="Past SLA"
          icon={<AlertTriangle className="w-4 h-4 text-risk-critical" />}
          status={stats?.overdue ? "danger" : "success"}
        />
        <MetricCard
          title="Total Queue"
          value={(stats?.total || 0).toString()}
          subtitle="All reviews"
          icon={<Users className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="queue" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Review Queue
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <ListChecks className="w-4 h-4" />
            Bulk Triage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Review Queue */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-risk-high" />
                  Review Queue
                </h2>
                <Button variant="ghost" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-5 w-48 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingReviews.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                  <p className="text-foreground font-medium">Queue Clear</p>
                  <p className="text-sm text-muted-foreground mt-1">No pending reviews</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} onClick={() => handleReviewClick(review)} />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column */}
            <div>
              {/* Recent Decisions */}
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Recent Decisions
              </h2>

              <div className="bg-card border border-border rounded-xl p-4 mb-6">
                {recentDecisions.length > 0 ? (
                  <div className="space-y-4">
                    {recentDecisions.map((decision) => (
                      <div key={decision.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{decision.id.slice(0, 8)}</span>
                          <span className={cn(
                            "text-xs font-medium",
                            decision.status === "approved" ? "text-success" : "text-risk-critical"
                          )}>
                            {decision.status === "approved" ? "Authorized" : "Denied"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{decision.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{decision.review_type}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(decision.updated_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent decisions</p>
                )}
              </div>

              {/* Queue Distribution */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Queue Distribution</h3>
                {distributionItems.length > 0 ? (
                  <div className="space-y-3">
                    {distributionItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", item.color)} />
                        <span className="text-sm text-muted-foreground flex-1 capitalize">{item.label}</span>
                        <span className="text-sm font-mono text-foreground">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No items in queue</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bulk">
          <BulkTriagePanel onComplete={() => { refetch(); refetchStats(); }} />
        </TabsContent>
      </Tabs>
      
      {/* Decision Dialog */}
      <ReviewDecisionDialog 
        review={selectedReview}
        open={decisionDialogOpen}
        onOpenChange={setDecisionDialogOpen}
      />
    </MainLayout>
  );
}

function ReviewCard({ review, onClick }: { review: ReviewItem; onClick?: () => void }) {
  const riskLevel = normalizeRiskLevel(review.severity);
  const config = FRACTAL_RISK[riskLevel];

  return (
    <div 
      className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          config.bg
        )}>
          <AlertTriangle className={cn("w-5 h-5", config.text)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">{review.id.slice(0, 8)}</span>
            <RiskIndicator level={review.severity} size="sm" />
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground capitalize">{review.review_type}</span>
          </div>
          <p className="font-medium text-foreground mb-1">{review.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
            {review.assignee_id && (
              <>
                <span>•</span>
                <span>Assigned</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {review.sla_deadline && (
            <SLACountdown deadline={review.sla_deadline} className="text-xs" />
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
}
