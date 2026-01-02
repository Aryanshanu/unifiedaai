import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Lock, Shield, Play, Plus, AlertTriangle, Loader2, Zap, Target, FlameKindling } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePolicyPacks, useRedTeamCampaigns, usePolicyStats, useCreatePolicyPack } from "@/hooks/usePolicies";
import { useModels } from "@/hooks/useModels";
import { PolicyDSLEditor } from "@/components/policy/PolicyDSLEditor";
import { RedTeamCampaignForm } from "@/components/policy/RedTeamCampaignForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PolicyExplainer } from "@/components/policy/PolicyExplainer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, HelpCircle } from "lucide-react";

const ATTACK_CATEGORIES = [
  { name: "Jailbreak", color: "bg-danger/20 text-danger" },
  { name: "Prompt Injection", color: "bg-warning/20 text-warning" },
  { name: "Toxicity", color: "bg-purple-500/20 text-purple-400" },
  { name: "PII Extraction", color: "bg-blue-500/20 text-blue-400" },
  { name: "Hallucination", color: "bg-orange-500/20 text-orange-400" },
  { name: "Policy Bypass", color: "bg-pink-500/20 text-pink-400" },
];

export default function Policy() {
  const { data: policies, isLoading: policiesLoading } = usePolicyPacks();
  const { data: campaigns, isLoading: campaignsLoading } = useRedTeamCampaigns();
  const { data: stats, isLoading: statsLoading } = usePolicyStats();
  const { data: models } = useModels();
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [isRunningCampaign, setIsRunningCampaign] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState(0);
  const [latestCampaignResult, setLatestCampaignResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const getModelName = (modelId: string | null) => {
    if (!modelId || !models) return "Unknown Model";
    const model = models.find((m) => m.id === modelId);
    return model?.name || "Unknown Model";
  };

  const runSampleCampaign = async () => {
    setIsRunningCampaign(true);
    setCampaignProgress(0);
    setLatestCampaignResult(null);

    try {
      toast.info("Starting Red Team Campaign", {
        description: "Executing adversarial attack scenarios...",
      });

      // Simple indeterminate loading - no fake progress simulation
      setCampaignProgress(50); // Shows "Running..." state

      const { data, error } = await supabase.functions.invoke("run-red-team", {
        body: {
          campaignName: `Sample Campaign ${new Date().toLocaleDateString()}`,
          attackCount: 30,
          runFullCampaign: true,
        },
      });

      setCampaignProgress(100);

      if (error) throw error;

      setLatestCampaignResult(data);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["red-team-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["policy", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["policy-violations"] });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });

      const passRate = data?.summary?.passRate || 0;
      const findings = data?.summary?.failedTests || 0;

      toast.success("Red Team Campaign Complete", {
        description: `Coverage: ${passRate}% | ${findings} vulnerabilities found`,
      });

      if (findings > 0) {
        toast.warning("Vulnerabilities detected", {
          description: `${findings} issues added to review queue for human oversight`,
        });
      }
    } catch (error: any) {
      console.error("Campaign error:", error);
      toast.error("Campaign failed", { description: error.message });
    } finally {
      setIsRunningCampaign(false);
    }
  };

  const isLoading = policiesLoading || campaignsLoading || statsLoading;

  return (
    <MainLayout title="Policy Studio" subtitle="Runtime guardrails, enforcement rules, and red team orchestration">
      {/* Sample Campaign Button - Prominent */}
      <div className="mb-6 p-4 bg-gradient-to-r from-danger/10 via-warning/10 to-primary/10 border border-danger/20 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-danger/20 flex items-center justify-center">
              <FlameKindling className="w-6 h-6 text-danger" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Run Sample Red-Team Campaign</h3>
              <p className="text-sm text-muted-foreground">
                Execute 30 adversarial attacks (jailbreaks, prompt injection, toxicity, PII extraction)
              </p>
            </div>
          </div>
          <Button
            onClick={runSampleCampaign}
            disabled={isRunningCampaign}
            className="gap-2 bg-gradient-to-r from-danger to-warning text-white hover:opacity-90"
            size="lg"
          >
            {isRunningCampaign ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running ({campaignProgress}%)
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Run Campaign
              </>
            )}
          </Button>
        </div>

        {isRunningCampaign && (
          <div className="mt-4">
            <Progress value={campaignProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Testing adversarial prompts against deployed systems...
            </p>
          </div>
        )}

        {latestCampaignResult && !isRunningCampaign && (
          <div className="mt-4 p-4 bg-card rounded-lg border border-border">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Campaign Results - Severity Heatmap
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {ATTACK_CATEGORIES.map((cat) => {
                const categoryKey = cat.name.toLowerCase().replace(' ', '_');
                const categoryData = latestCampaignResult?.summary?.categoryBreakdown?.[categoryKey];
                const blocked = categoryData?.blocked ?? 0;
                const failed = categoryData?.failed ?? 0;
                const total = blocked + failed;
                return (
                  <div key={cat.name} className={cn("p-3 rounded-lg", cat.color)}>
                    <p className="text-xs font-medium">{cat.name}</p>
                    <p className="text-lg font-bold">
                      {total > 0 ? `${blocked}/${total}` : 'N/A'}
                    </p>
                    <p className="text-[10px] opacity-80">blocked</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <Badge className="bg-success/10 text-success">
                Coverage: {latestCampaignResult?.summary?.passRate ?? 'N/A'}%
              </Badge>
              <Badge className="bg-danger/10 text-danger">
                Findings: {latestCampaignResult?.summary?.failedTests ?? 0}
              </Badge>
              <Badge variant="outline">Total Tests: {latestCampaignResult?.summary?.totalTests ?? 0}</Badge>
            </div>
          </div>
        )}
      </div>

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
            <EmptyState
              icon={<Lock className="w-8 h-8 text-primary/50" />}
              title="No policy packs yet"
              description="Create your first policy pack to enforce guardrails"
              actionLabel="Create Policy"
              onAction={() => setShowPolicyEditor(true)}
            />
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
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            policy.status === "active"
                              ? "bg-success/10 text-success"
                              : policy.status === "disabled"
                                ? "bg-danger/10 text-danger"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
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
            <EmptyState
              icon={<AlertTriangle className="w-8 h-8 text-warning/50" />}
              title="No red team campaigns yet"
              description="Start a campaign to test model robustness"
              actionLabel="Run Sample Campaign"
              onAction={runSampleCampaign}
            />
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
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1",
                            campaign.status === "running"
                              ? "bg-primary/10 text-primary"
                              : campaign.status === "completed"
                                ? "bg-success/10 text-success"
                                : campaign.status === "paused"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-muted text-muted-foreground",
                          )}
                        >
                          {campaign.status === "running" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          )}
                          {campaign.status}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-bold font-mono",
                          (campaign.coverage || 0) >= 98
                            ? "text-success"
                            : (campaign.coverage || 0) >= 95
                              ? "text-warning"
                              : "text-danger",
                        )}
                      >
                        {campaign.coverage || 0}%
                      </span>
                    </div>
                    <p className="font-medium text-foreground mb-1">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">{getModelName(campaign.model_id)}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">{attackCount} attack types</span>
                      <span
                        className={cn(
                          "font-medium",
                          (campaign.findings_count || 0) > 5
                            ? "text-danger"
                            : (campaign.findings_count || 0) > 0
                              ? "text-warning"
                              : "text-success",
                        )}
                      >
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
      <PolicyDSLEditor open={showPolicyEditor} onOpenChange={setShowPolicyEditor} />

      {/* Red Team Campaign Form Dialog */}
      <RedTeamCampaignForm open={showCampaignForm} onOpenChange={setShowCampaignForm} />

      {/* Educational Section */}
      <Collapsible className="mt-6">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Learn About Policy Packs & Red Team Campaigns
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <PolicyExplainer />
        </CollapsibleContent>
      </Collapsible>
    </MainLayout>
  );
}
