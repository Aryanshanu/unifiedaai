import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Users, Clock, AlertTriangle, CheckCircle, MessageSquare, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const pendingReviews = [
  { id: "REV-001", type: "Safety", model: "Support Chatbot", title: "Potential harmful response detected", severity: "critical", assignee: "Jane D.", createdAt: "15m ago", sla: "30m left" },
  { id: "REV-002", type: "Fairness", model: "Credit Scoring v2", title: "Demographic disparity threshold breach", severity: "high", assignee: "Mike R.", createdAt: "1h ago", sla: "2h left" },
  { id: "REV-003", type: "Privacy", model: "Resume Screener", title: "PII exposure in output logs", severity: "high", assignee: null, createdAt: "2h ago", sla: "1h left" },
  { id: "REV-004", type: "Deployment", model: "Fraud Detection v3", title: "Pre-deployment approval required", severity: "medium", assignee: "Sarah K.", createdAt: "3h ago", sla: "5h left" },
  { id: "REV-005", type: "Override", model: "Loan Approval v1", title: "Manual guardrail override request", severity: "medium", assignee: null, createdAt: "4h ago", sla: "4h left" },
];

const recentDecisions = [
  { id: "DEC-101", type: "Safety", model: "Support Chatbot", decision: "Blocked", reviewer: "Jane D.", timestamp: "30m ago" },
  { id: "DEC-100", type: "Deployment", model: "Sentiment Analyzer", decision: "Approved", reviewer: "Mike R.", timestamp: "2h ago" },
  { id: "DEC-099", type: "Fairness", model: "Resume Screener", decision: "Remediation Required", reviewer: "Sarah K.", timestamp: "4h ago" },
];

const severityColors = {
  critical: "bg-danger/10 text-danger border-danger/30",
  high: "bg-warning/10 text-warning border-warning/30",
  medium: "bg-primary/10 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function HITL() {
  return (
    <MainLayout title="HITL Console" subtitle="Human-in-the-loop decisions, reviews, and escalations">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Pending Reviews"
          value="12"
          subtitle="3 critical, 5 high"
          icon={<Clock className="w-4 h-4 text-warning" />}
          status="warning"
        />
        <MetricCard
          title="Avg Response Time"
          value="2.4h"
          subtitle="Target: 4h"
          icon={<Clock className="w-4 h-4 text-success" />}
          status="success"
          trend={{ value: 12, direction: "down" }}
        />
        <MetricCard
          title="Decisions Today"
          value="23"
          subtitle="8 blocked, 15 approved"
          icon={<CheckCircle className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="SLA Compliance"
          value="94%"
          subtitle="Last 7 days"
          icon={<Users className="w-4 h-4 text-success" />}
          status="success"
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
            </div>
          </div>

          <div className="space-y-3">
            {pendingReviews.map((review) => (
              <div
                key={review.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
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
                      <span className="text-xs font-mono text-muted-foreground">{review.id}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                        severityColors[review.severity as keyof typeof severityColors]
                      )}>
                        {review.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-primary">{review.type}</span>
                    </div>
                    <p className="font-medium text-foreground mb-1">{review.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{review.model}</span>
                      <span>•</span>
                      <span>{review.createdAt}</span>
                      {review.assignee && (
                        <>
                          <span>•</span>
                          <span>Assigned: {review.assignee}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={cn(
                      "text-xs font-medium",
                      review.sla.includes("30m") || review.sla.includes("1h") ? "text-danger" : "text-muted-foreground"
                    )}>
                      {review.sla}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Decisions */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            Recent Decisions
          </h2>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="space-y-4">
              {recentDecisions.map((decision) => (
                <div key={decision.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{decision.id}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      decision.decision === "Approved" ? "text-success" : decision.decision === "Blocked" ? "text-danger" : "text-warning"
                    )}>
                      {decision.decision}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{decision.model}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{decision.type}</span>
                    <span>•</span>
                    <span>{decision.reviewer}</span>
                    <span>•</span>
                    <span>{decision.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="ghost" size="sm" className="w-full mt-4">
              View all decisions
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Queue Distribution</h3>
            <div className="space-y-3">
              {[
                { label: "Safety", count: 4, color: "bg-danger" },
                { label: "Fairness", count: 3, color: "bg-warning" },
                { label: "Privacy", count: 2, color: "bg-primary" },
                { label: "Deployment", count: 3, color: "bg-success" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", item.color)} />
                  <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
                  <span className="text-sm font-mono text-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
