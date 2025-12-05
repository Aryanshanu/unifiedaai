import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Lock, Shield, Play, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const policies = [
  { id: "POL-001", name: "Content Safety - High Risk", rules: 12, models: 4, status: "active", blocks: 23 },
  { id: "POL-002", name: "PII Protection - HIPAA", rules: 8, models: 6, status: "active", blocks: 45 },
  { id: "POL-003", name: "Prompt Injection Defense", rules: 15, models: 2, status: "active", blocks: 12 },
  { id: "POL-004", name: "Output Watermarking", rules: 3, models: 4, status: "draft", blocks: 0 },
  { id: "POL-005", name: "Citation Enforcement", rules: 5, models: 1, status: "active", blocks: 8 },
];

const redTeamCampaigns = [
  { id: "RT-001", name: "Jailbreak Probes - Q4", model: "Support Chatbot", attacks: 150, failures: 3, coverage: 98, status: "completed" },
  { id: "RT-002", name: "Adversarial Inputs", model: "Credit Scoring v2", attacks: 200, failures: 8, coverage: 96, status: "running" },
  { id: "RT-003", name: "PII Extraction", model: "Resume Screener", attacks: 100, failures: 1, coverage: 99, status: "completed" },
];

export default function Policy() {
  return (
    <MainLayout title="Policy Studio" subtitle="Runtime guardrails, enforcement rules, and red team orchestration">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Active Policies"
          value="47"
          subtitle="Across 24 models"
          icon={<Lock className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Blocks Today"
          value="88"
          subtitle="45 PII, 23 safety, 20 other"
          icon={<Shield className="w-4 h-4 text-warning" />}
          status="warning"
        />
        <MetricCard
          title="Red Team Coverage"
          value="97%"
          subtitle="All high-risk models"
          icon={<AlertTriangle className="w-4 h-4 text-success" />}
          status="success"
        />
        <MetricCard
          title="Avg Block Rate"
          value="0.3%"
          subtitle="Of total requests"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Policies */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Policy Packs
            </h2>
            <Button variant="gradient" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Policy
            </Button>
          </div>

          <div className="space-y-3">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{policy.id}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      policy.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    )}>
                      {policy.status}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-warning">{policy.blocks} blocks</span>
                </div>
                <p className="font-medium text-foreground mb-1">{policy.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{policy.rules} rules</span>
                  <span>•</span>
                  <span>{policy.models} models</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Red Team Campaigns */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Red Team Campaigns
            </h2>
            <Button variant="outline" size="sm">
              <Play className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>

          <div className="space-y-3">
            {redTeamCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{campaign.id}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1",
                      campaign.status === "running" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                    )}>
                      {campaign.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                      {campaign.status}
                    </span>
                  </div>
                  <span className={cn(
                    "text-sm font-bold font-mono",
                    campaign.coverage >= 98 ? "text-success" : campaign.coverage >= 95 ? "text-warning" : "text-danger"
                  )}>
                    {campaign.coverage}%
                  </span>
                </div>
                <p className="font-medium text-foreground mb-1">{campaign.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{campaign.model}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">{campaign.attacks} attacks</span>
                  <span className={cn(
                    "font-medium",
                    campaign.failures > 5 ? "text-danger" : campaign.failures > 0 ? "text-warning" : "text-success"
                  )}>
                    {campaign.failures} failures
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
