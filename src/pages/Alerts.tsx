import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Settings, 
  Plus,
  Mail,
  Slack,
  MessageSquare,
  Filter,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDriftAlerts } from "@/hooks/useDriftAlerts";
import { useIncidents } from "@/hooks/useIncidents";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const severityColors = {
  critical: "bg-danger/10 text-danger border-danger/30",
  high: "bg-warning/10 text-warning border-warning/30",
  medium: "bg-primary/10 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

const channelIcons = {
  email: Mail,
  slack: Slack,
  teams: MessageSquare,
};

interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'teams';
  name: string;
  enabled: boolean;
  config: Record<string, string>;
}

export default function Alerts() {
  const { data: driftAlerts, isLoading: driftLoading } = useDriftAlerts();
  const { data: incidents, isLoading: incidentsLoading } = useIncidents();
  const [activeTab, setActiveTab] = useState<'alerts' | 'channels' | 'rules'>('alerts');
  const [channels, setChannels] = useState<NotificationChannel[]>([
    { id: '1', type: 'email', name: 'Admin Emails', enabled: true, config: { email: 'admin@company.com' } },
    { id: '2', type: 'slack', name: 'AI Ops Channel', enabled: true, config: { webhook: 'https://hooks.slack.com/...' } },
  ]);

  const allAlerts = [
    ...(driftAlerts || []).map(a => ({
      id: a.id,
      type: 'drift',
      title: `Drift detected: ${a.feature}`,
      severity: a.severity,
      status: a.status,
      created_at: a.detected_at,
      details: `${a.drift_type} drift of ${(a.drift_value * 100).toFixed(1)}%`,
    })),
    ...(incidents || []).map(i => ({
      id: i.id,
      type: 'incident',
      title: i.title,
      severity: i.severity,
      status: i.status,
      created_at: i.created_at,
      details: i.description || '',
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const toggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch
    ));
    toast.success("Channel updated");
  };

  const isLoading = driftLoading || incidentsLoading;

  return (
    <MainLayout 
      title="Alerts & Notifications" 
      subtitle="Real-time alerts, drift notifications, and notification channel management"
    >
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
        {[
          { id: 'alerts', label: 'Active Alerts', icon: Bell },
          { id: 'channels', label: 'Notification Channels', icon: Settings },
          { id: 'rules', label: 'Alert Rules', icon: Filter },
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className="gap-2"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Search alerts..." 
                className="w-64 bg-secondary border-border"
              />
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
            <Badge variant="outline" className="gap-1">
              <Bell className="w-3 h-3" />
              {allAlerts.filter(a => a.status === 'open').length} active
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : allAlerts.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
              <p className="text-foreground font-medium">All clear!</p>
              <p className="text-sm text-muted-foreground mt-1">No active alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      alert.severity === 'critical' ? "bg-danger/10" : 
                      alert.severity === 'high' ? "bg-warning/10" : "bg-primary/10"
                    )}>
                      <AlertTriangle className={cn(
                        "w-5 h-5",
                        alert.severity === 'critical' ? "text-danger" :
                        alert.severity === 'high' ? "text-warning" : "text-primary"
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {alert.type}
                        </Badge>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                          severityColors[alert.severity as keyof typeof severityColors]
                        )}>
                          {alert.severity}
                        </span>
                        <span className={cn(
                          "text-xs",
                          alert.status === 'open' ? "text-warning" : 
                          alert.status === 'resolved' ? "text-success" : "text-muted-foreground"
                        )}>
                          {alert.status}
                        </span>
                      </div>
                      <p className="font-medium text-foreground">{alert.title}</p>
                      {alert.details && (
                        <p className="text-sm text-muted-foreground mt-1">{alert.details}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Acknowledge</Button>
                      <Button variant="ghost" size="sm">Resolve</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Notification Channels</h2>
            <Button variant="gradient" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Channel
            </Button>
          </div>

          <div className="grid gap-4">
            {channels.map(channel => {
              const Icon = channelIcons[channel.type];
              return (
                <div
                  key={channel.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{channel.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{channel.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={channel.enabled ? "default" : "secondary"}>
                      {channel.enabled ? "Active" : "Disabled"}
                    </Badge>
                    <Switch 
                      checked={channel.enabled} 
                      onCheckedChange={() => toggleChannel(channel.id)}
                    />
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Alert Rules</h2>
            <Button variant="gradient" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Rule
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="space-y-4">
              {[
                { name: 'Critical Drift Alert', condition: 'drift_value > 0.15', channels: ['email', 'slack'], enabled: true },
                { name: 'High Severity Incident', condition: 'severity = critical', channels: ['slack'], enabled: true },
                { name: 'Policy Violation', condition: 'violation_type = blocked', channels: ['email'], enabled: false },
              ].map((rule, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{rule.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{rule.condition}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      {rule.channels.map(ch => {
                        const Icon = channelIcons[ch as keyof typeof channelIcons];
                        return <Icon key={ch} className="w-4 h-4 text-muted-foreground" />;
                      })}
                    </div>
                    <Switch checked={rule.enabled} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
