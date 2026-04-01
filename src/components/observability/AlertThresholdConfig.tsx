import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  // Load existing config from organization_settings
  const { data: savedConfig } = useQuery({
    queryKey: ['alert-threshold-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('organization_settings')
        .select('alert_thresholds')
        .limit(1)
        .maybeSingle();
      return (data as any)?.alert_thresholds as ThresholdConfig | null;
    },
  });

  useEffect(() => {
    if (savedConfig) setConfig({ ...defaultConfig, ...savedConfig });
  }, [savedConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Upsert into organization_settings
      const { error } = await supabase
        .from('organization_settings')
        .upsert({ alert_thresholds: config as any } as any, { onConflict: 'id' });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['alert-threshold-config'] });
      toast.success('Alert thresholds saved', { description: 'Configuration will be applied to new alerts.' });
      setIsOpen(false);
    } catch (err: any) {
      // Fallback: save to localStorage if org settings unavailable
      localStorage.setItem('alert-thresholds', JSON.stringify(config));
      toast.success('Alert thresholds saved locally');
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Configure Thresholds
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Alert Threshold Configuration</DialogTitle></DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">PSI Drift Threshold: {config.psi_threshold}</Label>
              <Slider min={0.05} max={0.5} step={0.05} value={[config.psi_threshold]}
                onValueChange={([v]) => setConfig(c => ({ ...c, psi_threshold: v }))} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs">KL Divergence Threshold: {config.kl_threshold}</Label>
              <Slider min={0.01} max={0.3} step={0.01} value={[config.kl_threshold]}
                onValueChange={([v]) => setConfig(c => ({ ...c, kl_threshold: v }))} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs">Latency Threshold (ms)</Label>
              <Input type="number" value={config.latency_threshold}
                onChange={e => setConfig(c => ({ ...c, latency_threshold: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Error Rate Threshold (%)</Label>
              <Input type="number" value={config.error_rate_threshold}
                onChange={e => setConfig(c => ({ ...c, error_rate_threshold: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Block Rate Threshold (%)</Label>
              <Input type="number" value={config.block_rate_threshold}
                onChange={e => setConfig(c => ({ ...c, block_rate_threshold: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-medium">Alert Triggers</Label>
            {[
              { key: 'alert_on_drift', label: 'Alert on Data Drift' },
              { key: 'alert_on_latency', label: 'Alert on High Latency' },
              { key: 'alert_on_errors', label: 'Alert on Error Spikes' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <Switch checked={config[key as keyof ThresholdConfig] as boolean}
                  onCheckedChange={v => setConfig(c => ({ ...c, [key]: v }))} />
              </div>
            ))}
          </div>
          <div>
            <Label className="text-xs">Email Recipients (comma-separated)</Label>
            <Input value={config.email_recipients || ''} placeholder="alerts@company.com, oncall@company.com"
              onChange={e => setConfig(c => ({ ...c, email_recipients: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Slack Webhook URL</Label>
            <Input value={config.slack_webhook || ''} placeholder="https://hooks.slack.com/..."
              onChange={e => setConfig(c => ({ ...c, slack_webhook: e.target.value }))} />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Thresholds'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
