import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PillarOverview } from "@/components/dashboard/PillarOverview";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { LiveMetrics } from "@/components/dashboard/LiveMetrics";
import { ComplianceGauge } from "@/components/dashboard/ComplianceGauge";
import { ModelCard } from "@/components/dashboard/ModelCard";
import {
  Database,
  Activity,
  Shield,
  Users,
  GitBranch,
  Lock,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";

// Mock data
const alerts = [
  { id: "1", type: "critical" as const, title: "Fairness Threshold Breach", description: "Demographic parity below threshold for credit-scoring-v2", timestamp: "2m ago", model: "credit-scoring-v2" },
  { id: "2", type: "warning" as const, title: "Drift Detected", description: "Feature distribution shift in fraud-detection input layer", timestamp: "15m ago", model: "fraud-detection-v3" },
  { id: "3", type: "info" as const, title: "Evaluation Complete", description: "Red team campaign finished for chatbot-support model", timestamp: "1h ago", model: "chatbot-support-v1" },
  { id: "4", type: "success" as const, title: "Attestation Signed", description: "EU AI Act compliance attestation generated", timestamp: "2h ago" },
  { id: "5", type: "warning" as const, title: "HITL Queue Growing", description: "12 pending reviews exceeding SLA threshold", timestamp: "3h ago" },
];

const liveMetrics = [
  { label: "Requests/min", value: 12847, unit: "req/m", trend: [120, 125, 118, 130, 128, 135, 142, 138] },
  { label: "Avg Latency", value: 42, unit: "ms", trend: [45, 42, 48, 44, 41, 43, 42, 40] },
  { label: "Safety Blocks", value: 23, unit: "today", trend: [2, 3, 1, 4, 2, 3, 5, 3] },
];

const controlGroups = [
  { name: "EU AI Act", satisfied: 42, total: 48 },
  { name: "NIST AI RMF", satisfied: 38, total: 42 },
  { name: "ISO/IEC 42001", satisfied: 31, total: 35 },
];

const models = [
  { name: "Credit Scoring v2", type: "XGBoost", version: "2.3.1", status: "warning" as const, fairnessScore: 72, robustnessScore: 88, lastEval: "2h ago", incidents: 2 },
  { name: "Fraud Detection v3", type: "Deep Learning", version: "3.1.0", status: "healthy" as const, fairnessScore: 91, robustnessScore: 94, lastEval: "1h ago", incidents: 0 },
  { name: "Support Chatbot", type: "LLM (GPT-4)", version: "1.2.0", status: "healthy" as const, fairnessScore: 85, robustnessScore: 79, lastEval: "30m ago", incidents: 1 },
  { name: "Loan Approval v1", type: "Ensemble", version: "1.0.5", status: "critical" as const, fairnessScore: 58, robustnessScore: 71, lastEval: "4h ago", incidents: 5 },
];

export default function Index() {
  return (
    <MainLayout title="Control Tower" subtitle="Enterprise AI Governance Overview">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Active Models"
          value="24"
          subtitle="4 pending review"
          icon={<Database className="w-4 h-4 text-primary" />}
          trend={{ value: 12, direction: "up" }}
          status="neutral"
        />
        <MetricCard
          title="Risk Incidents"
          value="7"
          subtitle="3 critical, 4 warning"
          icon={<AlertTriangle className="w-4 h-4 text-warning" />}
          trend={{ value: 8, direction: "down" }}
          status="warning"
        />
        <MetricCard
          title="Compliance Score"
          value="87%"
          subtitle="3 controls pending"
          icon={<Shield className="w-4 h-4 text-success" />}
          trend={{ value: 5, direction: "up" }}
          status="success"
        />
        <MetricCard
          title="HITL Queue"
          value="12"
          subtitle="Avg 2.4h response"
          icon={<Users className="w-4 h-4 text-muted-foreground" />}
          trend={{ value: 15, direction: "up" }}
          status="neutral"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pillars */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pillar Overview Cards */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Core Pillars
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <PillarOverview
                title="Evaluation"
                icon={<Activity className="w-5 h-5" />}
                score={84}
                metrics={[
                  { label: "Tests Run", value: "1.2K" },
                  { label: "Pass Rate", value: "92%" },
                ]}
                href="/evaluation"
              />
              <PillarOverview
                title="Observability"
                icon={<Activity className="w-5 h-5" />}
                score={91}
                metrics={[
                  { label: "Uptime", value: "99.9%" },
                  { label: "Drift Alerts", value: 3 },
                ]}
                href="/observability"
              />
              <PillarOverview
                title="Governance"
                icon={<Shield className="w-5 h-5" />}
                score={87}
                metrics={[
                  { label: "Controls", value: "111/125" },
                  { label: "Attestations", value: 8 },
                ]}
                href="/governance"
              />
              <PillarOverview
                title="HITL"
                icon={<Users className="w-5 h-5" />}
                score={76}
                metrics={[
                  { label: "Pending", value: 12 },
                  { label: "Avg Time", value: "2.4h" },
                ]}
                href="/hitl"
                accentColor="warning"
              />
              <PillarOverview
                title="Knowledge Graph"
                icon={<GitBranch className="w-5 h-5" />}
                score={95}
                metrics={[
                  { label: "Nodes", value: "2.4K" },
                  { label: "Relations", value: "8.1K" },
                ]}
                href="/lineage"
              />
              <PillarOverview
                title="Policy"
                icon={<Lock className="w-5 h-5" />}
                score={89}
                metrics={[
                  { label: "Active Rules", value: 47 },
                  { label: "Blocked", value: 23 },
                ]}
                href="/policy"
              />
            </div>
          </div>

          {/* Model Registry Preview */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Model Registry
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {models.map((model) => (
                <ModelCard key={model.name} {...model} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Alerts & Metrics */}
        <div className="space-y-6">
          <LiveMetrics metrics={liveMetrics} />
          <ComplianceGauge overallScore={87} controlGroups={controlGroups} />
          <AlertFeed alerts={alerts} />
        </div>
      </div>
    </MainLayout>
  );
}
