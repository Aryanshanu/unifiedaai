import { useState, useEffect } from "react";
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
  Loader2,
  Trash2,
  Globe,
  Zap
} from "lucide-react";
import { EnforcementBadge } from "@/components/shared/EnforcementBadge";
import { cn } from "@/lib/utils";
import { useDriftAlerts } from "@/hooks/useDriftAlerts";
import { useIncidents } from "@/hooks/useIncidents";
import { 
  useNotificationChannels, 
  useCreateNotificationChannel, 
  useUpdateNotificationChannel,
  useDeleteNotificationChannel 
} from "@/hooks/useNotificationChannels";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/shared/EmptyState";

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
  webhook: Globe,
};

export default function Alerts() {
  const { data: driftAlerts, isLoading: driftLoading, refetch: refetchDrift } = useDriftAlerts();
  const { data: incidents, isLoading: incidentsLoading, refetch: refetchIncidents } = useIncidents();
  const { data: channels, isLoading: channelsLoading } = useNotificationChannels();
  const createChannel = useCreateNotificationChannel();
  const updateChannel = useUpdateNotificationChannel();
  const deleteChannel = useDeleteNotificationChannel();
  
  const [activeTab, setActiveTab] = useState<'alerts' | 'channels' | 'rules'>('alerts');
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState<'email' | 'slack' | 'teams' | 'webhook'>('email');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelConfig, setNewChannelConfig] = useState('');
  const [realtimeCount, setRealtimeCount] = useState(0);

  // Supabase Realtime subscriptions
  useEffect(() => {
    console.log("Setting up Alerts Realtime subscriptions...");
    
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drift_alerts' },
        (payload) => {
          console.log('Drift alert change:', payload);
          setRealtimeCount(prev => prev + 1);
          refetchDrift();
          if (payload.eventType === 'INSERT') {
            toast.warning("🚨 New Drift Alert", {
              description: `${(payload.new as any)?.drift_type || 'Drift'} detected on ${(payload.new as any)?.feature || 'feature'}`
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          console.log('Incident change:', payload);
          setRealtimeCount(prev => prev + 1);
          refetchIncidents();
          if (payload.eventType === 'INSERT') {
            toast.error("🔥 New Incident", {
              description: (payload.new as any)?.title || "Incident created"
            });
            // NOTE: PagerDuty escalation disabled - backend integration not implemented
            // When implemented, this will trigger actual PagerDuty API call
          }
        }
      )
      .subscribe((status) => {
        console.log('Alerts realtime status:', status);
      });

    return () => {
      console.log("Cleaning up Alerts Realtime subscriptions");
      supabase.removeChannel(channel);
    };
  }, [refetchDrift, refetchIncidents]);

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

  const toggleChannel = async (channelId: string, enabled: boolean) => {
    try {
      await updateChannel.mutateAsync({ id: channelId, enabled: !enabled });
      toast.success("Channel updated");
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await deleteChannel.mutateAsync(channelId);
      toast.success("Channel deleted");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const handleAddChannel = async () => {
    if (!newChannelName.trim()) {
      toast.error("Channel name is required");
      return;
    }
    
    try {
      await createChannel.mutateAsync({
        channel_type: newChannelType,
        name: newChannelName,
        config: { endpoint: newChannelConfig },
      });
      toast.success("Channel created");
      setShowAddChannel(false);
      setNewChannelName('');
      setNewChannelConfig('');
    } catch (error: any) {
      toast.error("Failed to create: " + error.message);
    }
  };

  const isLoading = driftLoading || incidentsLoading;

  return (
    <MainLayout 
      title="Alerts & Notifications" 
      subtitle="Real-time alerts, drift notifications, and notification channel management"
      headerActions={
        <EnforcementBadge level="advisory" />
      }
    >
      {/* Realtime indicator */}
      {realtimeCount > 0 && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm text-success font-medium">
              Live: {realtimeCount} realtime events received
            </span>
          </div>
          <Badge variant="outline" className="text-success border-success/30">
            <Zap className="w-3 h-3 mr-1" />
            Realtime Active
          </Badge>
        </div>
      )}

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
            <EmptyState
              icon={<CheckCircle className="w-8 h-8 text-success/50" />}
              title="All clear!"
              description="No active alerts at this time. Your systems are healthy."
            />
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
            <Button variant="gradient" size="sm" className="gap-2" onClick={() => setShowAddChannel(true)}>
              <Plus className="w-4 h-4" />
              Add Channel
            </Button>
          </div>

          {channelsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !channels?.length ? (
            <EmptyState
              icon={<Bell className="w-8 h-8 text-primary/50" />}
              title="No notification channels"
              description="Add a channel to receive alerts via email, Slack, or webhooks"
              actionLabel="Add Channel"
              onAction={() => setShowAddChannel(true)}
            />
          ) : (
            <div className="grid gap-4">
              {channels.map(channel => {
                const Icon = channelIcons[channel.channel_type];
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
                        <p className="text-sm text-muted-foreground capitalize">{channel.channel_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={channel.enabled ? "default" : "secondary"}>
                        {channel.enabled ? "Active" : "Disabled"}
                      </Badge>
                      <Switch 
                        checked={channel.enabled} 
                        onCheckedChange={() => toggleChannel(channel.id, channel.enabled)}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteChannel(channel.id)}
                      >
                        <Trash2 className="w-4 h-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Channel Dialog */}
          <Dialog open={showAddChannel} onOpenChange={setShowAddChannel}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Notification Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Channel Type</Label>
                  <Select value={newChannelType} onValueChange={(v) => setNewChannelType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Channel Name</Label>
                  <Input 
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g., Admin Alerts"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {newChannelType === 'email' ? 'Email Address' : 
                     newChannelType === 'slack' ? 'Webhook URL' :
                     newChannelType === 'teams' ? 'Webhook URL' : 'Endpoint URL'}
                  </Label>
                  <Input 
                    value={newChannelConfig}
                    onChange={(e) => setNewChannelConfig(e.target.value)}
                    placeholder={
                      newChannelType === 'email' ? 'admin@company.com' : 'https://...'
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddChannel(false)}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleAddChannel} disabled={createChannel.isPending}>
                  {createChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Channel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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