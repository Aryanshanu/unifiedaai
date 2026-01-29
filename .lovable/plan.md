
# Complete Implementation: All Remaining Frontend-Backend Integration

## Overview
This plan completes ALL remaining work in a single implementation. No further approvals will be needed - everything will be done at once.

---

## Files to Modify (4 files)

### 1. src/pages/Incidents.tsx
**Current State**: Has filters, list view, detail dialog, but no bulk resolution tab
**Changes**:
- Add Tabs component wrapping main content
- Add "Bulk Resolution" tab with `BulkResolutionPanel` integration
- Add "Run Lifecycle Check" button calling `incident-lifecycle` edge function
- Add RCA template badge on resolved incidents
- Add follow-up date display for incidents with `follow_up_date`

### 2. src/pages/Observability.tsx
**Current State**: Has Dashboard, AI Assistant, Real-Time Chat, Drift Detection tabs
**Changes**:
- Add new "Oversight Agent" tab
- Add `SimulationController` component in that tab
- Add `events_raw` count metric to dashboard
- Add real-time subscription for `events_raw` table
- Add "Process Pending Events" button calling `process-events` edge function

### 3. src/pages/Settings.tsx
**Current State**: Has General, Users, Security, Notifications, Integrations, Providers, API Keys, Regions sections
**Changes**:
- Add new "Platform Config" section to navigation
- Add configuration editor UI for `platform_config` table
- Group configs by category (engine_weights, thresholds, slo, escalation, policy)
- Show configuration history from `platform_config_history`
- Add sliders for engine weights, number inputs for thresholds

### 4. src/pages/GoldenDemoV2.tsx
**Current State**: Has project/model selection, mode selection, live execution logs
**Changes**:
- Add scenario selector dropdown from `demo_scenarios` table
- Add enhanced demo steps for Oversight Agent, Predictive Governance, Bypass Detection
- Add hooks for new demo steps execution

---

## Technical Details

### Incidents.tsx Changes

```typescript
// New imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkResolutionPanel } from "@/components/incidents/BulkResolutionPanel";
import { RefreshCw, PlayCircle, FileCheck } from "lucide-react";

// New state for lifecycle check
const [runningLifecycle, setRunningLifecycle] = useState(false);

// New function to run lifecycle check
const handleRunLifecycleCheck = async () => {
  setRunningLifecycle(true);
  try {
    await supabase.functions.invoke('incident-lifecycle', {
      body: { action: 'check_all' }
    });
    toast.success("Lifecycle check complete");
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  } catch (error) {
    toast.error("Lifecycle check failed");
  } finally {
    setRunningLifecycle(false);
  }
};

// Wrap main content in Tabs
<Tabs defaultValue="list" className="w-full">
  <div className="flex items-center justify-between mb-4">
    <TabsList>
      <TabsTrigger value="list">Incident List</TabsTrigger>
      <TabsTrigger value="bulk">Bulk Resolution</TabsTrigger>
    </TabsList>
    <Button onClick={handleRunLifecycleCheck} disabled={runningLifecycle}>
      <PlayCircle className="w-4 h-4 mr-2" />
      Run Lifecycle Check
    </Button>
  </div>
  
  <TabsContent value="list">
    {/* Existing KPIs, filters, and incident list */}
  </TabsContent>
  
  <TabsContent value="bulk">
    <BulkResolutionPanel onComplete={() => queryClient.invalidateQueries({ queryKey: ['incidents'] })} />
  </TabsContent>
</Tabs>
```

### Observability.tsx Changes

```typescript
// New imports
import { SimulationController } from "@/components/oversight/SimulationController";
import { useQuery } from "@tanstack/react-query";
import { Cpu } from "lucide-react";

// Add events_raw count query
const { data: eventsCount } = useQuery({
  queryKey: ['events-raw-count'],
  queryFn: async () => {
    const { count } = await supabase
      .from('events_raw')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false);
    return count || 0;
  },
});

// Add to tabs array
const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'oversight', label: 'Oversight Agent', icon: Cpu }, // NEW
  { id: 'assistant', label: 'AI Assistant', icon: Bot },
  { id: 'realtime', label: 'Real-Time Chat', icon: MessageSquare },
  { id: 'drift', label: 'Drift Detection', icon: TrendingUp },
];

// Add oversight tab content
{activeTab === 'oversight' && (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="Pending Events"
        value={eventsCount?.toString() || "0"}
        subtitle="Awaiting processing"
        icon={<Cpu className="w-4 h-4 text-primary" />}
      />
    </div>
    <SimulationController />
  </div>
)}

// Add realtime subscription for events_raw
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events_raw' }, () => {
  queryClient.invalidateQueries({ queryKey: ['events-raw-count'] });
})
```

### Settings.tsx Changes

```typescript
// New imports
import { usePlatformConfig, useUpdateConfig, useConfigHistory } from "@/hooks/usePlatformConfig";
import { Slider } from "@/components/ui/slider";
import { Sliders } from "lucide-react";

// Add to settingsSections array
{ id: "config", icon: Sliders, label: "Platform Config", description: "Engine weights and thresholds" }

// Add platform config section content
{activeSection === "config" && (
  <>
    <h2 className="text-lg font-semibold text-foreground mb-6">Platform Configuration</h2>
    <PlatformConfigEditor />
  </>
)}

// Create PlatformConfigEditor component inline
function PlatformConfigEditor() {
  const { data: configs, isLoading } = usePlatformConfig();
  const updateConfig = useUpdateConfig();
  const { data: history } = useConfigHistory();
  
  const engineWeights = configs?.filter(c => c.category === 'engine_weights') || [];
  const thresholds = configs?.filter(c => c.category === 'thresholds') || [];
  const sloConfigs = configs?.filter(c => c.category === 'slo') || [];
  
  return (
    <div className="space-y-8">
      {/* Engine Weights Section */}
      <div>
        <h3 className="text-sm font-medium mb-4">Engine Weights</h3>
        <div className="space-y-4">
          {engineWeights.map(config => (
            <div key={config.id} className="flex items-center gap-4">
              <Label className="w-32">{config.config_key}</Label>
              <Slider 
                value={[config.config_value?.weight || 50]}
                max={100}
                step={5}
                className="flex-1"
                onValueCommit={([val]) => updateConfig.mutate({
                  id: config.id, 
                  value: { weight: val }
                })}
              />
              <span className="w-12 text-right font-mono">{config.config_value?.weight || 50}%</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* SLO Targets Section */}
      <div>
        <h3 className="text-sm font-medium mb-4">SLO Targets</h3>
        <div className="grid grid-cols-2 gap-4">
          {sloConfigs.map(config => (
            <div key={config.id} className="space-y-2">
              <Label>{config.config_key}</Label>
              <Input 
                type="number"
                value={config.config_value?.target || 0}
                onChange={(e) => updateConfig.mutate({
                  id: config.id,
                  value: { target: parseInt(e.target.value) }
                })}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Config History */}
      {history && history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-4">Recent Changes</h3>
          <div className="space-y-2">
            {history.slice(0, 5).map(h => (
              <div key={h.id} className="text-sm text-muted-foreground">
                Config updated at {new Date(h.changed_at).toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### GoldenDemoV2.tsx Changes

```typescript
// New imports
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Add demo scenarios query
const { data: demoScenarios } = useQuery({
  queryKey: ['demo-scenarios'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('demo_scenarios')
      .select('*')
      .eq('enabled', true)
      .order('category');
    if (error) throw error;
    return data;
  }
});

// Add state for selected scenario
const [selectedScenario, setSelectedScenario] = useState<string>("");

// Add scenario selector in setup view
<div className="space-y-2">
  <Label>Demo Scenario (Optional)</Label>
  <Select value={selectedScenario} onValueChange={setSelectedScenario}>
    <SelectTrigger>
      <SelectValue placeholder="Use default demo flow" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">Default Flow</SelectItem>
      {demoScenarios?.map(s => (
        <SelectItem key={s.id} value={s.id}>
          <div className="flex items-center gap-2">
            <span>{s.scenario_name}</span>
            <Badge variant="outline" className="text-xs">{s.category}</Badge>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

// Enhanced demo steps list
<li>Run Oversight Agent simulation (new)</li>
<li>Execute Predictive Governance analysis (new)</li>
<li>Check for Governance Bypass attempts (new)</li>
```

---

## Summary of All Changes

| File | Changes |
|------|---------|
| `Incidents.tsx` | +Tabs, +BulkResolutionPanel, +Run Lifecycle Check button |
| `Observability.tsx` | +Oversight Agent tab, +SimulationController, +events_raw metrics |
| `Settings.tsx` | +Platform Config section, +Engine weights sliders, +SLO editors |
| `GoldenDemoV2.tsx` | +Scenario selector, +Enhanced demo steps |

---

## What Gets Completed

After this implementation:
- All 8 new database tables are connected to UI
- All 7 new Edge Functions are callable from UI
- SimulationController is integrated in 2 places (Index + Observability)
- BulkTriagePanel is integrated in HITL page
- BulkResolutionPanel is integrated in Incidents page
- PredictiveRiskPanel is integrated in Index page
- Configuration page is fully functional
- Runbooks page is fully functional
- All navigation links work
- All routes are registered

**This completes the 85% → 95% PDR upgrade with no further action needed.**
