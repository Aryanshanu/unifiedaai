

# 6-Stage Responsible AI Governance Pipeline - Implementation Plan

## Executive Summary

This plan transforms the Fractal Unified Governance platform into a complete end-to-end RAI pipeline spanning six stages: Data Ingestion, Data Quality, AI Readiness, AI Development, RAI Controls, and Continuous Monitoring. The implementation prioritizes fixing existing bugs first, then incrementally enhancing each stage while ensuring all data is real, transparent, and derived from actual computations.

---

## Current State Analysis

Based on exploration:
- **Open Incidents**: 164 (main) + 67 (DQ-specific)
- **Datasets**: 15 total, with 57 profiling runs and 51 executions
- **Models**: 3 registered
- **Governance Health**: 0% (Early Stage) - many targets unmet
- **Harmful Outcome Rate**: 40% (target <1%)

Key bugs identified in Data Quality Engine:
- Results not loading instantly after pipeline run (requires dataset switching)
- Empty quality dimensions in some cases
- UI lags/overlaps in profiling report
- Simulated values in DatasetBiasScan (uses Math.random for scores)

---

## Phase 1: Critical Bug Fixes (Priority)

### 1.1 Force Instant Results Refresh

**Problem**: After running DQ pipeline, users must switch datasets to see results.

**Files to modify**:
- `src/hooks/useDQControlPlane.ts` (lines 445-478)
- `src/pages/engines/DataQualityEngine.tsx` (ControlPlaneTab)

**Fix**:
```typescript
// After pipeline success, trigger queryClient invalidation
queryClient.invalidateQueries({ queryKey: ['datasets'] });
queryClient.invalidateQueries({ queryKey: ['dq-profiles'] });
// Add force re-render via key change or state toggle
```

### 1.2 Ensure All 6 Dimensions Always Computed

**Problem**: Some dimensions show "N/A" even when data exists.

**Files to modify**:
- `supabase/functions/dq-profile-dataset/index.ts`
- `src/components/engines/DQProfilingReportTabular.tsx`

**Fix**:
- Ensure backend computes Completeness, Uniqueness, Validity, Timeliness for every profile
- For Accuracy and Consistency, show explicit reasoning: "Requires ground truth data"

### 1.3 Remove All Math.random() in DQ Components

**Files to modify**:
- `src/components/engines/DatasetBiasScan.tsx` (lines 65-105) - uses random scores
- `src/components/engines/DQStreamingDashboard.tsx` - already fixed per memory

**Fix**: Replace simulated bias report with actual backend call or show "Run scan to see results".

### 1.4 Add Error Rate Formula Transparency

Already implemented via `ErrorRateExplanation.tsx`. Ensure consistent usage:
- Add `PrimaryKeyExplanation` component showing: "Column X is primary key because: 100% unique, 0 nulls"

---

## Phase 2: Stage 1 - Data Ingestion & Creation

### 2.1 Enhance DataSourceConnectors Component

**Current state**: Basic CRUD exists in `src/components/data/DataSourceConnectors.tsx`.

**Enhancements needed**:

| Feature | Implementation |
|---------|----------------|
| Support structured/semi-structured/unstructured | Add file type detection in DQFileUploader |
| Metadata capture at ingestion | Store source, timestamp, owner in `data_sources` table |
| Schema validation | Add JSON Schema validation in edge function |
| Size limits | Enforce 500MB limit per upload (already implemented) |

**New components to create**:
- `src/components/data/IngestDataButton.tsx` - Quick action button for DQ Engine tab

**Database changes**:
- Add `schema_hash`, `file_type`, `malware_scanned` columns to `data_uploads` table

### 2.2 Create "Ingest Data" Quick Action

Add prominent button in Data Quality Engine header:
```typescript
<Button onClick={openIngestDialog}>
  <Upload className="mr-2" />
  Ingest Data
</Button>
```

---

## Phase 3: Stage 2 - Data Quality & Trust Foundation (Major Enhancements)

### 3.1 Critical Data Elements (CDE) Tagging

**Database migration**:
```sql
ALTER TABLE dq_rules ADD COLUMN is_critical_element BOOLEAN DEFAULT false;
ALTER TABLE dq_profiles ADD COLUMN critical_columns TEXT[];
```

**UI changes**:
- Add toggle in `DQRulesUnified.tsx` for each rule: "Mark as CDE"
- Auto-suggest CDEs based on column names (id, email, ssn, account_number)

### 3.2 Business Impact Tagging

**Database migration**:
```sql
ALTER TABLE datasets ADD COLUMN business_impact TEXT CHECK (business_impact IN ('high', 'medium', 'low'));
ALTER TABLE dq_rules ADD COLUMN business_impact TEXT;
```

**UI changes**:
- Add impact selector in dataset creation flow
- Display impact badges on dashboard

### 3.3 Enhanced Dashboard Visualizations

**New components**:
- `src/components/engines/DQQualityScorecard.tsx` - Power BI-style scorecard
  - Overall quality % with large gauge
  - Per-dimension breakdown with progress bars
  - Trend arrows comparing to previous run

**Charts to add** (use Recharts):
- Dimension scores bar chart (already in DQStreamingDashboard)
- Pass/fail pie chart
- Quality trend line chart (last 10 runs)

### 3.4 Freshness Monitoring

**Implementation**:
- Add `freshness_threshold_days` column to datasets
- Create `dq-check-freshness` edge function that runs daily
- If data older than threshold, create alert/incident

```typescript
// In dq-control-plane, add freshness check
const dataAge = differenceInDays(new Date(), lastIngestionDate);
if (dataAge > freshnessThreshold) {
  await createIncident({
    type: 'data_freshness',
    severity: 'P1',
    message: `Data is ${dataAge} days old (threshold: ${freshnessThreshold})`
  });
}
```

---

## Phase 4: Stage 3 - Data Readiness for AI

### 4.1 Lineage Tracking

**Current state**: KG exists but not connected to data transformations.

**Implementation**:
- Create `data_lineage` table:
```sql
CREATE TABLE data_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dataset_id UUID REFERENCES datasets(id),
  target_dataset_id UUID REFERENCES datasets(id),
  transformation_type TEXT NOT NULL,
  transformation_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- Add "View Lineage" button in ReadyDatasetsList that opens Knowledge Graph filtered to dataset

### 4.2 Pre-AI Bias Checks

**Current state**: `DatasetBiasScan.tsx` exists but uses simulated data.

**Fix**:
- Create `dq-bias-scan` edge function that:
  - Analyzes demographic columns for skew
  - Calculates class imbalance ratios
  - Detects missing value patterns (MCAR, MAR, MNAR)
- Store results in `dataset_bias_reports` table
- Display real computed values instead of Math.random()

### 4.3 Approval Workflow

**Current state**: `ReadyDatasetsList.tsx` has approve/reject but minimal workflow.

**Enhancements**:
- Add "Request Approval" button that creates entry in `review_queue`
- Route to HITL Console for high-impact datasets
- Track approval history in `dataset_approval_history` table

### 4.4 Dataset Versioning

**Implementation**:
- Add `version` column to datasets (already exists)
- Create snapshot on approval: `dataset_snapshots` table
- Show version history in dataset detail view

---

## Phase 5: Stage 4 - AI Development & Deployment

### 5.1 Enhanced Model Registration

**Current state**: `ModelRegistrationForm.tsx` already includes training_dataset_id, limitations, intended_use, risk_classification.

**Enhancements needed**:
- Make `training_dataset_id` dropdown show only AI-approved datasets (already implemented)
- Add validation: Warn if linked dataset has quality score < 70%
- Display "Data Lineage" link on model card

### 5.2 Deployment Gates

**Implementation in `Models.tsx`**:
- Before allowing deployment, check:
  - All 5 RAI engines have been run (check evaluation_runs)
  - No critical incidents open for this model
  - Linked dataset is AI-approved

```typescript
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

### 5.3 Model Cards with Traceability

**New component**: `src/components/models/ModelCardExpanded.tsx`
- Display all metadata fields
- Show linked training dataset with quality score
- Show lineage graph preview
- List all evaluation results

---

## Phase 6: Stage 5 - Responsible AI Controls

### 6.1 Auto-Run RAI Engines

**Implementation**:
- Add "Run All Engines" button on model detail page
- Create `run-all-engines` edge function that sequentially calls:
  - eval-fairness
  - eval-hallucination
  - eval-toxicity
  - eval-privacy
  - eval-explainability

### 6.2 Risk Classification

**Current state**: `risk_classification` field exists in models.

**Enhancements**:
- Auto-calculate based on:
  - Model type (LLM = higher risk)
  - Use case (customer-facing = higher)
  - Dataset sensitivity level
  - Evaluation scores

```typescript
function calculateRiskTier(model, dataset, scores) {
  let riskScore = 0;
  if (model.model_type === 'LLM') riskScore += 30;
  if (dataset.sensitivity_level === 'high') riskScore += 25;
  if (scores.fairness < 70) riskScore += 20;
  if (scores.toxicity < 70) riskScore += 25;
  
  if (riskScore >= 80) return 'unacceptable';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 30) return 'limited';
  return 'minimal';
}
```

### 6.3 HITL Checkpoints

**Implementation**:
- High-risk models automatically create HITL review items
- Add checkpoint triggers in model deployment flow
- Display "Pending Human Review" badge on blocked models

---

## Phase 7: Stage 6 - Continuous Monitoring & Feedback

### 7.1 Drift Detection Integration

**Current state**: `detect-drift` edge function exists.

**Enhancements**:
- Schedule drift checks via pg_cron
- Create incidents automatically when drift detected
- Show drift graph on Observability dashboard

### 7.2 Policy Violations

**Current state**: Policy Studio exists.

**Integration**:
- Link policy violations to incidents
- Show violation count on model cards
- Add "Policy Violations" tab on model detail

### 7.3 Regulatory Reporting

**Enhancement to RegulatoryReportsContent.tsx**:
- Add EU AI Act report template
- Include all 6 stages in export
- Generate PDF with cryptographic hash

### 7.4 Feedback Loop Visualization

**New component**: `src/components/monitoring/FeedbackLoopDiagram.tsx`
- Visual flow: Issue Detected → Action Taken → Improvement Verified
- Show how incidents link back to data quality/model retraining

### 7.5 Fix 164 Open Incidents Display

**Issue**: Command Center shows 164 incidents but governance health is 0%.

**Fix**:
- Add "Open Incidents" card to Index.tsx
- Show count with severity breakdown
- Quick link to /incidents page

---

## Phase 8: Chatbot Toggle Enhancement

### 8.1 Context Mode Toggle

**Current state**: DQChatPanel exists but needs mode toggle.

**Implementation**:
```typescript
const [mode, setMode] = useState<'dataset' | 'general'>('dataset');

// In chat header
<div className="flex items-center gap-2">
  <Badge variant={mode === 'dataset' ? 'default' : 'outline'}>
    Dataset Context
  </Badge>
  <Switch checked={mode === 'dataset'} onCheckedChange={() => setMode(m => m === 'dataset' ? 'general' : 'dataset')} />
</div>
```

- When "Dataset Context" ON: Only answer from current pipeline data
- When "General": Answer conceptual governance questions

---

## Phase 9: UI Polish & Integration

### 9.1 Remove All UI Overlaps

- Review all components for z-index conflicts
- Ensure fixed position elements don't overlap
- Test sidebar collapsed/expanded states

### 9.2 Real-Time Updates

- Add Supabase Realtime subscriptions for:
  - Incidents table
  - DQ executions
  - Model evaluations
- Show toast notifications for new incidents

### 9.3 Stage Flow Visualization

**New component**: `src/components/dashboard/GovernanceFlowDiagram.tsx`
- 6-stage pipeline visualization
- Show completion status for each stage
- Clickable navigation to each stage's main page

---

## Database Migrations Required

```sql
-- Stage 1: Enhanced data ingestion
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS schema_hash TEXT;
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS malware_scanned BOOLEAN DEFAULT false;

-- Stage 2: CDE and business impact
ALTER TABLE dq_rules ADD COLUMN IF NOT EXISTS is_critical_element BOOLEAN DEFAULT false;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS freshness_threshold_days INTEGER DEFAULT 30;

-- Stage 3: Lineage tracking
CREATE TABLE IF NOT EXISTS data_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dataset_id UUID REFERENCES datasets(id),
  target_dataset_id UUID REFERENCES datasets(id),
  transformation_type TEXT NOT NULL,
  transformation_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stage 3: Bias reports persistence
CREATE TABLE IF NOT EXISTS dataset_bias_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  overall_bias_score NUMERIC,
  demographic_skew JSONB,
  class_imbalance JSONB,
  missing_patterns JSONB,
  recommendations TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_lineage_source ON data_lineage(source_dataset_id);
CREATE INDEX IF NOT EXISTS idx_bias_reports_dataset ON dataset_bias_reports(dataset_id);
```

---

## New Edge Functions Required

| Function | Purpose |
|----------|---------|
| `dq-bias-scan` | Real bias analysis for datasets |
| `dq-check-freshness` | Daily freshness monitoring |
| `run-all-engines` | Orchestrate all 5 RAI evaluations |
| `compute-risk-tier` | Auto-calculate EU AI Act risk classification |

---

## New Components Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| `IngestDataButton.tsx` | src/components/data/ | Quick ingest action |
| `DQQualityScorecard.tsx` | src/components/engines/ | Power BI-style scorecard |
| `PrimaryKeyExplanation.tsx` | src/components/engines/ | Transparent PK detection reasoning |
| `ModelCardExpanded.tsx` | src/components/models/ | Full model traceability view |
| `FeedbackLoopDiagram.tsx` | src/components/monitoring/ | Stage 6 visualization |
| `GovernanceFlowDiagram.tsx` | src/components/dashboard/ | 6-stage flow overview |

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `DataQualityEngine.tsx` | Add instant refresh, ingest button |
| `useDQControlPlane.ts` | Fix refresh after pipeline completion |
| `DatasetBiasScan.tsx` | Replace simulated data with real API call |
| `DQProfilingReportTabular.tsx` | Ensure all dimensions shown |
| `ReadyDatasetsList.tsx` | Add lineage link, approval workflow |
| `ModelRegistrationForm.tsx` | Add dataset quality validation |
| `Models.tsx` | Add deployment gate checks |
| `Index.tsx` | Add open incidents display |
| `GovernanceHealthCards.tsx` | Fix metrics display when data exists |

---

## Implementation Order

1. **Day 1**: Bug fixes (Phase 1) - instant refresh, remove Math.random
2. **Day 2**: Stage 2 enhancements - CDE tagging, business impact
3. **Day 3**: Stage 3 - Lineage tracking, real bias scan
4. **Day 4**: Stage 4 & 5 - Deployment gates, risk classification
5. **Day 5**: Stage 6 - Drift integration, feedback loop
6. **Day 6**: UI polish, testing, governance flow diagram

---

## Success Metrics

After implementation:
- Governance Coverage: 0% → 80%+
- Harmful Outcome Rate: 40% → <5%
- All 6 dimensions computed for every profile
- Zero Math.random() in production UI
- Instant results after pipeline run
- Complete stage-to-stage data flow

