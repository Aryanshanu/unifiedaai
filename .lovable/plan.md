

# Data Quality & AI Governance Enhancement Plan
## Implementing End-to-End Data-to-Model Traceability

---

## Current State Analysis

After exploring the codebase, I found that significant foundation exists:

### What Already Exists

| Feature | Current Implementation |
|---------|----------------------|
| **Data Profiling** | Full pipeline via `dq-control-plane` with 6 dimensions |
| **Rules Engine** | `dq_rules` table with severity, thresholds, CDE tagging |
| **Business Impact Tagging** | `business_impact` field on `dq_rules` and `datasets` tables |
| **CDEs (Critical Data Elements)** | `is_critical_element` boolean on rules |
| **Dataset Approval** | `ai_approval_status`, `ai_approved_at`, versioning via `dataset_snapshots` |
| **Bias Scan** | `DatasetBiasScan.tsx` component with demographic skew detection |
| **Model Registration** | Full form with `training_dataset_id`, `intended_use`, `limitations`, `risk_classification` |
| **Drift Detection** | `drift_alerts` table, `detect-drift` edge function |
| **Lineage/Knowledge Graph** | Full KG with nodes/edges for models, datasets, evaluations |
| **Regulatory Reports** | `regulatory_reports` table with EU AI Act, Model Cards, Data Cards |

### What's Missing or Needs Enhancement

| Gap | Priority |
|-----|----------|
| Freshness tracking (last updated, staleness alerts) | High |
| Quality scorecards with trend visualization | High |
| Anomaly detection beyond profiling | Medium |
| Data transformation lineage tracking | High |
| Model drift detection (not just data drift) | High |
| Policy violation auto-escalation | Medium |
| Audit trail consolidation view | High |

---

## Implementation Plan

### Phase 1: Data Quality & Trust Foundation Enhancements

#### 1.1 Freshness Tracking & Staleness Alerts

**Database Changes:**
```sql
-- Add freshness tracking to datasets
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS last_data_update TIMESTAMPTZ;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS staleness_status TEXT DEFAULT 'fresh';
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS freshness_threshold_days INTEGER DEFAULT 7;

-- Create freshness check function
CREATE OR REPLACE FUNCTION check_dataset_freshness() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_data_update IS NOT NULL THEN
    IF NEW.last_data_update < now() - (NEW.freshness_threshold_days || ' days')::interval THEN
      NEW.staleness_status := 'stale';
    ELSIF NEW.last_data_update < now() - ((NEW.freshness_threshold_days * 0.5) || ' days')::interval THEN
      NEW.staleness_status := 'warning';
    ELSE
      NEW.staleness_status := 'fresh';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**New Component:** `src/components/engines/FreshnessIndicator.tsx`
- Shows freshness status with color-coded badge (Fresh/Warning/Stale)
- Displays time since last update
- Clickable to configure threshold

#### 1.2 Quality Scorecards with Trends

**New Component:** `src/components/engines/DQScorecard.tsx`
- Consolidates all 6 dimension scores
- Shows trend sparklines using existing `QualityTrendChart` pattern
- Exportable PDF/JSON with hash verification
- Links to EU AI Act Article 10 (Data Governance)

**Enhancements to existing:** `src/components/engines/DQDashboardVisual.tsx`
- Add dimension trend comparison chart
- Add pass/fail threshold visualization
- Add CDE coverage percentage

#### 1.3 Anomaly Detection Service

**New Edge Function:** `supabase/functions/dq-detect-anomalies/index.ts`
- Runs after profiling
- Detects: outliers (IQR method), distribution shifts, sudden null spikes
- Creates incidents for critical anomalies
- Stores results in new `dataset_anomalies` table

**Database:**
```sql
CREATE TABLE dataset_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES datasets(id),
  column_name TEXT NOT NULL,
  anomaly_type TEXT NOT NULL, -- 'outlier', 'distribution_shift', 'null_spike', 'pattern_break'
  severity TEXT NOT NULL,
  detected_value JSONB,
  expected_range JSONB,
  detected_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);
```

#### 1.4 Enhanced Business Impact Tagging UI

**Update:** `src/components/engines/DQRulesUnified.tsx`
- Add prominent business impact selector (High/Medium/Low)
- Show impact score calculation: `Impact = (Severity × Business Impact × CDE Flag) / 100`
- Visual indicator showing which rules affect AI-approved datasets

---

### Phase 2: Data Readiness for AI

#### 2.1 Enhanced Dataset Approval Workflow

**Update:** `src/components/data/ReadyDatasetsList.tsx`
- Add "Quality Gate Check" before approval
- Requirements: Completeness ≥ 95%, Bias Score ≥ 80%, No Critical Anomalies
- Show blocking reasons if not met
- Add "Run Quality Check" button that validates all gates

**New Component:** `src/components/data/DatasetQualityGate.tsx`
```typescript
interface QualityGate {
  name: string;
  required: number;
  actual: number;
  passed: boolean;
  regulation: string; // e.g., "EU AI Act Art. 10"
}
```

#### 2.2 Bias Checks at Data Level

**Enhance:** `src/components/engines/DatasetBiasScan.tsx`
- Add protected attribute detection (auto-suggest based on column names)
- Add fairness metric calculations: Demographic Parity Difference, Equal Opportunity
- Store bias audit history in `dataset_bias_reports` (already exists)
- Block AI approval if bias score < 70%

#### 2.3 Lineage + Transformations Tracking

**Database Changes:**
```sql
CREATE TABLE data_transformations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dataset_id UUID REFERENCES datasets(id),
  target_dataset_id UUID REFERENCES datasets(id),
  transformation_type TEXT NOT NULL, -- 'filter', 'aggregate', 'join', 'derive', 'clean'
  transformation_logic TEXT,
  columns_affected TEXT[],
  row_count_before INTEGER,
  row_count_after INTEGER,
  executed_at TIMESTAMPTZ DEFAULT now(),
  executed_by UUID
);
```

**New Component:** `src/components/data/TransformationLineage.tsx`
- Visual flow diagram showing dataset transformations
- Click-through to source datasets
- Integration with Knowledge Graph

**Update Knowledge Graph sync:** Add trigger to create KG edges for transformations:
```sql
-- Edge type: dataset -> derived_from -> dataset
```

---

### Phase 3: AI Development & Deployment

#### 3.1 Model Registration Enhancements

**Already exists but enhance:** `src/components/models/ModelRegistrationForm.tsx`

Current fields work well. Add:
- **Training Data Quality Badge** - Show quality score of linked dataset
- **Auto-block if dataset not approved** - Prevent submission without approved training data
- **Governance Checklist** - Required fields validation:
  - ☑ Training dataset linked
  - ☑ Intended use documented
  - ☑ Limitations documented
  - ☑ Risk classification selected

**New Validation:**
```typescript
// In ModelRegistrationForm submit handler
if (formData.training_dataset_id) {
  const dataset = await supabase.from('datasets')
    .select('ai_approval_status, dimension_scores')
    .eq('id', formData.training_dataset_id)
    .single();
  
  if (dataset.ai_approval_status !== 'approved') {
    throw new Error('Training dataset must be AI-approved before model registration');
  }
}
```

#### 3.2 Training Data Traceability

**New Component:** `src/components/models/TrainingDataLineage.tsx`
- Shows full lineage: Raw Data → Transformations → Approved Dataset → Model
- Click-through to each stage
- Quality scores at each stage

**Update Model Detail Page:** Add "Training Data" tab showing:
- Dataset name, version, approval date
- Quality scores at time of training
- Link to bias report

---

### Phase 4: Continuous Monitoring & Feedback

#### 4.1 Data Drift (Enhance Existing)

**Update:** `supabase/functions/detect-drift/index.ts`
- Add data drift detection (currently only tracks model drift)
- Compare current dataset profile against baseline (stored in `dq_profiles`)
- Calculate PSI (Population Stability Index) for each column
- Auto-create incidents for PSI > 0.25

**New Database:**
```sql
CREATE TABLE data_drift_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES datasets(id),
  column_name TEXT NOT NULL,
  drift_type TEXT NOT NULL, -- 'psi', 'kl_divergence', 'mean_shift'
  baseline_profile_id UUID REFERENCES dq_profiles(id),
  current_profile_id UUID REFERENCES dq_profiles(id),
  drift_value NUMERIC,
  severity TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'open'
);
```

#### 4.2 Model Drift

**Update:** `supabase/functions/detect-drift/index.ts`
- Track prediction distribution shift
- Track confidence score degradation
- Compare against baseline evaluation scores
- Auto-escalate to HITL if drift exceeds threshold

#### 4.3 Policy Violations Auto-Escalation

**New Edge Function:** `supabase/functions/policy-violation-handler/index.ts`
- Triggered when incidents are created
- Checks policy rules from `policies` table
- Auto-routes based on severity:
  - Critical: Create HITL entry + send notification
  - High: Create HITL entry
  - Medium/Low: Log only

**Update:** `src/hooks/useIncidents.ts`
- Add `escalation_status` field
- Track time-to-acknowledge, time-to-resolve

#### 4.4 Audit & Regulatory Reporting Dashboard

**New Page:** `src/pages/AuditCenter.tsx`
- Consolidated view of all audit-relevant events
- Filters by: date range, entity type, severity, regulation
- One-click regulatory report generation
- Immutable audit trail with hash chain verification

**Tabs:**
1. **Timeline** - Chronological audit events
2. **Data Governance** - Dataset quality, approvals, transformations
3. **Model Governance** - Registrations, evaluations, deployments
4. **Incidents** - All violations with resolution status
5. **Reports** - Generated regulatory documents

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/engines/FreshnessIndicator.tsx` | Dataset freshness status display |
| `src/components/engines/DQScorecard.tsx` | Quality scorecard with trends |
| `src/components/data/DatasetQualityGate.tsx` | AI approval prerequisites check |
| `src/components/data/TransformationLineage.tsx` | Data flow visualization |
| `src/components/models/TrainingDataLineage.tsx` | Model-to-data traceability |
| `src/pages/AuditCenter.tsx` | Consolidated audit dashboard |
| `src/hooks/useDataDrift.ts` | Data drift monitoring |
| `supabase/functions/dq-detect-anomalies/index.ts` | Anomaly detection service |
| `supabase/functions/policy-violation-handler/index.ts` | Auto-escalation service |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/engines/DataQualityEngine.tsx` | Add Freshness and Anomaly tabs |
| `src/components/engines/DQRulesUnified.tsx` | Enhance business impact UI |
| `src/components/data/ReadyDatasetsList.tsx` | Add quality gate checks |
| `src/components/engines/DatasetBiasScan.tsx` | Add protected attribute detection |
| `src/components/models/ModelRegistrationForm.tsx` | Add validation for training data |
| `src/hooks/useDriftDetection.ts` | Add data drift functions |
| `supabase/functions/detect-drift/index.ts` | Add data drift detection |

---

## Database Migrations Required

```sql
-- Migration 1: Freshness tracking
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS last_data_update TIMESTAMPTZ;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS staleness_status TEXT DEFAULT 'fresh';

-- Migration 2: Anomaly detection
CREATE TABLE IF NOT EXISTS dataset_anomalies (...);

-- Migration 3: Data transformations
CREATE TABLE IF NOT EXISTS data_transformations (...);

-- Migration 4: Data drift alerts
CREATE TABLE IF NOT EXISTS data_drift_alerts (...);

-- Migration 5: Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE dataset_anomalies;
ALTER PUBLICATION supabase_realtime ADD TABLE data_drift_alerts;
```

---

## Implementation Order

1. **Database migrations** (foundational)
2. **Freshness tracking** (quick win, visible impact)
3. **Quality Gate for AI approval** (governance enforcement)
4. **Data drift detection** (monitoring extension)
5. **Transformation lineage** (traceability)
6. **Audit Center page** (consolidation)
7. **Anomaly detection** (advanced feature)

---

## Acceptance Criteria

- [ ] Dataset freshness status visible on all dataset views
- [ ] Quality gate blocks AI approval if thresholds not met
- [ ] Model registration requires linked, approved training dataset
- [ ] Data drift alerts appear in Observability dashboard
- [ ] Full lineage visible from model → training data → raw sources
- [ ] Audit Center shows 90-day trail with hash verification
- [ ] All new incidents auto-escalate based on policy rules
- [ ] Regulatory reports include all new governance data

