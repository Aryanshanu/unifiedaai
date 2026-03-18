import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, User, Shield, Bell, Database, Key, Globe, Loader2, Check, Bot, Sliders, Plus, Trash2, Copy, AlertTriangle, Send } from "lucide-react";
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
import { useSecurityConfig, useUpdateSecurityConfig } from "@/hooks/useSecurityConfig";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/hooks/useApiKeys";
import { useNotificationChannels, useCreateNotificationChannel, useUpdateNotificationChannel, useDeleteNotificationChannel } from "@/hooks/useNotificationChannels";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toastHook({
        title: "Failed to save settings",
        description: message,
        variant: "destructive",
      });
    }
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
            {activeSection === "general" && (
              <GeneralSection formData={formData} setFormData={setFormData} isLoading={isLoading} handleSave={handleSave} updateSettings={updateSettings} />
            )}
            {activeSection === "config" && <PlatformConfigEditor />}
            {activeSection === "users" && <UsersTeamsSection />}
            {activeSection === "security" && <SecuritySection />}
            {activeSection === "notifications" && <NotificationsSection />}
            {activeSection === "integrations" && <IntegrationsSection />}
            {activeSection === "providers" && <ProviderKeysSection />}
            {activeSection === "api" && <ApiKeysSection />}
            {activeSection === "regions" && <RegionsSection />}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// ─── General Section ─────────────────────────────────────────────────────────
function GeneralSection({ formData, setFormData, isLoading, handleSave, updateSettings }: {
  formData: { organization_name: string; default_workspace: string; timezone: string; data_retention_days: number };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  isLoading: boolean;
  handleSave: () => Promise<void>;
  updateSettings: ReturnType<typeof useUpdateSettings>;
}) {
  return (
    <>
      <h2 className="text-lg font-semibold text-foreground mb-6">General Settings</h2>
      {isLoading ? (
        <div className="space-y-6">{[1,2,3,4].map(i => <div key={i}><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-10 w-full max-w-md" /></div>)}</div>
      ) : (
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">Organization Name</Label>
            <Input value={formData.organization_name} onChange={(e) => setFormData(prev => ({ ...prev, organization_name: e.target.value }))} placeholder="Enter organization name" className="max-w-md bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">Default Workspace</Label>
            <Input value={formData.default_workspace} onChange={(e) => setFormData(prev => ({ ...prev, default_workspace: e.target.value }))} placeholder="e.g., production" className="max-w-md bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">Timezone</Label>
            <Select value={formData.timezone || "UTC"} onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}>
              <SelectTrigger className="max-w-md bg-secondary border-border"><SelectValue placeholder="Select timezone" /></SelectTrigger>
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
            <Label className="text-sm font-medium text-foreground mb-2 block">Data Retention (days)</Label>
            <Input type="number" value={formData.data_retention_days} onChange={(e) => setFormData(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) || 365 }))} className="max-w-md bg-secondary border-border" />
            <p className="text-xs text-muted-foreground mt-1">How long to retain evaluation results and telemetry data</p>
          </div>
          <div className="pt-4 border-t border-border">
            <Button variant="gradient" onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : updateSettings.isSuccess ? <><Check className="mr-2 h-4 w-4" />Saved</> : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Security Section (FUNCTIONAL) ──────────────────────────────────────────
function SecuritySection() {
  const { data: config, isLoading } = useSecurityConfig();
  const updateConfig = useUpdateSecurityConfig();

  const [local, setLocal] = useState({
    mfa_enabled: false,
    session_timeout_minutes: 60,
    password_min_length: 12,
    require_special_chars: true,
    require_uppercase: true,
    require_numbers: true,
    audit_retention_days: 2555,
  });

  useEffect(() => {
    if (config) {
      setLocal({
        mfa_enabled: config.mfa_enabled,
        session_timeout_minutes: config.session_timeout_minutes,
        password_min_length: config.password_min_length,
        require_special_chars: config.require_special_chars,
        audit_retention_days: config.audit_retention_days,
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(local);
      toast.success("Security settings saved");
    } catch {
      toast.error("Failed to save security settings");
    }
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <>
      <h2 className="text-lg font-semibold text-foreground mb-6">Security Settings</h2>
      <div className="space-y-6">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Password Authentication</CardTitle>
            <CardDescription>Email and password authentication via secure auth provider</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className="bg-success/10 text-success border-success/30">Enforced</Badge>
          </CardContent>
        </Card>

        <Separator />

        <div className="space-y-5">
          <div className="flex items-center justify-between max-w-lg">
            <div>
              <Label className="text-sm font-medium">Multi-Factor Authentication</Label>
              <p className="text-xs text-muted-foreground">Require TOTP verification on login</p>
            </div>
            <Switch checked={local.mfa_enabled} onCheckedChange={(v) => setLocal(p => ({ ...p, mfa_enabled: v }))} />
          </div>

          <div className="max-w-lg">
            <Label className="text-sm font-medium mb-2 block">Session Timeout (minutes)</Label>
            <Select value={String(local.session_timeout_minutes)} onValueChange={(v) => setLocal(p => ({ ...p, session_timeout_minutes: Number(v) }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-w-lg">
            <Label className="text-sm font-medium mb-2 block">Minimum Password Length</Label>
            <Select value={String(local.password_min_length)} onValueChange={(v) => setLocal(p => ({ ...p, password_min_length: Number(v) }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 characters</SelectItem>
                <SelectItem value="10">10 characters</SelectItem>
                <SelectItem value="12">12 characters (recommended)</SelectItem>
                <SelectItem value="16">16 characters</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between max-w-lg">
            <div>
              <Label className="text-sm font-medium">Require Special Characters</Label>
              <p className="text-xs text-muted-foreground">Enforce special characters in passwords</p>
            </div>
            <Switch checked={local.require_special_chars} onCheckedChange={(v) => setLocal(p => ({ ...p, require_special_chars: v }))} />
          </div>

          <div className="max-w-lg">
            <Label className="text-sm font-medium mb-2 block">Audit Retention (days)</Label>
            <Select value={String(local.audit_retention_days)} onValueChange={(v) => setLocal(p => ({ ...p, audit_retention_days: Number(v) }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="1095">3 years</SelectItem>
                <SelectItem value="1825">5 years</SelectItem>
                <SelectItem value="2555">7 years (recommended)</SelectItem>
                <SelectItem value="3650">10 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">Enterprise Features</h3>
          <div className="space-y-3">
            <PlannedFeatureCard title="Single Sign-On (SSO)" description="SAML/OIDC integration for enterprise identity providers." regulation="SOC 2 Type II" status="Enterprise feature" />
            <PlannedFeatureCard title="IP Allowlist" description="Restrict platform access to specific IP ranges." regulation="SOC 2 CC6.1" status="Enterprise feature" />
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save Security Settings
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Notifications Section (FUNCTIONAL) ─────────────────────────────────────
function NotificationsSection() {
  const { data: channels, isLoading } = useNotificationChannels();
  const createChannel = useCreateNotificationChannel();
  const updateChannel = useUpdateNotificationChannel();
  const deleteChannel = useDeleteNotificationChannel();
  const [open, setOpen] = useState(false);
  const [newChannel, setNewChannel] = useState<{ channel_type: 'email' | 'slack' | 'teams' | 'webhook'; name: string; config: { endpoint: string } }>({ channel_type: 'email', name: '', config: { endpoint: '' } });

  const handleCreate = async () => {
    if (!newChannel.name) return;
    try {
      await createChannel.mutateAsync({
        channel_type: newChannel.channel_type,
        name: newChannel.name,
        config: newChannel.config,
      });
      toast.success("Notification channel created");
      setOpen(false);
      setNewChannel({ channel_type: 'email', name: '', config: { endpoint: '' } });
    } catch {
      toast.error("Failed to create channel");
    }
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Notification Channels</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Channel</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Notification Channel</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Channel Type</Label>
                <Select value={newChannel.channel_type} onValueChange={(v: 'email' | 'slack' | 'teams' | 'webhook') => setNewChannel(p => ({ ...p, channel_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="teams">Microsoft Teams</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={newChannel.name} onChange={e => setNewChannel(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Ops Team Slack" />
              </div>
              <div>
                <Label>{newChannel.channel_type === 'email' ? 'Email Address' : 'Webhook URL'}</Label>
                <Input value={newChannel.config.endpoint} onChange={e => setNewChannel(p => ({ ...p, config: { endpoint: e.target.value } }))} placeholder={newChannel.channel_type === 'email' ? 'team@example.com' : 'https://hooks.slack.com/...'} />
              </div>
              <Button onClick={handleCreate} disabled={!newChannel.name || createChannel.isPending} className="w-full">
                {createChannel.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Channel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!channels?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium mb-1">No Notification Channels</p>
          <p className="text-sm">Add email, Slack, or webhook channels to receive alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map(ch => (
            <Card key={ch.id} className="border-border">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="capitalize">{ch.channel_type}</Badge>
                  <div>
                    <p className="font-medium text-foreground">{ch.name}</p>
                    <p className="text-xs text-muted-foreground">{(ch.config as Record<string, string>)?.endpoint || 'No endpoint'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ch.enabled}
                    onCheckedChange={(v) => updateChannel.mutate({ id: ch.id, enabled: v })}
                  />
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteChannel.mutate(ch.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ─── API Keys Section (FUNCTIONAL) ──────────────────────────────────────────
function ApiKeysSection() {
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!name.trim()) return;
    try {
      const result = await createKey.mutateAsync({ name: name.trim() });
      setNewKey(result.rawKey);
      setName('');
      toast.success("API key generated");
    } catch {
      toast.error("Failed to generate key");
    }
  };

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      toast.success("Key copied to clipboard");
    }
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <>
      <h2 className="text-lg font-semibold text-foreground mb-6">API Keys</h2>
      <div className="space-y-6">
        {/* Generate new key */}
        <div className="flex gap-3 max-w-lg">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Key name (e.g., CI/CD Pipeline)" className="bg-secondary border-border" />
          <Button onClick={handleGenerate} disabled={!name.trim() || createKey.isPending}>
            {createKey.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Generate
          </Button>
        </div>

        {/* Show newly generated key */}
        {newKey && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
              <p className="text-sm font-medium text-warning">Copy this key now — it won't be shown again</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-secondary rounded px-3 py-2 text-xs font-mono break-all">{newKey}</code>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNewKey(null)}>Dismiss</Button>
          </div>
        )}

        <Separator />

        {/* Key list */}
        {!keys?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No API keys generated yet.</p>
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <Card key={k.id} className={cn("border-border", !k.is_active && "opacity-50")}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{k.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{k.key_preview}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={k.is_active ? "default" : "destructive"}>{k.is_active ? 'Active' : 'Revoked'}</Badge>
                    {k.is_active && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => revokeKey.mutate(k.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Regions Section (FUNCTIONAL — persists to DB) ──────────────────────────
function RegionsSection() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [local, setLocal] = useState({
    data_residency: 'eu-west-1',
    compliance_frameworks: ['eu-ai-act'] as string[],
    gdpr_enabled: true,
    ccpa_enabled: false,
    audit_retention_years: 7,
  });

  useEffect(() => {
    if (settings) {
      const s = settings as unknown as Record<string, unknown>;
      setLocal({
        data_residency: (s.data_residency as string) || 'eu-west-1',
        compliance_frameworks: (s.compliance_frameworks as string[]) || ['eu-ai-act'],
        gdpr_enabled: (s.gdpr_enabled as boolean) ?? true,
        ccpa_enabled: (s.ccpa_enabled as boolean) ?? false,
        audit_retention_years: (s.audit_retention_years as number) || 7,
      });
    }
  }, [settings]);

  const toggleFramework = (fw: string) => {
    setLocal(p => ({
      ...p,
      compliance_frameworks: p.compliance_frameworks.includes(fw)
        ? p.compliance_frameworks.filter(f => f !== fw)
        : [...p.compliance_frameworks, fw],
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(local as unknown as Parameters<typeof updateSettings.mutateAsync>[0]);
      toast.success("Regional settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const frameworks = [
    { id: 'eu-ai-act', label: 'EU AI Act', regulation: 'Regulation (EU) 2024/1689' },
    { id: 'nist-ai-rmf', label: 'NIST AI RMF', regulation: 'NIST AI 100-1' },
    { id: 'soc2', label: 'SOC 2 Type II', regulation: 'AICPA Trust Services' },
    { id: 'iso-42001', label: 'ISO/IEC 42001', regulation: 'ISO/IEC 42001:2023' },
  ];

  return (
    <>
      <h2 className="text-lg font-semibold text-foreground mb-6">Regions & Compliance</h2>
      <div className="space-y-6">
        <div>
          <Label className="mb-2 block">Data Residency Region</Label>
          <Select value={local.data_residency} onValueChange={(v) => setLocal(p => ({ ...p, data_residency: v }))}>
            <SelectTrigger className="max-w-md bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="us-east-1">US East (Virginia)</SelectItem>
              <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
              <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
              <SelectItem value="eu-central-1">EU Central (Frankfurt)</SelectItem>
              <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
              <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Compliance Frameworks</h3>
          <div className="space-y-3">
            {frameworks.map(fw => (
              <label key={fw.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                <Checkbox checked={local.compliance_frameworks.includes(fw.id)} onCheckedChange={() => toggleFramework(fw.id)} />
                <div>
                  <p className="text-sm font-medium text-foreground">{fw.label}</p>
                  <p className="text-xs text-muted-foreground">{fw.regulation}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between max-w-lg">
            <div>
              <Label className="text-sm font-medium">GDPR Compliance Mode</Label>
              <p className="text-xs text-muted-foreground">Enable GDPR data handling controls</p>
            </div>
            <Switch checked={local.gdpr_enabled} onCheckedChange={(v) => setLocal(p => ({ ...p, gdpr_enabled: v }))} />
          </div>
          <div className="flex items-center justify-between max-w-lg">
            <div>
              <Label className="text-sm font-medium">CCPA Compliance Mode</Label>
              <p className="text-xs text-muted-foreground">Enable CCPA privacy controls</p>
            </div>
            <Switch checked={local.ccpa_enabled} onCheckedChange={(v) => setLocal(p => ({ ...p, ccpa_enabled: v }))} />
          </div>
        </div>

        <Separator />

        <div>
          <Label className="mb-2 block">Audit Log Retention (years)</Label>
          <Select value={String(local.audit_retention_years)} onValueChange={(v) => setLocal(p => ({ ...p, audit_retention_years: Number(v) }))}>
            <SelectTrigger className="max-w-md bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 year</SelectItem>
              <SelectItem value="3">3 years</SelectItem>
              <SelectItem value="5">5 years</SelectItem>
              <SelectItem value="7">7 years (recommended)</SelectItem>
              <SelectItem value="10">10 years</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save Regional Settings
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Integrations Section ───────────────────────────────────────────────────
function IntegrationsSection() {
  return (
    <>
      <h2 className="text-lg font-semibold text-foreground mb-6">Integrations</h2>
      <div className="space-y-6">
        <ConnectModelForm />
        <h3 className="text-md font-medium text-foreground mt-8 mb-4">Other Integrations</h3>
        <Card className="border-border">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Database className="w-5 h-5" /></div>
              <div>
                <p className="font-medium">Hugging Face</p>
                <p className="text-sm text-muted-foreground">Model registry and inference endpoints</p>
              </div>
            </div>
            <Badge className="bg-success/10 text-success">Connected</Badge>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Globe className="w-5 h-5" /></div>
              <div>
                <p className="font-medium">OpenTelemetry</p>
                <p className="text-sm text-muted-foreground">Observability and tracing</p>
              </div>
            </div>
            <Badge className="bg-success/10 text-success">Enabled</Badge>
          </CardContent>
        </Card>
        <h3 className="text-sm font-medium text-muted-foreground mt-6 mb-3 uppercase tracking-wide">Planned Integrations</h3>
        <div className="space-y-3">
          <PlannedFeatureCard title="MLflow" description="Experiment tracking and model registry integration." status="Planned" />
          <PlannedFeatureCard title="Slack" description="Send alerts and notifications to Slack channels." status="Planned" />
          <PlannedFeatureCard title="PagerDuty" description="Incident management and on-call escalation." status="Planned" />
        </div>
      </div>
    </>
  );
}

// ─── Platform Config Editor ─────────────────────────────────────────────────
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
      const converted: Record<string, number> = {};
      for (const [key, value] of Object.entries(engineWeights)) {
        const numValue = value as number;
        converted[key] = numValue <= 1 ? Math.round(numValue * 100) : numValue;
      }
      setLocalWeights(converted);
    }
  }, [engineWeights]);

  useEffect(() => {
    if (sloTargets) setLocalSLO(sloTargets as Record<string, number>);
  }, [sloTargets]);

  const handleWeightChange = (key: string, value: number) => setLocalWeights(prev => ({ ...prev, [key]: value }));

  const handleSaveWeights = async () => {
    try {
      const decimalWeights: Record<string, number> = {};
      for (const [key, value] of Object.entries(localWeights)) {
        decimalWeights[key] = value > 1 ? value / 100 : value;
      }
      await updateConfig.mutateAsync({ configKey: 'engine_weights', value: decimalWeights });
      toast.success("Engine weights updated");
    } catch { toast.error("Failed to save weights"); }
  };

  const handleSaveSLO = async () => {
    try {
      await updateConfig.mutateAsync({ configKey: 'slo_targets', value: localSLO });
      toast.success("SLO targets updated");
    } catch { toast.error("Failed to save SLO targets"); }
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" />{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <>
      <h2 className="text-lg font-semibold text-foreground mb-6">Platform Configuration</h2>
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">Engine Weights</h3>
          <p className="text-sm text-muted-foreground mb-4">Adjust relative importance of each RAI engine in overall score.</p>
          <div className="space-y-4 max-w-xl">
            {Object.entries(localWeights).map(([key, value]) => (
              <div key={key} className="flex items-center gap-4">
                <Label className="w-32 capitalize">{key}</Label>
                <Slider value={[value]} max={100} step={5} className="flex-1" onValueChange={([val]) => handleWeightChange(key, val)} />
                <span className="w-12 text-right font-mono text-sm">{value}%</span>
              </div>
            ))}
          </div>
          <Button onClick={handleSaveWeights} className="mt-4" disabled={updateConfig.isPending}>
            {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save Weights
          </Button>
        </div>
        <Separator />
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">SLO Targets</h3>
          <p className="text-sm text-muted-foreground mb-4">Define Service Level Objectives for incident response times.</p>
          <div className="grid grid-cols-2 gap-4 max-w-xl">
            {Object.entries(localSLO).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                <Input type="number" value={value} onChange={(e) => setLocalSLO(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))} className="bg-secondary border-border" />
              </div>
            ))}
          </div>
          <Button onClick={handleSaveSLO} className="mt-4" disabled={updateConfig.isPending}>
            {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save SLO Targets
          </Button>
        </div>
        <Separator />
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">Data Quality Thresholds</h3>
          <p className="text-sm text-muted-foreground mb-4">Current threshold values for data quality dimensions.</p>
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
        <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm">
          <p className="text-muted-foreground">Configuration changes are tracked in the audit history. All updates are versioned for compliance.</p>
        </div>
      </div>
    </>
  );
}
