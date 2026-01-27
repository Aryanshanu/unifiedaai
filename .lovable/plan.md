

# Fractal Unified-OS: 6-Stage RAI Governance Pipeline Implementation Plan

## Executive Summary

This plan transforms the existing Fractal Unified-OS platform into a complete end-to-end Responsible AI governance pipeline covering 6 stages: **Data Ingestion → Data Quality → AI Readiness → Model Development → RAI Controls → Continuous Monitoring**. The implementation leverages existing infrastructure (Data Quality Engine, RAI Engines, Knowledge Graph, Incidents system) while addressing current bugs and adding new capabilities.

---

## Current State Analysis

### Existing Infrastructure (What We Have)
| Component | Status | Key Files |
|-----------|--------|-----------|
| Data Quality Engine | **70% complete** | `DataQualityEngine.tsx`, `useDQControlPlane.ts` |
| 5 RAI Engines | **Production-ready** | `FairnessEngine.tsx`, etc. |
| Knowledge Graph | **Fully functional** | `useKnowledgeGraph.ts`, `kg-lineage` edge function |
| Incidents System | **200 open incidents** | `useIncidents.ts`, `incidents` table |
| Approval Workflow | **Functional with SoD** | `useSystemApprovals.ts` |
| Model Registry | **3 models registered** | `Models.tsx`, `ModelRegistrationForm.tsx` |
| Lineage Tracking | **Database schema exists** | `dataset_lineage_edges` table |

### Current Metrics (From Database)
- **Open Incidents**: 200
- **Total Models**: 3
- **Total Datasets**: 14
- **DQ Profiles**: 56
- **DQ Rules**: 344
- **Request Logs**: 910
- **Evaluation Runs**: 14

### Known Bugs to Fix
1. **DQ Results Delay**: Results don't load instantly after pipeline run (must switch datasets)
2. **Empty Quality Dimensions**: Some dimensions show 0% when data exists
3. **Missing Transparency**: Error rate and primary key detection lack formula explanations
4. **Incidents Loop**: (FIXED in previous session) - useEffect dependencies issue

---

## Implementation Phases

### Phase 1: Bug Fixes + Critical Data Elements (Estimated: 3-4 hours)

#### 1.1 Fix DQ Pipeline Instant Loading
**Problem**: After running pipeline, user must switch datasets to see results
**Root Cause**: `useDQControlPlane.ts` doesn't force state refresh after successful pipeline completion
**Solution**: Already partially fixed (lines 444-476) - enhance by triggering React Query cache invalidation

```text
File: src/hooks/useDQControlPlane.ts
Changes:
- Add queryClient.invalidateQueries after pipeline success
- Force re-render of DQStreamingDashboard via key prop change
```

#### 1.2 Fix Empty Quality Dimensions
**Problem**: Some dimensions show 0% even when data exists
**Root Cause**: `dq-profile-dataset` edge function computes 6 dimensions but some return 0 for missing prerequisites
**Solution**: Already improved (accuracy/timeliness/consistency now computed) - add "Not Available" badge for truly missing dimensions

```text
File: src/components/engines/DQDashboardVisual.tsx
Changes:
- Show "N/A" badge with tooltip for dimensions with null scores
- Add explanation why dimension is unavailable (e.g., "Accuracy requires ground truth data")
```

#### 1.3 Add Transparent Calculation Explanations
**Problem**: Error rate and primary key detection lack formula visibility
**Solution**: Enhanced `ErrorRateExplanation` component exists - add `PrimaryKeyExplanation` component

```text
New File: src/components/engines/PrimaryKeyExplanation.tsx
- Show: "Primary Key: {column} — 100% unique, 0 nulls"
- Include reasoning: "Detected via uniqueness ≥99% AND null_count = 0"

File: src/components/engines/DQProfilingReportTabular.tsx
- Add PrimaryKeyExplanation below column analysis
```

#### 1.4 Add Critical Data Elements (CDE) Tagging
**Schema Addition**:
```sql
ALTER TABLE public.dq_rules ADD COLUMN is_critical_element BOOLEAN DEFAULT false;
ALTER TABLE public.dq_profiles ADD COLUMN critical_columns TEXT[] DEFAULT '{}';
```

**UI Changes**:
- Add toggle in DQRulesUnified.tsx: "Mark as Critical Data Element"
- Add badge on profiling columns: "CDE" with tooltip
- Auto-suggest CDE based on: column name contains 'id', 'key', 'email', 'phone', 'ssn', or uniqueness > 95%

#### 1.5 Add Business Impact Tagging
**Schema Addition**:
```sql
ALTER TABLE public.dq_rules ADD COLUMN business_impact TEXT CHECK (business_impact IN ('high', 'medium', 'low', null));
ALTER TABLE public.datasets ADD COLUMN business_impact TEXT CHECK (business_impact IN ('high', 'medium', 'low', null));
```

**UI Changes**:
- Add dropdown in dataset creation form: "Business Impact: High/Medium/Low"
- Auto-suggest based on: sensitivity_level, column names (revenue, price, amount = high)

---

### Phase 2: Enhanced Data Ingestion (Stage 1) (Estimated: 4-5 hours)

#### 2.1 Data Sources Tab in Data Quality Engine
```text
File: src/pages/engines/DataQualityEngine.tsx
Changes:
- Add new tab: "Data Sources" between current tabs
- Shows list of connected sources with status icons
```

#### 2.2 Data Connectors Configuration
**New Component**: `src/components/data/DataSourceConnectors.tsx`
- **Internal Sources**: Database (PostgreSQL, MySQL), Files (S3, GCS, local), Cloud Storage
- **Third-Party APIs**: REST endpoints with OAuth/API key auth
- Each connector shows: Name, Type, Status (Connected/Error), Last Sync, Row Count

**Schema Addition**:
```sql
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('database', 'file', 's3', 'gcs', 'api', 'manual')),
  connection_config JSONB,
  auth_type TEXT CHECK (auth_type IN ('none', 'api_key', 'oauth', 'basic')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'syncing')),
  last_sync_at TIMESTAMPTZ,
  row_count BIGINT DEFAULT 0,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2.3 Ingestion Metadata Capture
- Extend `datasets` table to capture:
  - `source_id` (link to data_sources)
  - `ingestion_metadata` JSONB (timestamp, owner, schema_hash, validation_result)
- Add validation at ingestion: schema check, size limits (500MB), basic format validation

---

### Phase 3: Data Readiness for AI (Stage 3) (Estimated: 5-6 hours)

#### 3.1 Lineage View Enhancement
**Current**: `src/pages/Lineage.tsx` shows Knowledge Graph
**Enhancement**: Add "Dataset Lineage" mode showing ETL transformations

```text
File: src/pages/Lineage.tsx
Changes:
- Add toggle: "Model Lineage" | "Dataset Lineage"
- Dataset mode shows: Raw → Profiled → Quality Checked → Approved → Used by Model
- Use existing dataset_lineage_edges table
```

#### 3.2 Pre-AI Bias Scan (Link to Fairness Engine)
**New Component**: `src/components/engines/DatasetBiasScan.tsx`
- Runs on dataset (not model) to detect:
  - Demographic skew (if protected columns exist)
  - Class imbalance
  - Missing value patterns by group
- Uses simplified version of Fairness Engine metrics

**Edge Function**: `supabase/functions/scan-dataset-bias/index.ts`
- Input: dataset_id
- Output: bias_report with skew scores, flagged columns

#### 3.3 Dataset Approval Workflow
**Extend Approvals Page**:
```text
File: src/pages/Approvals.tsx
Changes:
- Add "Datasets" tab alongside "Systems"
- Show datasets pending AI approval
- Approval triggers: sets dataset.ai_approved_at, creates lineage edge
```

**Schema Addition**:
```sql
ALTER TABLE public.datasets ADD COLUMN ai_approval_status TEXT DEFAULT 'draft' 
  CHECK (ai_approval_status IN ('draft', 'pending', 'approved', 'rejected'));
ALTER TABLE public.datasets ADD COLUMN ai_approved_at TIMESTAMPTZ;
ALTER TABLE public.datasets ADD COLUMN ai_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE public.datasets ADD COLUMN version TEXT DEFAULT '1.0';
```

#### 3.4 Ready Datasets List
**New Component**: `src/components/data/ReadyDatasetsList.tsx`
- Table showing: Dataset Name, Quality Score, Bias Summary, Approval Status, Lineage Link
- Filter: "Approved for AI" toggle
- Click to view dataset detail with bias report

---

### Phase 4: Enhanced Model Development (Stage 4) (Estimated: 3-4 hours)

#### 4.1 Enhanced Model Registration
**Current**: `ModelRegistrationForm.tsx` already has governance fields
**Enhancement**: Add training data linkage

```text
File: src/components/models/ModelRegistrationForm.tsx
Changes:
- Add "Training Dataset" dropdown (shows AI-approved datasets only)
- Add "Limitations" textarea
- Add "Intended Use" textarea
- These create dataset_lineage_edges records
```

**Schema Addition**:
```sql
ALTER TABLE public.models ADD COLUMN training_dataset_id UUID REFERENCES datasets(id);
ALTER TABLE public.models ADD COLUMN limitations TEXT;
ALTER TABLE public.models ADD COLUMN intended_use TEXT;
```

#### 4.2 Model Cards with Traceability
**New Component**: `src/components/models/ModelCard.tsx` (enhance existing)
- Show embedded mini-lineage: Training Data → Model → Evaluations
- Display all governance fields in expandable section
- Link to full lineage view

#### 4.3 Deployment Gates
**Enhance**: `src/hooks/useSystemApprovals.ts`
- Before deployment approval, auto-check:
  - All RAI Engine scores > 70% threshold (configurable)
  - No critical open incidents
  - Training data is AI-approved
- Block deployment if checks fail with reason

---

### Phase 5: Responsible AI Controls Activation (Stage 5) (Estimated: 4-5 hours)

#### 5.1 Auto-Run RAI Engines
**New Feature**: Scheduled/triggered RAI evaluations
```text
File: src/hooks/useModelEvaluationHistory.ts
Changes:
- Add useAutoEvaluate hook
- Triggers when model is registered or updated
- Runs all 5 engines in sequence
```

**Edge Function Enhancement**: `supabase/functions/eval-suite/index.ts`
- Accepts model_id
- Runs all engines and aggregates scores
- Creates single evaluation_run with all results

#### 5.2 Risk Classification Auto-Assignment
**Schema Addition**:
```sql
ALTER TABLE public.models ADD COLUMN risk_classification TEXT 
  CHECK (risk_classification IN ('minimal', 'limited', 'high', 'unacceptable'));
ALTER TABLE public.models ADD COLUMN risk_classification_reason TEXT;
```

**Auto-Classification Logic** (based on EU AI Act):
- `unacceptable`: Prohibited uses (social scoring, subliminal manipulation)
- `high`: Biometric, critical infrastructure, employment, credit
- `limited`: Chatbots, deepfakes, emotion recognition
- `minimal`: Default for non-sensitive uses

**UI**: Show risk badge on model cards with EU AI Act article reference

#### 5.3 HITL Checkpoint Integration
**Enhance**: Model detail page to show HITL queue items
- If model has high-risk classification → auto-route to HITL for review
- Show pending HITL reviews count on model card

---

### Phase 6: Continuous Monitoring Enhancement (Stage 6) (Estimated: 4-5 hours)

#### 6.1 Enhanced Drift Detection
**Current**: `useDriftDetection.ts` exists
**Enhancement**: Add data drift (not just model drift)

```text
File: src/hooks/useDriftDetection.ts
Changes:
- Add dataset_id parameter
- Detect schema drift (column additions/removals)
- Detect distribution drift (mean/std changes)
- Create incidents for significant drift
```

#### 6.2 Policy Violation Detection
**Integrate**: Policy Studio with RAI Engines
- When RAI score drops below policy threshold → create incident
- Auto-link incident to policy rule

#### 6.3 Audit Report Generation
**Enhance**: `generate-scorecard` edge function
- Add "Regulatory Audit" export option
- Include: EU AI Act mapping, all RAI scores, incident history, approval trail
- PDF export with signatures

#### 6.4 Feedback Loop Visualization
**New Component**: `src/components/monitoring/FeedbackLoopDiagram.tsx`
- Shows: Issue Detected → Stage Affected → Action Taken → Result
- Example: "Drift detected → Re-profiled dataset → Quality score improved 8%"

#### 6.5 Fix Open Incidents Display
**Issue**: 200 open incidents - need instant loading
**Solution**: 
- Add pagination to incidents list (50 per page)
- Add "Bulk Resolve" for test/demo incidents
- Add severity filter in header stats

---

### Phase 7: Chatbot Context Toggle (Cross-Cutting) (Estimated: 2-3 hours)

#### 7.1 Enhance DQChatPanel
**Current**: Has mode toggle for "Dataset Context" vs "General"
**Enhancement**: 
- Persist toggle across sessions
- Add visual indicator in header: "Context: Customer_Orders.csv"
- When OFF: Use general RAI governance knowledge base

```text
File: src/components/engines/DQChatPanel.tsx
Changes:
- Line 497-499: Already has isDatasetMode toggle
- Enhance: Add "Context Active" badge showing dataset name
- Enhance: When OFF, call different system prompt for general governance
```

---

## Database Migrations Summary

```sql
-- Phase 1: CDE and Business Impact
ALTER TABLE public.dq_rules ADD COLUMN is_critical_element BOOLEAN DEFAULT false;
ALTER TABLE public.dq_rules ADD COLUMN business_impact TEXT;
ALTER TABLE public.dq_profiles ADD COLUMN critical_columns TEXT[] DEFAULT '{}';
ALTER TABLE public.datasets ADD COLUMN business_impact TEXT;

-- Phase 2: Data Sources
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  connection_config JSONB,
  auth_type TEXT,
  status TEXT DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  row_count BIGINT DEFAULT 0,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.datasets ADD COLUMN source_id UUID REFERENCES data_sources(id);

-- Phase 3: Dataset Approval
ALTER TABLE public.datasets ADD COLUMN ai_approval_status TEXT DEFAULT 'draft';
ALTER TABLE public.datasets ADD COLUMN ai_approved_at TIMESTAMPTZ;
ALTER TABLE public.datasets ADD COLUMN ai_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE public.datasets ADD COLUMN version TEXT DEFAULT '1.0';

-- Phase 4: Model Traceability
ALTER TABLE public.models ADD COLUMN training_dataset_id UUID REFERENCES datasets(id);
ALTER TABLE public.models ADD COLUMN limitations TEXT;
ALTER TABLE public.models ADD COLUMN intended_use TEXT;

-- Phase 5: Risk Classification
ALTER TABLE public.models ADD COLUMN risk_classification TEXT;
ALTER TABLE public.models ADD COLUMN risk_classification_reason TEXT;
```

---

## New Components Summary

| Component | Purpose | Location |
|-----------|---------|----------|
| `PrimaryKeyExplanation` | Transparent PK detection reasoning | `src/components/engines/` |
| `DataSourceConnectors` | Manage data source connections | `src/components/data/` |
| `DatasetBiasScan` | Pre-AI bias detection | `src/components/engines/` |
| `ReadyDatasetsList` | Show AI-approved datasets | `src/components/data/` |
| `FeedbackLoopDiagram` | Visualize issue-to-action flow | `src/components/monitoring/` |

---

## New Edge Functions Summary

| Function | Purpose |
|----------|---------|
| `scan-dataset-bias` | Run bias checks on dataset before AI use |
| `eval-suite` | Run all 5 RAI engines on a model |
| `detect-data-drift` | Schema and distribution drift detection |

---

## Priority Order

1. **Phase 1 (Bug Fixes)** - Immediate value, unblocks users
2. **Phase 3 (Data Readiness)** - Critical for governance pipeline
3. **Phase 5 (RAI Controls)** - Auto-activation of existing engines
4. **Phase 2 (Data Ingestion)** - Better data source management
5. **Phase 4 (Model Development)** - Enhanced traceability
6. **Phase 6 (Monitoring)** - Closes the loop
7. **Phase 7 (Chatbot)** - UX enhancement

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Open Incidents | 200 | <50 (after bulk resolve + prevention) |
| Governance Health | 0% | >30% (after controls activation) |
| Coverage | 0% | >50% (models with evaluations) |
| Harmful Outcome Rate | 40% | <10% (with HITL checkpoints) |
| DQ Pipeline Completion | Buggy | 100% real-time visibility |

---

## Technical Notes

- All changes use existing TypeScript/React patterns
- New tables have RLS policies matching existing patterns
- Edge functions follow Deno/Supabase conventions
- UI components use existing Shadcn/Tailwind styling
- All metrics derived from real data only (no simulation)

