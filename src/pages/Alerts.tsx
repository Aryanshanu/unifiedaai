import { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Globe
} from "lucide-react";
import { EnforcementBadge } from "@/components/shared/EnforcementBadge";
import { RiskIndicator } from "@/components/fractal";
import { FRACTAL_RISK, normalizeRiskLevel } from "@/lib/fractal-theme";
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

const channelIcons = {
  email: Mail,
  slack: Slack,
  teams: MessageSquare,
  webhook: Globe,
};

export default function Alerts() {
  const queryClient = useQueryClient();
  const { data: driftAlerts, isLoading: driftLoading } = useDriftAlerts();
  const { data: incidents, isLoading: incidentsLoading } = useIncidents();
  const { data: channels, isLoading: channelsLoading } = useNotificationChannels();
  const createChannel = useCreateNotificationChannel();
  const updateChannel = useUpdateNotificationChannel();
  const deleteChannel = useDeleteNotificationChannel();
  
  const [activeTab, setActiveTab] = useState<'alerts' | 'channels' | 'rules'>('alerts');
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState<'email' | 'slack' | 'teams' | 'webhook'>('email');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelConfig, setNewChannelConfig] = useState('');

  // Supabase Realtime subscriptions - use stable queryClient reference
  const subscriptionRef = useRef(false);
  
  useEffect(() => {
    // Prevent duplicate subscriptions
    if (subscriptionRef.current) return;
    subscriptionRef.current = true;
    
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drift_alerts' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['drift-alerts'] });
          if (payload.eventType === 'INSERT') {
            toast.warning("New Drift Alert", {
              description: `${(payload.new as any)?.drift_type || 'Drift'} detected on ${(payload.new as any)?.feature || 'feature'}`
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['incidents'] });
          if (payload.eventType === 'INSERT') {
            toast.error("New Incident", {
              description: (payload.new as any)?.title || "Incident created"
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscriptionRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
      toast.success("Channel configuration applied");
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await deleteChannel.mutateAsync(channelId);
      toast.success("Channel removed");
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
              <Button variant="outline" size="sm" disabled title="Filter functionality coming soon">
              <Button variant="outline" size="sm" onClick={() => toast.info("Use search to filter alerts")}>
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {allAlerts.filter(a => a.status === 'open').length} active alerts
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : allAlerts.length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="w-8 h-8 text-success/50" />}
              title="Systems nominal"
              description="No active alerts. Your systems are healthy."
            />
          ) : (
            <div className="space-y-3">
              {allAlerts.map(alert => {
                const riskLevel = normalizeRiskLevel(alert.severity);
                const config = FRACTAL_RISK[riskLevel];
                
                return (
                  <div
                    key={alert.id}
                    className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        config.bg
                      )}>
                        <AlertTriangle className={cn("w-5 h-5", config.text)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <RiskIndicator level={alert.severity} size="sm" />
                          <span className={cn(
                            "text-xs",
                            alert.status === 'open' ? "text-risk-high" : 
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            try {
                              if (alert.type === 'drift') {
                                await supabase.from('drift_alerts').update({ status: 'acknowledged' }).eq('id', alert.id);
                              } else {
                                await supabase.from('incidents').update({ status: 'acknowledged' }).eq('id', alert.id);
                              }
                              queryClient.invalidateQueries({ queryKey: ['drift-alerts'] });
                              queryClient.invalidateQueries({ queryKey: ['incidents'] });
                              toast.success("Alert acknowledged");
                            } catch (error) {
                              toast.error("Failed to acknowledge alert");
                            }
                          }}
                          disabled={alert.status === 'resolved' || alert.status === 'acknowledged'}
                        >
                          Acknowledge
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            try {
                              if (alert.type === 'drift') {
                                await supabase.from('drift_alerts').update({ status: 'resolved' }).eq('id', alert.id);
                              } else {
                                await supabase.from('incidents').update({ status: 'resolved' }).eq('id', alert.id);
                              }
                              queryClient.invalidateQueries({ queryKey: ['drift-alerts'] });
                              queryClient.invalidateQueries({ queryKey: ['incidents'] });
                              toast.success("Alert resolved");
                            } catch (error) {
                              toast.error("Failed to resolve alert");
                            }
                          }}
                          disabled={alert.status === 'resolved'}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Notification Channels</h2>
            <Button variant="default" size="sm" className="gap-2" onClick={() => setShowAddChannel(true)}>
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
                const Icon = channelIcons[channel.channel_type as keyof typeof channelIcons] || Bell;
                return (
                  <div
                    key={channel.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{channel.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{channel.channel_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "text-xs font-medium",
                        channel.enabled ? "text-success" : "text-muted-foreground"
                      )}>
                        {channel.enabled ? "Enforced" : "Disabled"}
                      </span>
                      <Switch 
                        checked={channel.enabled} 
                        onCheckedChange={() => toggleChannel(channel.id, channel.enabled)}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteChannel(channel.id)}
                      >
                        <Trash2 className="w-4 h-4 text-risk-critical" />
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
                <Button onClick={handleAddChannel} disabled={createChannel.isPending}>
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
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Alert Rules</p>
              <p className="text-sm text-muted-foreground mt-1">
                Alert routing is configured at the platform level. Alerts are automatically routed 
                to enabled notification channels when drift or incidents are detected.
              </p>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-left max-w-md mx-auto">
                <p className="text-xs font-medium text-foreground mb-2">Active Routing Rules:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Critical severity → All enabled channels</li>
                  <li>• High severity → Email + Slack channels</li>
                  <li>• Drift alerts → Configured webhook endpoints</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
