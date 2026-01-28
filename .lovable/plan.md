
# Complete 6-Stage RAI Governance Pipeline Implementation

## Executive Summary

This plan implements the complete 6-stage Responsible AI governance pipeline in a single autonomous session, covering all phases from Day 1 to Day 6 as specified.

---

## Current State Analysis (Evidence-Based)

### Database Status
| Asset | Count | Status |
|-------|-------|--------|
| Database Tables | 88 | Fully operational |
| DQ Profiles | 57 | Active |
| DQ Executions | 51 | Active |
| Evaluation Runs | 14 | Mixed (4 fairness, 4 hallucination, 3 toxicity, 2 privacy, 1 explainability) |
| Models | 3 | All missing training_dataset_id and risk_classification |
| Datasets (AI-Approved) | 0 | Critical gap |
| Open Incidents | 218 | 151 critical, 46 investigating |
| Attack Library | 50 | Seeded |
| OWASP Test Cases | 37 | Seeded |

### Governance Activation State (CRITICAL BLOCKER)
All 11 governance capabilities are currently set to `inactive`:
- appeals, data_contracts, data_drift, data_quality, decision_explanation
- decision_logging, deployment_gating, harm_classification
- mlops_attestation, model_evaluation, outcome_tracking

**Result**: 0% Governance Coverage

### Files with Math.random() (Simulation Artifacts)
Found in 19 files - primary concerns:
- `supabase/functions/generate-scorecard/index.ts` (fake signature)
- `supabase/functions/generate-test-traffic/index.ts` (test data generation - acceptable)
- Various UI components need verification

### GovernanceFlowDiagram Status
Currently using hardcoded `defaultStages` with static values - not connected to database

---

## Implementation Plan: Day 1 to Day 6

---

## Day 1: Critical Bug Fixes & Foundation

### 1.1 Fix Governance Activation State
**Action**: Update all 11 capabilities from `inactive` to `enforced`

```sql
UPDATE governance_activation_state 
SET status = 'enforced', 
    activated_at = now(), 
    notes = 'Activated via 6-stage pipeline implementation'
WHERE status = 'inactive';
```

### 1.2 Fix GovernanceFlowDiagram (Dynamic Data)
**File**: `src/components/dashboard/GovernanceFlowDiagram.tsx`

Replace hardcoded `defaultStages` with real database queries:
- Stage 1 (Ingestion): Count from `data_sources` + `data_uploads`
- Stage 2 (Quality): Latest quality score from `dq_profiles`
- Stage 3 (AI Readiness): Count from `datasets` where `ai_approval_status = 'approved'`
- Stage 4 (Development): Count from `models`
- Stage 5 (RAI Controls): Count from `evaluation_runs`
- Stage 6 (Monitoring): Count from `incidents` where `status = 'open'`

### 1.3 Add Incidents Summary Card to Command Center
**File**: `src/pages/Index.tsx`

Add a prominent card showing:
- Total open incidents: 218
- Critical: 151 | High: 18 | Medium: 3
- Quick link to /incidents

### 1.4 Fix DQ Pipeline Instant Refresh
**File**: `src/hooks/useDQControlPlane.ts`

The code already has the fix at lines 445-478 - verify it's working by:
- Adding explicit `queryClient.invalidateQueries()` calls after success
- Adding a refresh key state to force re-render

---

## Day 2: Stage 2 - Data Quality Enhancements

### 2.1 Add CDE Tagging UI
**File**: `src/components/engines/DQRulesUnified.tsx`

Add toggle column for "Critical Data Element" that updates `dq_rules.is_critical_element`

### 2.2 Add Business Impact Badges
**File**: `src/components/engines/DQProfilingReportTabular.tsx`

Display impact badges (High/Medium/Low) next to columns based on:
- Auto-detection from column names (id, email, ssn = High)
- Manual override stored in `dq_rules.business_impact`

### 2.3 Create DQQualityScorecard Component
**New File**: Already exists at `src/components/engines/DQQualityScorecard.tsx`

Enhance to:
- Connect to real profiling data
- Show trend arrows comparing current vs previous run
- Add 6-dimension breakdown with progress bars

### 2.4 Add Freshness Alerting
**File**: `src/hooks/useDQControlPlane.ts`

Add freshness check after profile fetch:
```typescript
const dataAge = differenceInDays(new Date(), new Date(profile.profile_ts));
if (dataAge > dataset.freshness_threshold_days) {
  toast.warning(`Data is ${dataAge} days old`);
}
```

---

## Day 3: Stage 3 - AI Readiness

### 3.1 Implement "Approve for AI" Workflow
**File**: `src/components/data/ReadyDatasetsList.tsx`

Add button that:
1. Creates entry in `review_queue` with type = 'dataset_approval'
2. Updates `datasets.ai_approval_status` to 'pending'
3. Routes high-impact datasets to HITL Console

### 3.2 Create Dataset Versioning
**File**: `src/components/data/ReadyDatasetsList.tsx`

On approval:
1. Insert into `dataset_snapshots` table
2. Increment `datasets.version`
3. Show version history in detail view

### 3.3 Connect Lineage View
**File**: `src/components/data/ReadyDatasetsList.tsx`

Add "View Lineage" button that:
- Navigates to `/lineage?dataset={id}`
- Shows transformations from `data_lineage` table

### 3.4 Real Bias Scan Integration
**File**: `src/components/engines/DatasetBiasScan.tsx`

Already fixed to use real profiling data - verify:
- Computes `demographic_skew` from column uniqueness
- Computes `class_imbalance` from distinct counts
- Stores results in `dataset_bias_reports` table

---

## Day 4: Stage 4 & 5 - AI Development & RAI Controls

### 4.1 Enforce Training Dataset Traceability
**File**: `src/components/models/ModelRegistrationForm.tsx`

Add validation:
```typescript
// In Step 5 (Governance)
{!formValues.training_dataset_id && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Linking to an AI-approved dataset is strongly recommended for traceability
    </AlertDescription>
  </Alert>
)}
```

### 4.2 Add Dataset Quality Warning
**File**: `src/components/models/ModelRegistrationForm.tsx`

When training dataset selected, check its quality score:
```typescript
const { data: qualityRuns } = useQuery({
  queryKey: ["dataset-quality", formValues.training_dataset_id],
  queryFn: async () => {
    const { data } = await supabase
      .from("dq_profiles")
      .select("dimension_scores")
      .eq("dataset_id", formValues.training_dataset_id)
      .order("profile_ts", { ascending: false })
      .limit(1);
    return data?.[0];
  },
  enabled: !!formValues.training_dataset_id,
});

// If overall score < 70%, show warning
```

### 4.3 Implement Deployment Gates
**File**: `src/pages/Models.tsx`

Add `canDeploy` logic:
```typescript
const requiredEngines = ['fairness', 'hallucination', 'toxicity', 'privacy', 'explainability'];

const canDeploy = useMemo(() => {
  const hasAllEngineRuns = requiredEngines.every(e => 
    evaluationRuns.some(r => r.engine_type === e && r.model_id === model.id)
  );
  const noCriticalIncidents = incidents.filter(i => 
    i.model_id === model.id && i.severity === 'critical' && i.status === 'open'
  ).length === 0;
  
  return hasAllEngineRuns && noCriticalIncidents;
}, [evaluationRuns, incidents, model.id]);
```

### 4.4 Add Risk Classification Auto-Calculation
**File**: `src/components/models/ModelRegistrationForm.tsx`

Add EU AI Act risk tier calculation:
```typescript
function calculateRiskTier(model, dataset, scores) {
  let riskScore = 0;
  if (model.model_type === 'LLM') riskScore += 30;
  if (dataset?.sensitivity_level === 'high') riskScore += 25;
  if (scores?.fairness < 70) riskScore += 20;
  if (scores?.toxicity < 70) riskScore += 25;
  
  if (riskScore >= 80) return 'unacceptable';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 30) return 'limited';
  return 'minimal';
}
```

### 4.5 Create "Run All Engines" Button
**File**: `src/pages/ModelDetail.tsx`

Add button that sequentially calls all 5 RAI engines:
```typescript
const runAllEngines = async () => {
  const engines = ['fairness', 'hallucination', 'toxicity', 'privacy', 'explainability'];
  for (const engine of engines) {
    await supabase.functions.invoke(`eval-${engine}-hf`, {
      body: { model_id: modelId }
    });
  }
  toast.success("All RAI engines completed");
};
```

---

## Day 5: Stage 6 - Continuous Monitoring & Feedback

### 5.1 Enhanced Incident Summary
**File**: `src/pages/Index.tsx`

Add comprehensive incident card:
```typescript
<Card className="border-destructive/50 bg-destructive/5">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <AlertTriangle className="h-5 w-5 text-destructive" />
      Open Incidents: {incidents.total}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-3 gap-4">
      <div>Critical: {incidents.critical}</div>
      <div>High: {incidents.high}</div>
      <div>Medium: {incidents.medium}</div>
    </div>
    <Button onClick={() => navigate("/incidents")}>View All</Button>
  </CardContent>
</Card>
```

### 5.2 Drift Detection Dashboard Integration
**File**: `src/pages/Observability.tsx`

Add drift graph showing:
- Recent drift alerts from `drift_alerts` table
- Trend line over last 7 days
- Auto-refresh via Supabase Realtime

### 5.3 Policy Violation Count on Models
**File**: `src/components/dashboard/ModelCard.tsx`

Add badge showing policy violation count:
```typescript
const { data: violations } = useQuery({
  queryKey: ["model-violations", model.id],
  queryFn: async () => {
    const { count } = await supabase
      .from("policy_violations")
      .select("id", { count: "exact", head: true })
      .eq("model_id", model.id);
    return count || 0;
  },
});
```

### 5.4 Feedback Loop Visualization
**New File**: `src/components/monitoring/FeedbackLoopDiagram.tsx`

Create visual flow:
```
Issue Detected → Action Taken → Improvement Verified
     ↓                ↓                ↓
  Incident      HITL Review      Re-profile/Retrain
```

---

## Day 6: UI Polish, Testing & Integration

### 6.1 Fix Sidebar Layout Synchronization
**Already implemented** via `SidebarContext.tsx` - verify it's working

### 6.2 Real-Time Updates
**File**: `src/pages/Index.tsx`

Add Supabase Realtime subscriptions for:
- `incidents` table (INSERT → show toast)
- `evaluation_runs` table (INSERT → update metrics)
- `dq_profiles` table (INSERT → update DQ status)

### 6.3 Chatbot Context Mode Toggle
**File**: `src/components/engines/DQChatPanel.tsx`

Add toggle:
```typescript
const [contextMode, setContextMode] = useState<'dataset' | 'general'>('dataset');

// In header
<div className="flex items-center gap-2">
  <Badge variant={contextMode === 'dataset' ? 'default' : 'outline'}>
    {contextMode === 'dataset' ? 'Dataset Context' : 'General'}
  </Badge>
  <Switch 
    checked={contextMode === 'dataset'} 
    onCheckedChange={() => setContextMode(m => m === 'dataset' ? 'general' : 'dataset')} 
  />
</div>
```

### 6.4 Remove UI Overlaps
Review and fix z-index conflicts in:
- `MainLayout.tsx` (sidebar padding sync)
- `DQChatPanel.tsx` (floating position)
- `GovernanceFlowDiagram.tsx` (stage number badges)

### 6.5 End-to-End Testing
Run complete flow:
1. Upload dataset → DQ Profile → Quality Score
2. Approve for AI → Create Snapshot
3. Register Model (linked to dataset)
4. Run All RAI Engines
5. Check Governance Health metrics
6. Verify Incident Summary updates

---

## Database Migrations Required

```sql
-- Activate all governance capabilities
UPDATE governance_activation_state 
SET status = 'enforced', 
    activated_at = now(),
    notes = 'Activated via 6-stage pipeline implementation'
WHERE status = 'inactive';

-- Add scan_timestamp to dataset_bias_reports if missing
ALTER TABLE dataset_bias_reports 
ADD COLUMN IF NOT EXISTS scan_timestamp TIMESTAMPTZ DEFAULT now();

-- Create index for faster incident queries
CREATE INDEX IF NOT EXISTS idx_incidents_severity_status 
ON incidents(severity, status) WHERE status != 'resolved';
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/IncidentSummaryCard.tsx` | Incident breakdown card for Command Center |
| `src/components/monitoring/FeedbackLoopDiagram.tsx` | Stage 6 feedback visualization |
| `src/hooks/useGovernanceFlowMetrics.ts` | Real data for 6-stage diagram |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/GovernanceFlowDiagram.tsx` | Connect to real database metrics |
| `src/pages/Index.tsx` | Add incident summary card |
| `src/components/engines/DQRulesUnified.tsx` | Add CDE toggle column |
| `src/components/data/ReadyDatasetsList.tsx` | Add "Approve for AI" workflow |
| `src/components/models/ModelRegistrationForm.tsx` | Add quality warnings, risk calculation |
| `src/pages/Models.tsx` | Add deployment gate logic |
| `src/components/engines/DQChatPanel.tsx` | Add context mode toggle |
| `src/hooks/useGovernanceMetrics.ts` | Optimize queries |

---

## Success Metrics (Targets)

After implementation:
| Metric | Before | Target |
|--------|--------|--------|
| Governance Coverage | 0% | 100% (all 11 enforced) |
| Open Incidents Displayed | Hidden | Visible with severity breakdown |
| AI-Approved Datasets | 0 | Enable workflow |
| Model-Dataset Traceability | 0/3 | 3/3 linked |
| GovernanceFlowDiagram | Static | Dynamic (real data) |
| Math.random() in UI | Present | Removed or justified |
| Chatbot Context Toggle | Missing | Implemented |
| Deployment Gates | None | Enforced |

---

## Implementation Order (Sequential)

1. **Database**: Activate governance capabilities
2. **GovernanceFlowDiagram**: Connect to real metrics
3. **Index.tsx**: Add incident summary
4. **DQ Engine**: CDE tagging, business impact badges
5. **ReadyDatasetsList**: Approve for AI workflow
6. **ModelRegistrationForm**: Traceability + quality warnings
7. **Models.tsx**: Deployment gates
8. **DQChatPanel**: Context mode toggle
9. **Testing**: End-to-end validation
