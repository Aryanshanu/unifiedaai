import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, User, Shield, Bell, Database, Key, Globe, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersTeamsSection } from "@/components/settings/UsersTeamsSection";

const settingsSections = [
  { id: "general", icon: SettingsIcon, label: "General", description: "Basic configuration and preferences" },
  { id: "users", icon: User, label: "Users & Teams", description: "Manage access and permissions" },
  { id: "security", icon: Shield, label: "Security", description: "Authentication and encryption settings" },
  { id: "notifications", icon: Bell, label: "Notifications", description: "Alert channels and preferences" },
  { id: "integrations", icon: Database, label: "Integrations", description: "Model registries and data sources" },
  { id: "api", icon: Key, label: "API Keys", description: "Manage API access tokens" },
  { id: "regions", icon: Globe, label: "Regions & Compliance", description: "Jurisdictional settings" },
];

export default function Settings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [activeSection, setActiveSection] = useState("general");
  
  const [formData, setFormData] = useState({
    organization_name: "",
    default_workspace: "",
    timezone: "",
    data_retention_days: 365,
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
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save settings",
        description: error.message || "An error occurred while saving settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout title="Settings" subtitle="System configuration and preferences">
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
                    {/* Organization */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Organization Name
                      </label>
                      <Input
                        value={formData.organization_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, organization_name: e.target.value }))}
                        placeholder="Enter organization name"
                        className="max-w-md bg-secondary border-border"
                      />
                    </div>

                    {/* Workspace */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Default Workspace
                      </label>
                      <Input
                        value={formData.default_workspace}
                        onChange={(e) => setFormData(prev => ({ ...prev, default_workspace: e.target.value }))}
                        placeholder="e.g., production"
                        className="max-w-md bg-secondary border-border"
                      />
                    </div>

                    {/* Timezone */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Timezone
                      </label>
                      <Input
                        value={formData.timezone}
                        onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                        placeholder="e.g., UTC, America/New_York"
                        className="max-w-md bg-secondary border-border"
                      />
                    </div>

                    {/* Data Retention */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Data Retention (days)
                      </label>
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

            {activeSection === "users" && (
              <>
                <UsersTeamsSection />
              </>
            )}

            {activeSection === "security" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">Security</h2>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Security settings coming soon</p>
                </div>
              </>
            )}

            {activeSection === "notifications" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">Notifications</h2>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Notification settings coming soon</p>
                </div>
              </>
            )}

            {activeSection === "integrations" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">Integrations</h2>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Database className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Integration settings coming soon</p>
                </div>
              </>
            )}

            {activeSection === "api" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">API Keys</h2>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Key className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">API key management coming soon</p>
                </div>
              </>
            )}

            {activeSection === "regions" && (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-6">Regions & Compliance</h2>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Regional settings coming soon</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
