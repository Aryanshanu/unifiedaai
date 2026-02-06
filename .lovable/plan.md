

# PDR Implementation Completion Plan
## Completing the End-to-End Data Governance Pipeline

---

## Current State Assessment

After thorough codebase exploration, here is what has been implemented vs. what remains:

### Already Implemented (Foundation Ready)

| Feature | Status | Location |
|---------|--------|----------|
| Freshness Tracking | Done | `FreshnessIndicator.tsx`, DB migration with `last_data_update`, `staleness_status` |
| Quality Scorecards | Done | `DQScorecard.tsx` with 6 dimensions and trends |
| Anomaly Detection Edge Function | Done | `supabase/functions/dq-detect-anomalies/index.ts` |
| Dataset Quality Gate | Done | `DatasetQualityGate.tsx` with blocking thresholds |
| Transformation Lineage | Done | `TransformationLineage.tsx`, `data_transformations` table |
| Training Data Lineage | Done | `TrainingDataLineage.tsx` for model-to-data tracing |
| Data Drift Alerts | Done | `data_drift_alerts` table, `useDataDrift.ts` hooks |
| Anomalies Table | Done | `dataset_anomalies` table |
| Policy Violation Handler | Done | `supabase/functions/policy-violation-handler/index.ts` |
| Audit Center | Done | `AuditCenter.tsx` with 5 tabs |
| Model Registration Traceability | Done | Training dataset link, risk classification, limitations fields |
| Bias Scan | Done | `DatasetBiasScan.tsx` persisting to `dataset_bias_reports` |

### Remaining Integration Work

| Gap | Priority | Description |
|-----|----------|-------------|
| Quality Gate in Approval Flow | Critical | `ReadyDatasetsList.tsx` needs to call `DatasetQualityGate` before allowing approval |
| Model Registration Validation | Critical | Block model registration if training dataset not AI-approved |
| Data Drift UI Integration | High | Add drift alerts display to DataQualityEngine tabs |
| Anomalies Display | High | Show detected anomalies in DQ Engine UI |
| Freshness Indicator Integration | Medium | Add to dataset list views |
| Lineage Visualization | Medium | Add lineage view to Model Detail page |
| Observability Data Drift Tab | Medium | Connect `useDataDrift` hooks to Observability page |
| Scorecard Export | Medium | Wire DQScorecard export buttons to generate PDF/JSON |

---

## Implementation Plan

### Phase 1: Critical Quality Gate Enforcement (Blocks Approval Without Quality)

#### 1.1 Integrate Quality Gate into Dataset Approval Workflow

**File:** `src/components/data/ReadyDatasetsList.tsx`

**Changes:**
1. Import `DatasetQualityGate` component
2. Add quality gate check before showing Approve button
3. Show blocking reasons when quality gates fail

```typescript
// Add state for quality gate
const [selectedDatasetForGate, setSelectedDatasetForGate] = useState<string | null>(null);
const [gatesPassed, setGatesPassed] = useState<Record<string, boolean>>({});

// Before approve button, add quality gate display
{dataset.ai_approval_status === "pending" && (
  <div className="space-y-3">
    <DatasetQualityGate 
      datasetId={dataset.id}
      onApprovalReady={(ready) => setGatesPassed(prev => ({...prev, [dataset.id]: ready}))}
      showActions={false}
    />
    {gatesPassed[dataset.id] ? (
      <Button onClick={() => approveDataset.mutate(dataset.id)}>
        <CheckCircle className="h-4 w-4 mr-1" />
        Approve for AI
      </Button>
    ) : (
      <div className="text-sm text-destructive">
        Quality gates must pass before approval
      </div>
    )}
  </div>
)}
```

#### 1.2 Model Registration: Block if Training Dataset Not Approved

**File:** `src/components/models/ModelRegistrationForm.tsx`

**Changes:**
1. Fetch dataset quality scores when training dataset selected
2. Show warning if dataset quality is below 70%
3. Block submission if dataset is not AI-approved

```typescript
// Add query for selected dataset quality
const { data: selectedDatasetQuality } = useQuery({
  queryKey: ["dataset-quality-for-model", formValues.training_dataset_id],
  queryFn: async () => {
    if (!formValues.training_dataset_id) return null;
    const { data } = await supabase
      .from("datasets")
      .select("ai_approval_status, dimension_scores")
      .eq("id", formValues.training_dataset_id)
      .single();
    return data;
  },
  enabled: !!formValues.training_dataset_id,
});

// In onSubmit, add validation
if (data.training_dataset_id) {
  if (selectedDatasetQuality?.ai_approval_status !== 'approved') {
    toast.error("Training dataset must be AI-approved");
    return;
  }
}

// Add warning banner in governance step
{selectedDatasetQuality && selectedDatasetQuality.ai_approval_status !== 'approved' && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Dataset Not Approved</AlertTitle>
    <AlertDescription>
      Selected training dataset is not AI-approved. Model cannot be registered until dataset passes quality gates.
    </AlertDescription>
  </Alert>
)}
```

---

### Phase 2: Data Drift & Anomalies UI Integration

#### 2.1 Add Drift & Anomalies Tab to Data Quality Engine

**File:** `src/pages/engines/DataQualityEngine.tsx`

**Changes:**
1. Add new tab "Monitoring" after "Bias Scan"
2. Create `DQMonitoringTab` component that displays:
   - Data drift alerts from `useDataDriftAlerts`
   - Anomalies from `useDatasetAnomalies`
   - Resolve/acknowledge actions

```typescript
// New tab in TabsList
<TabsTrigger value="monitoring" className="flex items-center gap-2">
  <TrendingUp className="h-4 w-4" />
  Monitoring
</TabsTrigger>

// New TabsContent
<TabsContent value="monitoring" className="mt-6">
  <DQMonitoringTab datasetId={selectedDataset} />
</TabsContent>
```

**New Component:** `src/components/engines/DQMonitoringTab.tsx`

```typescript
// Shows:
// - Data drift alerts table with severity, column, drift value
// - Anomalies table with type, detected value, severity
// - Resolve/Acknowledge buttons
// - Stats cards: Open Alerts, Critical, Resolved Today
```

#### 2.2 Connect Data Drift to Observability Page

**File:** `src/pages/Observability.tsx`

**Changes:**
1. Import `useDataDriftAlerts`, `useDataDriftStats` from `useDataDrift.ts`
2. Add data drift section to the drift tab
3. Show both model drift (existing) and data drift (new) in unified view

```typescript
// In the 'drift' tab
{activeTab === 'drift' && (
  <div className="space-y-6">
    <DriftDetector /> {/* Existing model drift */}
    <DataDriftMonitor /> {/* New data drift component */}
  </div>
)}
```

---

### Phase 3: Freshness Indicator Integration

#### 3.1 Add Freshness to Dataset Lists

**File:** `src/components/data/ReadyDatasetsList.tsx`

**Changes:**
1. Import `FreshnessIndicator`
2. Add freshness column to the table

```typescript
// Add column header
<th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Freshness</th>

// Add column cell
<td className="p-4 text-center">
  <FreshnessIndicator 
    lastUpdate={dataset.last_data_update} 
    thresholdDays={dataset.freshness_threshold_days || 7}
  />
</td>
```

#### 3.2 Add Freshness to DQ Dashboard

**File:** `src/components/engines/DQStreamingDashboard.tsx`

Add freshness status card to the streaming dashboard showing dataset recency.

---

### Phase 4: Lineage Visualization in Model Detail

#### 4.1 Add Training Data Tab to Model/System Detail Page

**File:** `src/pages/ModelDetail.tsx` (or `SystemDetail.tsx`)

**Changes:**
1. Add new "Training Data" tab
2. Include `TrainingDataLineage` component
3. Show dataset quality scores at training time
4. Link to bias report if available

```typescript
// New tab
<TabsTrigger value="training-data">
  <Database className="h-4 w-4 mr-2" />
  Training Data
</TabsTrigger>

// Tab content
<TabsContent value="training-data">
  {model?.training_dataset_id ? (
    <TrainingDataLineage datasetId={model.training_dataset_id} />
  ) : (
    <EmptyState 
      title="No Training Data Linked"
      description="This model was registered without a training dataset reference"
    />
  )}
</TabsContent>
```

---

### Phase 5: Enhanced Regulatory Reporting

#### 5.1 Add Data Governance to Audit Reports

**File:** `src/pages/AuditCenter.tsx` (already has ReportsTab)

**Changes:**
1. Enhance report generation to include:
   - Dataset quality history
   - Bias scan results
   - Transformation lineage
   - Data drift alerts
2. Add new report template: "Data Governance Audit"

```typescript
// In generateReport function, add data governance section
const dataGovernanceSection = {
  datasets_audited: qualityRuns?.length || 0,
  ai_approved_datasets: approvedDatasets?.length || 0,
  bias_scans_performed: biasReports?.length || 0,
  data_drift_alerts: driftAlerts?.filter(a => a.status !== 'resolved').length || 0,
  quality_coverage: qualityRuns?.filter(r => r.verdict === 'PASS').length / qualityRuns?.length * 100
};
```

---

### Phase 6: End-to-End Flow Verification

#### 6.1 Create Governance Health Check

**New Component:** `src/components/dashboard/GovernanceHealthCheck.tsx`

Shows a checklist of governance pipeline status:
- Data Sources Connected
- Quality Gates Passing
- Datasets Approved
- Models Traceable
- Drift Detection Active
- Audit Trail Intact

This becomes a quick "health check" button on the main dashboard.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/data/ReadyDatasetsList.tsx` | Add quality gate check before approval, add freshness column |
| `src/components/models/ModelRegistrationForm.tsx` | Add training dataset validation warning |
| `src/pages/engines/DataQualityEngine.tsx` | Add Monitoring tab |
| `src/pages/Observability.tsx` | Add data drift section to drift tab |
| `src/pages/ModelDetail.tsx` or `src/pages/SystemDetail.tsx` | Add Training Data tab with lineage |
| `src/pages/AuditCenter.tsx` | Enhance report generation |

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/engines/DQMonitoringTab.tsx` | Data drift & anomalies monitoring UI |
| `src/components/observability/DataDriftMonitor.tsx` | Data drift alerts display for Observability |
| `src/components/dashboard/GovernanceHealthCheck.tsx` | Pipeline health verification |

---

## Implementation Sequence

1. **Phase 1 (Critical)**: Quality gate enforcement in approval + model registration validation
2. **Phase 2 (High)**: Data drift & anomalies UI integration
3. **Phase 3 (Medium)**: Freshness indicator in lists
4. **Phase 4 (Medium)**: Training data lineage in model detail
5. **Phase 5 (Medium)**: Enhanced audit reporting
6. **Phase 6 (Low)**: Governance health check dashboard

---

## Acceptance Criteria

- [ ] Cannot approve dataset if quality gate fails (Completeness < 95%, Bias < 70%, Critical Anomalies > 0)
- [ ] Cannot register model if training dataset is not AI-approved
- [ ] Data drift alerts visible in DQ Engine Monitoring tab
- [ ] Anomalies displayed with resolve actions
- [ ] Freshness indicator shows stale/warning/fresh status on dataset lists
- [ ] Model detail page shows full training data lineage
- [ ] Audit reports include data governance section
- [ ] End-to-end flow: Upload → Profile → Quality Gate → Approve → Register Model → Monitor Drift works without errors

---

## Success Metrics (from PDR)

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Governance Health | >50% | Dashboard gauge shows green |
| Incidents Reduced | -50% | Compare incident count before/after |
| Harmful Outcomes | <10% | Decision ledger outcomes tracking |
| End-to-End Test | Pass | Upload 1 dataset → register model → detect drift |

