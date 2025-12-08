import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Lock, Shield, Play, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePolicyPacks, useRedTeamCampaigns, usePolicyStats, useCreatePolicyPack } from "@/hooks/usePolicies";
import { useModels } from "@/hooks/useModels";
import { PolicyDSLEditor } from "@/components/policy/PolicyDSLEditor";
import { RedTeamCampaignForm } from "@/components/policy/RedTeamCampaignForm";

export default function Policy() {
  const { data: policies, isLoading: policiesLoading } = usePolicyPacks();
  const { data: campaigns, isLoading: campaignsLoading } = useRedTeamCampaigns();
  const { data: stats, isLoading: statsLoading } = usePolicyStats();
  const { data: models } = useModels();
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);

  const getModelName = (modelId: string | null) => {
    if (!modelId || !models) return 'Unknown Model';
    const model = models.find(m => m.id === modelId);
    return model?.name || 'Unknown Model';
  };

  const isLoading = policiesLoading || campaignsLoading || statsLoading;

  return (
    <MainLayout title="Policy Studio" subtitle="Runtime guardrails, enforcement rules, and red team orchestration">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Active Policies"
          value={statsLoading ? "..." : String(stats?.activePolicies || 0)}
          subtitle={`${policies?.length || 0} total policies`}
          icon={<Lock className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Blocked Violations"
          value={statsLoading ? "..." : String(stats?.blockedViolations || 0)}
          subtitle="Threats prevented"
          icon={<Shield className="w-4 h-4 text-warning" />}
          status="warning"
        />
        <MetricCard
          title="Running Campaigns"
          value={statsLoading ? "..." : String(stats?.runningCampaigns || 0)}
          subtitle="Active red team tests"
          icon={<AlertTriangle className="w-4 h-4 text-success" />}
          status="success"
        />
        <MetricCard
          title="Total Findings"
          value={statsLoading ? "..." : String(stats?.totalFindings || 0)}
          subtitle="From all campaigns"
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
            <Button variant="gradient" size="sm" onClick={() => setShowPolicyEditor(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Policy
            </Button>
          </div>

          {policiesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !policies?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No policy packs yet</p>
              <p className="text-xs">Create your first policy pack to enforce guardrails</p>
            </div>
          ) : (
            <div className="space-y-3">
              {policies.map((policy) => {
                const rulesCount = Array.isArray(policy.rules) ? policy.rules.length : 0;
                return (
                  <div
                    key={policy.id}
                    className="p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">v{policy.version}</span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full",
                          policy.status === "active" ? "bg-success/10 text-success" : 
                          policy.status === "disabled" ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"
                        )}>
                          {policy.status}
                        </span>
                      </div>
                    </div>
                    <p className="font-medium text-foreground mb-1">{policy.name}</p>
                    {policy.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{policy.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{rulesCount} rules</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Red Team Campaigns */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Red Team Campaigns
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowCampaignForm(true)}>
              <Play className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>

          {campaignsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !campaigns?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No red team campaigns yet</p>
              <p className="text-xs">Start a campaign to test model robustness</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const attackCount = Array.isArray(campaign.attack_types) ? campaign.attack_types.length : 0;
                return (
                  <div
                    key={campaign.id}
                    className="p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1",
                          campaign.status === "running" ? "bg-primary/10 text-primary" : 
                          campaign.status === "completed" ? "bg-success/10 text-success" :
                          campaign.status === "paused" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                        )}>
                          {campaign.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                          {campaign.status}
                        </span>
                      </div>
                      <span className={cn(
                        "text-sm font-bold font-mono",
                        (campaign.coverage || 0) >= 98 ? "text-success" : (campaign.coverage || 0) >= 95 ? "text-warning" : "text-danger"
                      )}>
                        {campaign.coverage || 0}%
                      </span>
                    </div>
                    <p className="font-medium text-foreground mb-1">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">{getModelName(campaign.model_id)}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">{attackCount} attack types</span>
                      <span className={cn(
                        "font-medium",
                        (campaign.findings_count || 0) > 5 ? "text-danger" : (campaign.findings_count || 0) > 0 ? "text-warning" : "text-success"
                      )}>
                        {campaign.findings_count || 0} findings
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Policy Editor Dialog */}
      <PolicyDSLEditor 
        open={showPolicyEditor} 
        onOpenChange={setShowPolicyEditor} 
      />

      {/* Red Team Campaign Form Dialog */}
      <RedTeamCampaignForm 
        open={showCampaignForm} 
        onOpenChange={setShowCampaignForm} 
      />
    </MainLayout>
  );
}
