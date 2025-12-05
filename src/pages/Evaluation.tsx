import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Activity, Play, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const recentEvaluations = [
  { id: "1", model: "Credit Scoring v2", suite: "Fairness & Bias", status: "warning" as const, fairness: 72, robustness: 88, privacy: 91, toxicity: null, timestamp: "2h ago" },
  { id: "2", model: "Fraud Detection v3", suite: "Full Suite", status: "healthy" as const, fairness: 91, robustness: 94, privacy: 89, toxicity: null, timestamp: "1h ago" },
  { id: "3", model: "Support Chatbot", suite: "LLM Safety", status: "healthy" as const, fairness: 85, robustness: 79, privacy: 92, toxicity: 96, timestamp: "30m ago" },
  { id: "4", model: "Loan Approval v1", suite: "Regulatory", status: "critical" as const, fairness: 58, robustness: 71, privacy: 84, toxicity: null, timestamp: "4h ago" },
];

const evalSuites = [
  { name: "Fairness & Bias", tests: 24, models: 18, lastRun: "2h ago" },
  { name: "Robustness", tests: 32, models: 22, lastRun: "1h ago" },
  { name: "Privacy & PII", tests: 18, models: 15, lastRun: "3h ago" },
  { name: "LLM Safety", tests: 45, models: 4, lastRun: "30m ago" },
  { name: "Regulatory (EU AI Act)", tests: 48, models: 24, lastRun: "6h ago" },
];

export default function Evaluation() {
  return (
    <MainLayout title="Evaluation Hub" subtitle="Systematic testing for fairness, robustness, safety, and compliance">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Runs"
          value="1,247"
          subtitle="Last 30 days"
          icon={<Activity className="w-4 h-4 text-primary" />}
          trend={{ value: 23, direction: "up" }}
        />
        <MetricCard
          title="Pass Rate"
          value="92%"
          subtitle="Above threshold"
          icon={<Activity className="w-4 h-4 text-success" />}
          status="success"
        />
        <MetricCard
          title="Avg Score"
          value="84.2"
          subtitle="Across all metrics"
          trend={{ value: 5, direction: "up" }}
        />
        <MetricCard
          title="Pending"
          value="3"
          subtitle="Awaiting review"
          status="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Evaluations */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Recent Evaluations</h2>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
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
                  {recentEvaluations.map((eval_) => (
                    <tr key={eval_.id} className="border-t border-border hover:bg-secondary/30 transition-colors cursor-pointer">
                      <td className="p-4">
                        <span className="font-medium text-foreground">{eval_.model}</span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{eval_.suite}</td>
                      <td className="p-4 text-center">
                        <ScoreRing score={eval_.fairness} size="sm" />
                      </td>
                      <td className="p-4 text-center">
                        <ScoreRing score={eval_.robustness} size="sm" />
                      </td>
                      <td className="p-4 text-center">
                        <ScoreRing score={eval_.privacy} size="sm" />
                      </td>
                      <td className="p-4 text-center">
                        <StatusBadge status={eval_.status} />
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{eval_.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Evaluation Suites */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Evaluation Suites</h2>
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {evalSuites.map((suite) => (
              <div
                key={suite.name}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {suite.name}
                  </span>
                  <Button variant="ghost" size="iconSm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{suite.tests} tests</span>
                  <span>{suite.models} models</span>
                  <span className="ml-auto">{suite.lastRun}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
