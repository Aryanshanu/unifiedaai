import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Settings, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ThresholdConfig {
  psi_threshold: number;
  kl_threshold: number;
  latency_threshold: number;
  error_rate_threshold: number;
  block_rate_threshold: number;
  alert_on_drift: boolean;
  alert_on_latency: boolean;
  alert_on_errors: boolean;
  slack_webhook?: string;
  email_recipients?: string;
}

const defaultConfig: ThresholdConfig = {
  psi_threshold: 0.2,
  kl_threshold: 0.1,
  latency_threshold: 500,
  error_rate_threshold: 5,
  block_rate_threshold: 20,
  alert_on_drift: true,
  alert_on_latency: true,
  alert_on_errors: true,
};

export function AlertThresholdConfig() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ThresholdConfig>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate save - in production, this would persist to organization_settings
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.success('Alert thresholds saved');
    setIsSaving(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Configure Thresholds
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Alert Thresholds
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Drift Thresholds */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Drift Detection</h4>
            
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label>PSI Threshold</Label>
                <span className="text-sm font-mono">{config.psi_threshold.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.psi_threshold * 100]}
                onValueChange={([v]) => setConfig(prev => ({ ...prev, psi_threshold: v / 100 }))}
                max={50}
                step={1}
              />
              <p className="text-xs text-muted-foreground">Population Stability Index threshold for drift alerts</p>
            </div>
            
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label>KL Divergence Threshold</Label>
                <span className="text-sm font-mono">{config.kl_threshold.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.kl_threshold * 100]}
                onValueChange={([v]) => setConfig(prev => ({ ...prev, kl_threshold: v / 100 }))}
                max={50}
                step={1}
              />
            </div>
          </div>
          
          {/* Performance Thresholds */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Performance</h4>
            
            <div className="grid gap-2">
              <Label>Latency Threshold (ms)</Label>
              <Input
                type="number"
                value={config.latency_threshold}
                onChange={(e) => setConfig(prev => ({ ...prev, latency_threshold: parseInt(e.target.value) }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Error Rate (%)</Label>
                <Input
                  type="number"
                  value={config.error_rate_threshold}
                  onChange={(e) => setConfig(prev => ({ ...prev, error_rate_threshold: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Block Rate (%)</Label>
                <Input
                  type="number"
                  value={config.block_rate_threshold}
                  onChange={(e) => setConfig(prev => ({ ...prev, block_rate_threshold: parseFloat(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          
          {/* Alert Toggles */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Alert Types</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="drift">Drift Alerts</Label>
                <Switch
                  id="drift"
                  checked={config.alert_on_drift}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, alert_on_drift: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="latency">Latency Alerts</Label>
                <Switch
                  id="latency"
                  checked={config.alert_on_latency}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, alert_on_latency: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="errors">Error Alerts</Label>
                <Switch
                  id="errors"
                  checked={config.alert_on_errors}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, alert_on_errors: checked }))}
                />
              </div>
            </div>
          </div>
          
          {/* Notification Channels */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Notifications</h4>
            
            <div className="grid gap-2">
              <Label>Slack Webhook URL</Label>
              <Input
                type="url"
                value={config.slack_webhook || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, slack_webhook: e.target.value }))}
                placeholder="https://hooks.slack.com/..."
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Email Recipients</Label>
              <Input
                type="text"
                value={config.email_recipients || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, email_recipients: e.target.value }))}
                placeholder="alerts@company.com, team@company.com"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
