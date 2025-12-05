import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, User, Shield, Bell, Database, Key, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <MainLayout title="Settings" subtitle="System configuration and preferences">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {settingsSections.map((section, index) => (
              <button
                key={section.id}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                  index === 0
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
            <h2 className="text-lg font-semibold text-foreground mb-6">General Settings</h2>

            <div className="space-y-6">
              {/* Organization */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Organization Name
                </label>
                <Input
                  defaultValue="Acme Corp"
                  className="max-w-md bg-secondary border-border"
                />
              </div>

              {/* Workspace */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Default Workspace
                </label>
                <Input
                  defaultValue="production"
                  className="max-w-md bg-secondary border-border"
                />
              </div>

              {/* Timezone */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Timezone
                </label>
                <Input
                  defaultValue="UTC-5 (Eastern)"
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
                  defaultValue="365"
                  className="max-w-md bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How long to retain evaluation results and telemetry data
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <Button variant="gradient">Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
