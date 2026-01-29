
# Complete Frontend-Backend Integration: Production-Ready Implementation

## Overview

This plan completes the full integration of all new components created in the 85%→95% PDR plan into the existing pages. All the Edge Functions and React components are already created - this plan wires them together.

---

## Current State Summary

### Already Created (Need Integration)
| Component/Function | Location | Status |
|-------------------|----------|--------|
| `generate-synthetic-events` | Edge Function | Created, deployed |
| `hitl-auto-assist` | Edge Function | Created, deployed |
| `incident-lifecycle` | Edge Function | Created, deployed |
| `process-events` | Edge Function | Created, deployed |
| `predictive-governance` | Edge Function | Created, deployed |
| `policy-lint` | Edge Function | Created, deployed |
| `detect-governance-bypass` | Edge Function | Created, deployed |
| `SimulationController` | Component | Created, needs page integration |
| `BulkTriagePanel` | Component | Created, needs HITL.tsx integration |
| `BulkResolutionPanel` | Component | Created, needs Incidents.tsx integration |
| `usePlatformConfig` | Hook | Created |
| `usePredictiveGovernance` | Hook | Created |
| 8 new database tables | Database | Created via migration |

---

## Implementation Plan

### Phase 1: Command Center (Index.tsx) Enhancements

**File**: `src/pages/Index.tsx`

**Changes**:
1. Add SimulationController component for Oversight Agent testing
2. Add Predictive Risk Indicators from `usePredictiveGovernance`
3. Add Events Processed metric card (from `events_raw` count)
4. Add real-time subscription for `events_raw` table
5. Add "Run Governance Check" button to trigger `detect-governance-bypass`

**New imports**:
```typescript
import { SimulationController } from "@/components/oversight/SimulationController";
import { useHighRiskPredictions } from "@/hooks/usePredictiveGovernance";
```

**UI additions**:
- New section: "Oversight Agent" with SimulationController
- Predictive risk badges on quick action cards
- Alert banner for high-risk predictions (risk_score >= 80)

---

### Phase 2: HITL Console (HITL.tsx) Enhancements

**File**: `src/pages/HITL.tsx`

**Changes**:
1. Add Tabs component for "Queue" | "Bulk Triage" views
2. Integrate `BulkTriagePanel` component in "Bulk Triage" tab
3. Add "AI Assist" badge on items with auto-assist suggestions
4. Add statistics summary showing pending by AI recommendation
5. Connect to `hitl-auto-assist` Edge Function for single-item analysis

**New imports**:
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkTriagePanel } from "@/components/hitl/BulkTriagePanel";
```

**UI structure**:
```
┌─────────────────────────────────────┐
│ HITL Console                        │
├─────────────────────────────────────┤
│ [Queue] [Bulk Triage] tabs          │
├─────────────────────────────────────┤
│ Tab Content:                        │
│ - Queue: existing review cards      │
│ - Bulk Triage: BulkTriagePanel      │
└─────────────────────────────────────┘
```

---

### Phase 3: Incidents Page (Incidents.tsx) Enhancements

**File**: `src/pages/Incidents.tsx`

**Changes**:
1. Add Tabs component for "List" | "Bulk Resolution" views
2. Integrate `BulkResolutionPanel` component
3. Add "Run Lifecycle Check" button in header (calls `incident-lifecycle`)
4. Add RCA template indicator on resolved incidents
5. Add follow-up date display for incidents with `follow_up_date`

**New imports**:
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkResolutionPanel } from "@/components/incidents/BulkResolutionPanel";
```

---

### Phase 4: Observability Page Enhancements

**File**: `src/pages/Observability.tsx`

**Changes**:
1. Add new tab: "Oversight Agent" with SimulationController
2. Add `events_raw` count metric to dashboard
3. Add real-time subscription for events_raw
4. Add "Process Pending Events" button (calls `process-events`)
5. Add Edge Function metrics display (if function_metrics has data)

**New section in tabs array**:
```typescript
{ id: 'oversight', label: 'Oversight Agent', icon: Zap }
```

---

### Phase 5: Settings Page - Configuration Dashboard

**File**: `src/pages/Settings.tsx`

**Changes**:
1. Add new tab: "Platform Configuration"
2. Display/edit values from `platform_config` table
3. Show configuration history from `platform_config_history`
4. Group configs by category (engine_weights, thresholds, slo, escalation, policy)

**New imports**:
```typescript
import { usePlatformConfig, useUpdateConfig, useConfigHistory } from "@/hooks/usePlatformConfig";
```

**UI for each config category**:
- Engine Weights: Sliders for each engine (0-100)
- DQ Thresholds: Number inputs for 6 dimensions
- SLO Targets: MTTD/MTTR minute inputs
- Escalation Rules: Toggles and dropdowns

---

### Phase 6: Sidebar Navigation Updates

**File**: `src/components/layout/Sidebar.tsx`

**Changes**:
1. Add "Oversight Agent" link under Monitor section
2. Add badge showing unprocessed events count
3. Add Configuration link under Configure section

**New nav items**:
```typescript
{ path: "/observability?tab=oversight", icon: Zap, label: "Oversight Agent" },
{ path: "/settings?tab=config", icon: Sliders, label: "Configuration" },
```

---

### Phase 7: Golden Demo V2 Enhancements

**File**: `src/pages/GoldenDemoV2.tsx`

**Changes**:
1. Add scenario selector from `demo_scenarios` table
2. Add SimulationController as optional step
3. Add Predictive Governance step
4. Add bypass detection check step

**New demo steps**:
```typescript
const ENHANCED_DEMO_STEPS = [
  ...existing_steps,
  { step: 'oversight-agent', label: 'Oversight Agent Test' },
  { step: 'predictive-check', label: 'Predictive Governance' },
  { step: 'bypass-detection', label: 'Governance Bypass Check' },
];
```

---

### Phase 8: Create New Configuration Page

**New File**: `src/pages/Configuration.tsx`

**Purpose**: Dedicated page for platform configuration management

**Components**:
- Engine Weight Editor
- Threshold Configuration
- SLO Target Editor
- Escalation Rules Manager
- Config History Viewer

**Route addition** in `App.tsx`:
```typescript
<Route path="/configuration" element={<ProtectedRoute requiredRoles={['admin']}><Configuration /></ProtectedRoute>} />
```

---

### Phase 9: Create Runbooks Page

**New File**: `src/pages/Runbooks.tsx`

**Purpose**: Incident response guides and decision trees

**Content**:
- Incident triage decision tree (visual flowchart)
- Escalation path visualization
- Evidence attachment guide
- RCA template list from `rca_templates` table

**Route addition** in `App.tsx`:
```typescript
<Route path="/runbooks" element={<ProtectedRoute><Runbooks /></ProtectedRoute>} />
```

---

### Phase 10: Create Predictive Dashboard Component

**New File**: `src/components/dashboard/PredictiveRiskPanel.tsx`

**Purpose**: Display predictive governance insights

**Features**:
- High-risk predictions list
- Risk trend indicators
- Prediction type distribution
- "Run Analysis" button (calls `predictive-governance`)

**Integration**: Add to Index.tsx dashboard

---

## File Changes Summary

### Modified Files (9)
| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | +SimulationController, +PredictiveRiskPanel, +events subscription |
| `src/pages/HITL.tsx` | +Tabs, +BulkTriagePanel integration |
| `src/pages/Incidents.tsx` | +Tabs, +BulkResolutionPanel integration |
| `src/pages/Observability.tsx` | +Oversight Agent tab, +events metrics |
| `src/pages/Settings.tsx` | +Configuration tab with platform_config editor |
| `src/pages/GoldenDemoV2.tsx` | +Enhanced demo steps, +scenario selector |
| `src/components/layout/Sidebar.tsx` | +Oversight Agent link, +Configuration link |
| `src/App.tsx` | +Configuration route, +Runbooks route |
| `supabase/config.toml` | Already updated with all functions |

### New Files (3)
| File | Purpose |
|------|---------|
| `src/pages/Configuration.tsx` | Platform configuration management |
| `src/pages/Runbooks.tsx` | Incident response guides |
| `src/components/dashboard/PredictiveRiskPanel.tsx` | Predictive governance display |

---

## Technical Implementation Details

### Index.tsx Changes

```typescript
// New state for events count
const { data: eventsCount } = useQuery({
  queryKey: ['events-raw-count'],
  queryFn: async () => {
    const { count } = await supabase
      .from('events_raw')
      .select('*', { count: 'exact', head: true });
    return count || 0;
  },
});

// New realtime subscription
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events_raw' }, () => {
  queryClient.invalidateQueries({ queryKey: ['events-raw-count'] });
})

// New section in JSX
<div className="mb-6">
  <h2 className="text-lg font-semibold mb-4">Oversight Agent</h2>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <SimulationController />
    <PredictiveRiskPanel />
  </div>
</div>
```

### HITL.tsx Changes

```typescript
// Replace main content with tabs
<Tabs defaultValue="queue" className="w-full">
  <TabsList className="mb-4">
    <TabsTrigger value="queue">Review Queue</TabsTrigger>
    <TabsTrigger value="bulk">Bulk Triage</TabsTrigger>
  </TabsList>
  
  <TabsContent value="queue">
    {/* Existing review queue content */}
  </TabsContent>
  
  <TabsContent value="bulk">
    <BulkTriagePanel onComplete={() => { refetch(); refetchStats(); }} />
  </TabsContent>
</Tabs>
```

### Incidents.tsx Changes

```typescript
// Add tabs wrapper
<Tabs defaultValue="list" className="w-full">
  <TabsList className="mb-4">
    <TabsTrigger value="list">Incident List</TabsTrigger>
    <TabsTrigger value="bulk">Bulk Resolution</TabsTrigger>
  </TabsList>
  
  <TabsContent value="list">
    {/* Existing incident list */}
  </TabsContent>
  
  <TabsContent value="bulk">
    <BulkResolutionPanel onComplete={() => queryClient.invalidateQueries({ queryKey: ['incidents'] })} />
  </TabsContent>
</Tabs>
```

---

## Database Queries for New Features

### Events Count Query
```sql
SELECT COUNT(*) FROM events_raw WHERE processed = false;
```

### High-Risk Predictions Query
```sql
SELECT * FROM predictive_governance 
WHERE risk_score >= 70 
ORDER BY risk_score DESC 
LIMIT 5;
```

### RCA Templates Query
```sql
SELECT * FROM rca_templates ORDER BY incident_type;
```

### Platform Config Query
```sql
SELECT * FROM platform_config ORDER BY category, config_key;
```

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| SimulationController visible on Index | No | Yes |
| BulkTriagePanel integrated in HITL | No | Yes |
| BulkResolutionPanel integrated in Incidents | No | Yes |
| Predictive Risk Panel visible | No | Yes |
| Configuration page accessible | No | Yes |
| Runbooks page accessible | No | Yes |
| All Edge Functions callable from UI | 50% | 100% |
| Real-time events_raw subscription | No | Yes |

---

## Implementation Order

1. **Index.tsx** - Add SimulationController + PredictiveRiskPanel
2. **HITL.tsx** - Add Tabs + BulkTriagePanel
3. **Incidents.tsx** - Add Tabs + BulkResolutionPanel
4. **Observability.tsx** - Add Oversight Agent tab
5. **PredictiveRiskPanel.tsx** - Create new component
6. **Configuration.tsx** - Create new page
7. **Runbooks.tsx** - Create new page
8. **Sidebar.tsx** - Add new navigation links
9. **App.tsx** - Add new routes
10. **Settings.tsx** - Add Configuration tab
