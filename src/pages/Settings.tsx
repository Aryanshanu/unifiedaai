import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, User, Shield, Bell, Database, Key, Globe, Loader2, Check, Bot, Sliders } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { usePlatformConfig, useUpdateConfig, useEngineWeights, useSLOTargets, useDQThresholds } from "@/hooks/usePlatformConfig";
import { cn } from "@/lib/utils";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersTeamsSection } from "@/components/settings/UsersTeamsSection";
import { ConnectModelForm } from "@/components/settings/ConnectModelForm";
import { ProviderKeysSection } from "@/components/settings/ProviderKeysSection";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PlannedFeatureCard } from "@/components/fractal";

const settingsSections = [
  { id: "general", icon: SettingsIcon, label: "General", description: "Basic configuration and preferences" },
  { id: "config", icon: Sliders, label: "Platform Config", description: "Engine weights and thresholds" },
  { id: "users", icon: User, label: "Users & Teams", description: "Manage access and permissions" },
  { id: "security", icon: Shield, label: "Security", description: "Authentication and encryption settings" },
  { id: "notifications", icon: Bell, label: "Notifications", description: "Alert channels and preferences" },
  { id: "integrations", icon: Database, label: "Integrations", description: "Model registries and data sources" },
  { id: "providers", icon: Bot, label: "LLM Providers", description: "Configure AI provider API keys" },
  { id: "api", icon: Key, label: "API Keys", description: "Manage API access tokens" },
  { id: "regions", icon: Globe, label: "Regions & Compliance", description: "Jurisdictional settings" },
];

export default function Settings() {
  const { toast: toastHook } = useToast();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [activeSection, setActiveSection] = useState("general");
  
  const [formData, setFormData] = useState({
    organization_name: "",
    default_workspace: "",
    timezone: "",
    data_retention_days: 365,
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    mfaEnabled: false,
    sessionTimeout: 60,
    passwordMinLength: 12,
    requireSpecialChars: true,
    ssoEnabled: false,
    ipWhitelist: "",
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    slackWebhookUrl: "",
    emailAlerts: true,
    criticalAlertsOnly: false,
    dailyDigest: true,
    incidentNotifications: true,
    reviewReminders: true,
  });

  // Integration settings state
  const [integrations, setIntegrations] = useState({
    huggingFaceConnected: true,
    mlflowEnabled: false,
    openTelemetryEnabled: true,
    slackConnected: false,
    pagerDutyConnected: false,
  });

  // Compliance settings
  const [complianceSettings, setComplianceSettings] = useState({
    dataResidency: "eu-west-1",
    frameworks: ["eu-ai-act", "nist-ai-rmf"],
    gdprEnabled: true,
    ccpaEnabled: false,
    auditRetentionYears: 7,
  });

  // Initialize form with loaded settings
  useEffect(() => {
    if (settings) {
      setFormData({
        organization_name: settings.organization_name || "",
        default_workspace: settings.default_workspace || "",
        timezone: settings.timezone || "",
        data_retention_days: settings.data_retention_days || 365,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      toastHook({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });
    } catch (error: any) {
      toastHook({
        title: "Failed to save settings",
        description: error.message || "An error occurred while saving settings.",
        variant: "destructive",
      });
    }
  };

  const handleSecuritySave = () => {
    toast.success("Security settings updated", {
      description: "Your security preferences have been saved.",
    });
  };

  const handleNotificationSave = () => {
    toast.success("Notification settings updated", {
      description: "Your notification preferences have been saved.",
    });
  };

  const handleGenerateApiKey = () => {
    toast.success("API key generated", {
      description: "Your new API key has been created. Copy it now - it won't be shown again.",
    });
  };

  return (
    <MainLayout 
      title="Settings" 
      subtitle="System configuration and preferences"
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                  activeSection === section.id
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <section.icon className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{section.label}</p>
                  <p className="text-xs opacity-70">{section.description}</p>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl p-6">
            {/* General Section */}
            {activeSection === "general" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">General Settings</h2>

                {isLoading ? (
                  <div className="space-y-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i}>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-10 w-full max-w-md" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">
                        Organization Name
                      </Label>
                      <Input
                        value={formData.organization_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, organization_name: e.target.value }))}
                        placeholder="Enter organization name"
                        className="max-w-md bg-secondary border-border"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">
                        Default Workspace
                      </Label>
                      <Input
                        value={formData.default_workspace}
                        onChange={(e) => setFormData(prev => ({ ...prev, default_workspace: e.target.value }))}
                        placeholder="e.g., production"
                        className="max-w-md bg-secondary border-border"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">
                        Timezone
                      </Label>
                      <Select 
                        value={formData.timezone || "UTC"} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                      >
                        <SelectTrigger className="max-w-md bg-secondary border-border">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time (US)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (US)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                          <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">
                        Data Retention (days)
                      </Label>
                      <Input
                        type="number"
                        value={formData.data_retention_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) || 365 }))}
                        className="max-w-md bg-secondary border-border"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        How long to retain evaluation results and telemetry data
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Button 
                        variant="gradient" 
                        onClick={handleSave}
                        disabled={updateSettings.isPending}
                      >
                        {updateSettings.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : updateSettings.isSuccess ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Saved
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Platform Config Section */}
            {activeSection === "config" && <PlatformConfigEditor />}

            {/* Users & Teams Section */}
            {activeSection === "users" && <UsersTeamsSection />}

            {/* Security Section */}
            {activeSection === "security" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">Security Settings</h2>
                <div className="space-y-6">
                  {/* Active Security Controls - Only real, enforced features */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                      Active Controls
                    </h3>
                    <Card className="border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Password Authentication</CardTitle>
                        <CardDescription>Email and password authentication via Supabase Auth</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge className="bg-success/10 text-success border-success/30">
                          Enforced
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Planned Security Controls - Honest roadmap items */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Planned Security Controls
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      These controls are on the roadmap and will be enforced once implemented.
                    </p>

                    <div className="space-y-3">
                      <PlannedFeatureCard
                        title="Multi-Factor Authentication"
                        description="Add TOTP/SMS verification to all login flows for enhanced account security."
                        regulation="NIST 800-53 IA-2"
                        status="Backend pending"
                      />

                      <PlannedFeatureCard
                        title="Single Sign-On (SSO)"
                        description="SAML/OIDC integration for enterprise identity providers like Okta, Azure AD."
                        regulation="SOC 2 Type II"
                        status="Enterprise feature"
                      />

                      <PlannedFeatureCard
                        title="Session Timeout Controls"
                        description="Configurable automatic session expiration for inactive users."
                        regulation="NIST 800-53 AC-12"
                        status="Planned"
                      />

                      <PlannedFeatureCard
                        title="Password Policy Enforcement"
                        description="Minimum length, complexity requirements, and rotation policies."
                        regulation="NIST 800-63B"
                        status="Planned"
                      />

                      <PlannedFeatureCard
                        title="IP Allowlist"
                        description="Restrict platform access to specific IP ranges or VPN networks."
                        regulation="SOC 2 CC6.1"
                        status="Enterprise feature"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">Notification Settings</h2>
                <div className="space-y-6">
                  {/* Honest status message */}
                  <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm">
                    <p className="text-muted-foreground">
                      Notification delivery is not yet implemented. The controls below show planned features that will be available once backend email/webhook delivery is complete.
                    </p>
                  </div>

                  <Separator />

                  {/* Planned Notification Controls */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                      Planned Notification Features
                    </h3>
                    <div className="space-y-3">
                      <PlannedFeatureCard
                        title="Email Alerts"
                        description="Receive alerts via email when evaluation scores drop or incidents occur."
                        regulation="EU AI Act Article 9"
                        status="Backend pending"
                      />

                      <PlannedFeatureCard
                        title="Critical Alerts Priority"
                        description="Filter to only receive critical severity alerts to reduce noise."
                        status="Backend pending"
                      />

                      <PlannedFeatureCard
                        title="Daily Digest"
                        description="Receive a daily summary of platform activity, evaluation results, and compliance status."
                        status="Backend pending"
                      />

                      <PlannedFeatureCard
                        title="Incident Notifications"
                        description="Get notified immediately when new incidents are created or escalated."
                        regulation="NIST AI RMF GV-4"
                        status="Backend pending"
                      />

                      <PlannedFeatureCard
                        title="HITL Review Reminders"
                        description="Automated reminders for pending human-in-the-loop reviews approaching SLA deadlines."
                        regulation="EU AI Act Article 14"
                        status="Backend pending"
                      />

                      <PlannedFeatureCard
                        title="Slack Integration"
                        description="Send notifications to Slack channels for team-wide visibility."
                        status="Integration pending"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Integrations Section */}
            {activeSection === "integrations" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">Integrations</h2>
                <div className="space-y-6">
                  {/* Connect Your Model - PRIMARY */}
                  <ConnectModelForm />

                  {/* Other Integrations */}
                  <h3 className="text-md font-medium text-foreground mt-8 mb-4">Other Integrations</h3>
                  
                  <Card className="border-border">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">Hugging Face</p>
                          <p className="text-sm text-muted-foreground">Model registry and inference endpoints</p>
                        </div>
                      </div>
                      <Badge variant={integrations.huggingFaceConnected ? "default" : "outline"} className="bg-success/10 text-success">
                        Connected
                      </Badge>
                    </CardContent>
                  </Card>

                  <h3 className="text-sm font-medium text-muted-foreground mt-6 mb-3 uppercase tracking-wide">
                    Planned Integrations
                  </h3>
                  <div className="space-y-3">
                    <PlannedFeatureCard
                      title="MLflow"
                      description="Experiment tracking and model registry integration for ML lifecycle management."
                      status="Planned"
                    />

                    <PlannedFeatureCard
                      title="Slack"
                      description="Send alerts and notifications to Slack channels for team collaboration."
                      status="Planned"
                    />

                    <PlannedFeatureCard
                      title="PagerDuty"
                      description="Incident management and on-call escalation for critical AI failures."
                      status="Planned"
                    />
                  </div>

                  <Card className="border-border">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">OpenTelemetry</p>
                          <p className="text-sm text-muted-foreground">Observability and tracing</p>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-success/10 text-success">
                        Enabled
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* LLM Provider Keys Section */}
            {activeSection === "providers" && (
              <ProviderKeysSection />
            )}

            {/* API Keys Section */}
            {activeSection === "api" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">API Keys</h2>
                <div className="space-y-4">
                  <PlannedFeatureCard
                    title="API Key Management"
                    description="Generate and manage API keys for programmatic access to the platform API. Includes key rotation, scope permissions, and audit logging."
                    regulation="SOC 2 CC6.1"
                    status="Backend pending"
                  />
                </div>
              </>
            )}

            {/* Regions & Compliance Section */}
            {activeSection === "regions" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">Regions & Compliance</h2>
                <div className="space-y-6">
                  <div>
                    <Label className="mb-2 block">Data Residency Region</Label>
                    <Select 
                      value={complianceSettings.dataResidency}
                      onValueChange={(v) => setComplianceSettings(prev => ({ ...prev, dataResidency: v }))}
                    >
                      <SelectTrigger className="max-w-md bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east-1">US East (Virginia)</SelectItem>
                        <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                        <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
                        <SelectItem value="eu-central-1">EU Central (Frankfurt)</SelectItem>
                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                        <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      All data will be stored and processed in this region
                    </p>
                  </div>

                  <Separator />

                  {/* Active Compliance Framework */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                      Active Framework
                    </h3>
                    <Card className="border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">EU AI Act</Badge>
                          <CardTitle className="text-base">High-Risk AI Compliance</CardTitle>
                        </div>
                        <CardDescription>Core evaluation engines enforce EU AI Act requirements</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge className="bg-success/10 text-success border-success/30">
                          Enforced via Engines
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Planned Compliance Features */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                      Planned Compliance Controls
                    </h3>
                    <div className="space-y-3">
                      <PlannedFeatureCard
                        title="NIST AI RMF Mapping"
                        description="Automated mapping of evaluation results to NIST AI Risk Management Framework controls."
                        regulation="NIST AI RMF 1.0"
                        status="Planned"
                      />

                      <PlannedFeatureCard
                        title="ISO/IEC 42001 Certification"
                        description="AI Management Systems certification readiness assessment and evidence collection."
                        regulation="ISO/IEC 42001:2023"
                        status="Enterprise feature"
                      />

                      <PlannedFeatureCard
                        title="GDPR Compliance Mode"
                        description="Automated data subject rights handling and consent management for AI processing."
                        regulation="GDPR Articles 13-22"
                        status="Planned"
                      />

                      <PlannedFeatureCard
                        title="CCPA Compliance Mode"
                        description="California Consumer Privacy Act controls including opt-out and deletion requests."
                        regulation="CCPA §1798.100-199"
                        status="Planned"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Audit Log Retention (years)</Label>
                    <Select 
                      value={String(complianceSettings.auditRetentionYears)}
                      onValueChange={(v) => setComplianceSettings(prev => ({ ...prev, auditRetentionYears: Number(v) }))}
                    >
                      <SelectTrigger className="max-w-md bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 year</SelectItem>
                        <SelectItem value="3">3 years</SelectItem>
                        <SelectItem value="5">5 years</SelectItem>
                        <SelectItem value="7">7 years (recommended)</SelectItem>
                        <SelectItem value="10">10 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm">
                    <p className="text-muted-foreground">
                      Data Residency and Audit Log Retention are configuration preferences. Actual enforcement requires infrastructure changes that are tracked separately.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// Platform Config Editor Component
function PlatformConfigEditor() {
  const { data: configs, isLoading } = usePlatformConfig();
  const { data: engineWeights } = useEngineWeights();
  const { data: sloTargets } = useSLOTargets();
  const { data: dqThresholds } = useDQThresholds();
  const updateConfig = useUpdateConfig();

  const [localWeights, setLocalWeights] = useState<Record<string, number>>({});
  const [localSLO, setLocalSLO] = useState<Record<string, number>>({});

  useEffect(() => {
    if (engineWeights) {
      // Convert decimal weights (0.25) to percentages (25) for slider display
      const convertedWeights: Record<string, number> = {};
      for (const [key, value] of Object.entries(engineWeights)) {
        const numValue = value as number;
        // If value is <= 1, assume it's a decimal that needs conversion
        convertedWeights[key] = numValue <= 1 ? Math.round(numValue * 100) : numValue;
      }
      setLocalWeights(convertedWeights);
    }
  }, [engineWeights]);

  useEffect(() => {
    if (sloTargets) {
      setLocalSLO(sloTargets as Record<string, number>);
    }
  }, [sloTargets]);

  const handleWeightChange = (key: string, value: number) => {
    setLocalWeights(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveWeights = async () => {
    try {
      // Convert percentages back to decimals for storage (25 -> 0.25)
      const decimalWeights: Record<string, number> = {};
      for (const [key, value] of Object.entries(localWeights)) {
        decimalWeights[key] = value > 1 ? value / 100 : value;
      }
      await updateConfig.mutateAsync({ configKey: 'engine_weights', value: decimalWeights });
      toast.success("Engine weights updated");
    } catch {
      toast.error("Failed to save weights");
    }
  };

  const handleSaveSLO = async () => {
    try {
      await updateConfig.mutateAsync({ configKey: 'slo_targets', value: localSLO });
      toast.success("SLO targets updated");
    } catch {
      toast.error("Failed to save SLO targets");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-lg font-semibold text-foreground mb-6">Platform Configuration</h2>
      <div className="space-y-8">
        {/* Engine Weights Section */}
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">Engine Weights</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Adjust the relative importance of each RAI engine in the overall score calculation.
          </p>
          <div className="space-y-4 max-w-xl">
            {Object.entries(localWeights).map(([key, value]) => (
              <div key={key} className="flex items-center gap-4">
                <Label className="w-32 capitalize">{key}</Label>
                <Slider 
                  value={[value]}
                  max={100}
                  step={5}
                  className="flex-1"
                  onValueChange={([val]) => handleWeightChange(key, val)}
                />
                <span className="w-12 text-right font-mono text-sm">{value}%</span>
              </div>
            ))}
          </div>
          <Button 
            onClick={handleSaveWeights} 
            className="mt-4"
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save Weights
          </Button>
        </div>

        <Separator />

        {/* SLO Targets Section */}
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">SLO Targets</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Define Service Level Objectives for incident response times.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-xl">
            {Object.entries(localSLO).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                <Input 
                  type="number"
                  value={value}
                  onChange={(e) => setLocalSLO(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                  className="bg-secondary border-border"
                />
              </div>
            ))}
          </div>
          <Button 
            onClick={handleSaveSLO} 
            className="mt-4"
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save SLO Targets
          </Button>
        </div>

        <Separator />

        {/* DQ Thresholds Display */}
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">Data Quality Thresholds</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Current threshold values for data quality dimensions.
          </p>
          {dqThresholds ? (
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              {Object.entries(dqThresholds).map(([key, value]) => (
                <div key={key} className="bg-secondary/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{value as number}%</div>
                  <div className="text-xs text-muted-foreground capitalize">{key}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No thresholds configured</p>
          )}
        </div>

        {/* Config Info */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm">
          <p className="text-muted-foreground">
            Configuration changes are tracked in the audit history. All updates are versioned for compliance.
          </p>
        </div>
      </div>
    </>
  );
}
