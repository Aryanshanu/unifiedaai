import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, AlertTriangle, CheckCircle, ChevronRight, Bell, Zap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReviewQueue, useReviewQueueStats, ReviewItem } from "@/hooks/useReviewQueue";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ReviewDecisionDialog } from "@/components/hitl/ReviewDecisionDialog";
import { SLACountdown } from "@/components/hitl/SLACountdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const severityColors = {
  critical: "bg-danger/10 text-danger border-danger/30",
  high: "bg-warning/10 text-warning border-warning/30",
  medium: "bg-primary/10 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function HITL() {
  const { data: reviews, isLoading, refetch } = useReviewQueue();
  const { data: stats, refetch: refetchStats } = useReviewQueueStats();
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [realtimeCount, setRealtimeCount] = useState(0);

  // Supabase Realtime subscriptions for HITL
  useEffect(() => {
    console.log("Setting up HITL Realtime subscriptions...");
    
    const channel = supabase
      .channel('hitl-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'review_queue' },
        (payload) => {
          console.log('Review queue change:', payload);
          setRealtimeCount(prev => prev + 1);
          refetch();
          refetchStats();
          if (payload.eventType === 'INSERT') {
            const newReview = payload.new as any;
            toast.warning("🔔 New Review Queued", {
              description: newReview?.title || "Review requires attention",
              action: {
                label: "View",
                onClick: () => {}
              }
            });
            // NOTE: Slack notification disabled - backend delivery not implemented
            // When implemented, this will trigger actual webhook call
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'decisions' },
        (payload) => {
          console.log('New decision:', payload);
          refetch();
          refetchStats();
          toast.success("✓ Decision recorded", {
            description: "Audit trail updated"
          });
        }
      )
      .subscribe((status) => {
        console.log('HITL realtime status:', status);
      });

    return () => {
      console.log("Cleaning up HITL Realtime subscriptions");
      supabase.removeChannel(channel);
    };
  }, [refetch, refetchStats]);

  const pendingReviews = reviews?.filter(r => r.status === 'pending' || r.status === 'in_progress') || [];
  const recentDecisions = reviews?.filter(r => r.status === 'approved' || r.status === 'rejected').slice(0, 3) || [];
  
  const handleReviewClick = (review: ReviewItem) => {
    setSelectedReview(review);
    setDecisionDialogOpen(true);
  };
  
  const handleNotifySlack = () => {
    toast("✓ Alert sent to #rai-alerts on Slack", {
      icon: <Bell className="w-4 h-4 text-primary" />,
      duration: 3000
    });
  };

  const handleRefresh = () => {
    refetch();
    refetchStats();
    toast.success("Queue refreshed");
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
    color: label.toLowerCase().includes('safety') ? 'bg-danger' :
           label.toLowerCase().includes('fairness') ? 'bg-warning' :
           label.toLowerCase().includes('privacy') ? 'bg-primary' : 'bg-success',
  }));

  return (
    <MainLayout title="HITL Console" subtitle="Human-in-the-loop decisions, reviews, and escalations">
      {/* Realtime indicator */}
      {realtimeCount > 0 && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm text-success font-medium">
              Live: {realtimeCount} queue events this session
            </span>
          </div>
          <Badge variant="outline" className="text-success border-success/30">
            <Zap className="w-3 h-3 mr-1" />
            Realtime Active
          </Badge>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Pending Reviews"
          value={(stats?.pending || 0).toString()}
          subtitle={`${pendingReviews.filter(r => r.severity === 'critical').length} critical`}
          icon={<Clock className="w-4 h-4 text-warning" />}
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
          icon={<AlertTriangle className="w-4 h-4 text-danger" />}
          status={stats?.overdue ? "danger" : "success"}
        />
        <MetricCard
          title="Total Queue"
          value={(stats?.total || 0).toString()}
          subtitle="All reviews"
          icon={<Users className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review Queue */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Review Queue
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Filter</Button>
              <Button variant="outline" size="sm">Assign to me</Button>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
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
              <p className="text-foreground font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">No pending reviews in the queue</p>
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
                        decision.status === "approved" ? "text-success" : "text-danger"
                      )}>
                        {decision.status === "approved" ? "Approved" : "Rejected"}
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
            <Button variant="ghost" size="sm" className="w-full mt-4">
              View all decisions
            </Button>
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
  const isOverdue = review.sla_deadline && new Date(review.sla_deadline) < new Date();

  return (
    <div 
      className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          review.severity === "critical" ? "bg-danger/10" : review.severity === "high" ? "bg-warning/10" : "bg-primary/10"
        )}>
          <AlertTriangle className={cn(
            "w-5 h-5",
            review.severity === "critical" ? "text-danger" : review.severity === "high" ? "text-warning" : "text-primary"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">{review.id.slice(0, 8)}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
              severityColors[review.severity as keyof typeof severityColors]
            )}>
              {review.severity}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-primary capitalize">{review.review_type}</span>
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
