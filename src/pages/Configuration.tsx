import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Settings2, 
  Save, 
  History, 
  Scale,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { usePlatformConfig, useUpdateConfig, useConfigHistory } from "@/hooks/usePlatformConfig";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type ConfigValue = Record<string, number | string | boolean>;

export default function Configuration() {
  const { data: configs, isLoading } = usePlatformConfig();
  const updateConfig = useUpdateConfig();
  const { data: history } = useConfigHistory();

  const [pendingChanges, setPendingChanges] = useState<Record<string, ConfigValue>>({});
  const [saving, setSaving] = useState(false);

  const getConfigsByCategory = (category: string) => {
    return configs?.filter(c => c.category === category) || [];
  };

  const getConfigValue = (key: string): ConfigValue => {
    const pending = pendingChanges[key];
    if (pending) return pending;
    const config = configs?.find(c => c.config_key === key);
    return (config?.config_value as ConfigValue) || {};
  };

  const handleValueChange = (key: string, field: string, value: number | string | boolean) => {
    const current = getConfigValue(key);
    setPendingChanges(prev => ({
      ...prev,
      [key]: { ...current, [field]: value }
    }));
  };

  const handleSave = async (configKey: string) => {
    const value = pendingChanges[configKey];
    if (!value) return;

    setSaving(true);
    try {
      await updateConfig.mutateAsync({ configKey, value });
      setPendingChanges(prev => {
        const { [configKey]: _, ...rest } = prev;
        return rest;
      });
      toast.success("Configuration saved");
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const hasPendingChange = (key: string) => !!pendingChanges[key];

  const renderEngineWeights = () => {
    const config = getConfigValue('engine_weights');
    const engines = ['fairness', 'toxicity', 'privacy', 'hallucination', 'explainability'];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Engine Weights
          </CardTitle>
          <CardDescription>
            Configure the relative importance of each RAI engine in composite scoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {engines.map(engine => (
            <div key={engine} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="capitalize">{engine}</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {(config[engine] as number) || 20}%
                </span>
              </div>
              <Slider
                value={[(config[engine] as number) || 20]}
                onValueChange={([val]) => handleValueChange('engine_weights', engine, val)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          ))}

          <Separator />

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Total: {engines.reduce((sum, e) => sum + ((config[e] as number) || 20), 0)}%
            </div>
            <Button
              onClick={() => handleSave('engine_weights')}
              disabled={!hasPendingChange('engine_weights') || saving}
              size="sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save Weights
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSLOTargets = () => {
    const config = getConfigValue('slo_targets');

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            SLO Targets
          </CardTitle>
          <CardDescription>
            Service Level Objectives for incident response and detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>MTTD Critical (minutes)</Label>
              <Input
                type="number"
                value={(config.mttd_critical as number) || 5}
                onChange={(e) => handleValueChange('slo_targets', 'mttd_critical', parseInt(e.target.value))}
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">Mean Time to Detect critical issues</p>
            </div>

            <div className="space-y-2">
              <Label>MTTR Critical (minutes)</Label>
              <Input
                type="number"
                value={(config.mttr_critical as number) || 60}
                onChange={(e) => handleValueChange('slo_targets', 'mttr_critical', parseInt(e.target.value))}
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">Mean Time to Respond to critical issues</p>
            </div>

            <div className="space-y-2">
              <Label>MTTD High (minutes)</Label>
              <Input
                type="number"
                value={(config.mttd_high as number) || 15}
                onChange={(e) => handleValueChange('slo_targets', 'mttd_high', parseInt(e.target.value))}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>MTTR High (minutes)</Label>
              <Input
                type="number"
                value={(config.mttr_high as number) || 240}
                onChange={(e) => handleValueChange('slo_targets', 'mttr_high', parseInt(e.target.value))}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => handleSave('slo_targets')}
              disabled={!hasPendingChange('slo_targets') || saving}
              size="sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save SLOs
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderThresholds = () => {
    const config = getConfigValue('dq_thresholds');
    const dimensions = ['completeness', 'validity', 'uniqueness', 'freshness', 'consistency', 'accuracy'];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Quality Thresholds
          </CardTitle>
          <CardDescription>
            Minimum acceptable scores for data quality dimensions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {dimensions.map(dim => (
              <div key={dim} className="space-y-2">
                <Label className="capitalize text-sm">{dim}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={(config[dim] as number) || 70}
                  onChange={(e) => handleValueChange('dq_thresholds', dim, parseInt(e.target.value))}
                  className="bg-secondary border-border"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => handleSave('dq_thresholds')}
              disabled={!hasPendingChange('dq_thresholds') || saving}
              size="sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save Thresholds
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderHistory = () => {
    if (!history || history.length === 0) {
      return (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No configuration changes recorded yet</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {history.map((entry) => (
            <div key={entry.id} className="p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  {entry.config_id?.slice(0, 8) || 'Unknown'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-destructive font-medium">Previous:</span>
                  <pre className="mt-1 text-muted-foreground overflow-hidden text-ellipsis">
                    {JSON.stringify(entry.previous_value, null, 2).slice(0, 100)}
                  </pre>
                </div>
                <div className="p-2 rounded bg-success/10 border border-success/20">
                  <span className="text-success font-medium">New:</span>
                  <pre className="mt-1 text-muted-foreground overflow-hidden text-ellipsis">
                    {JSON.stringify(entry.new_value, null, 2).slice(0, 100)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  if (isLoading) {
    return (
      <MainLayout title="Configuration" subtitle="Platform configuration management">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Configuration" 
      subtitle="Platform configuration management"
      headerActions={
        <Badge variant="outline" className="gap-1.5">
          <Settings2 className="w-3 h-3" />
          {configs?.length || 0} configurations
        </Badge>
      }
    >
      <Tabs defaultValue="weights" className="space-y-6">
        <TabsList>
          <TabsTrigger value="weights">Engine Weights</TabsTrigger>
          <TabsTrigger value="slo">SLO Targets</TabsTrigger>
          <TabsTrigger value="thresholds">Quality Thresholds</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>

        <TabsContent value="weights" className="space-y-6">
          {renderEngineWeights()}
        </TabsContent>

        <TabsContent value="slo" className="space-y-6">
          {renderSLOTargets()}
        </TabsContent>

        <TabsContent value="thresholds" className="space-y-6">
          {renderThresholds()}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Configuration History
              </CardTitle>
              <CardDescription>
                Audit trail of all configuration changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderHistory()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {Object.keys(pendingChanges).length > 0 && (
        <div className="fixed bottom-6 right-6 p-4 rounded-lg bg-warning/10 border border-warning/30 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">
              {Object.keys(pendingChanges).length} unsaved changes
            </span>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
