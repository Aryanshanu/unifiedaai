

# Oversight Agent POC Implementation Plan

## Executive Summary

The user requests implementing a comprehensive **Oversight Agent POC** that provides continuous monitoring of ML/AI systems for data quality, drift, bias, compliance, and security. After thorough analysis, I found that **~75% of the required infrastructure already exists** in the Fractal RAI-OS platform. This plan focuses on enhancing existing components and adding the missing capabilities.

---

## Current State Analysis (What Already Exists)

### Database Infrastructure (88 tables - 100% Coverage)
| Category | Tables | Status |
|----------|--------|--------|
| Event Telemetry | `request_logs`, `telemetry_logs` | Exists |
| Incidents & Alerts | `incidents`, `drift_alerts`, `dq_incidents` | Exists |
| Decisions & Audit | `decisions`, `decision_ledger`, `admin_audit_log` | Exists |
| Policy & Controls | `controls`, `control_assessments`, `policy_violations` | Exists |
| Review Queue (HITL) | `review_queue`, `decisions` | Exists |
| Governance | `governance_activation_state`, `attestations` | All 11 enforced |

### Edge Functions (53 functions - 90% Coverage)
| Function | Purpose | Status |
|----------|---------|--------|
| `detect-drift` | PSI/KL divergence drift detection | Fully implemented |
| `dq-raise-incidents` | Auto-create DQ incidents | Fully implemented |
| `eval-*` | 5 RAI engine evaluations | Fully implemented |
| `ai-gateway` | Request proxy & scoring | Fully implemented |
| `send-notification` | Alert routing | Exists (needs enhancement) |

### UI Components (Complete)
- **Command Center** (`Index.tsx`): 6-stage pipeline, incident summary, governance health
- **Observability** (`Observability.tsx`): Real-time metrics, drift alerts, system health tables
- **HITL Console** (`HITL.tsx`): Review queue, SLA timers, decision dialogs
- **Governance** (`Governance.tsx`): Control frameworks, compliance gauge, attestations

### Real-time Subscriptions (Active)
- Supabase Realtime already wired to: `incidents`, `request_logs`, `drift_alerts`, `review_queue`
- Toast notifications on new incidents
- Live dashboard refresh

### Current Metrics (Live Database)
- **Open Incidents**: 218 (151 critical, 46 investigating)
- **Request Logs (24h)**: 0 (no live traffic yet)
- **Governance Activation**: 100% (all 11 capabilities enforced)

---

## Gap Analysis (What's Missing for POC)

### 1. Unified Event Ingestion Table
**Current**: Events scattered across `request_logs`, `telemetry_logs`, `dq_profiles`
**Need**: Normalized `events_raw` table for unified telemetry

### 2. Policy-Based Scoring Engine
**Current**: Fixed thresholds in `detect-drift`
**Need**: Configurable rules/controls table with dynamic thresholds

### 3. Evidence Storage Integration
**Current**: `attestations.document_url` exists but limited
**Need**: Proper storage bucket for evidence artifacts with hash verification

### 4. Alert Deduplication & Correlation
**Current**: Basic dedup in `dq-raise-incidents` via `failure_signature`
**Need**: Cross-signal correlation (e.g., drift + bias = compound alert)

### 5. External Notification Webhooks
**Current**: Toast notifications only
**Need**: Teams/Slack/Email integration via Edge Functions

### 6. EU AI Act Assessment (Real Data)
**Current**: `EUAIActAssessment.tsx` uses `Math.random()` for demo
**Need**: Connect to actual `control_assessments` table

### 7. Ownership/Escalation Routing
**Current**: `assignee_id` exists on incidents but not populated
**Need**: `ownership` table mapping systems → owners for auto-routing

### 8. KPIs/SLOs Dashboard
**Current**: Basic metrics in Observability
**Need**: Explicit MTTD/MTTR tracking with SLO thresholds

---

## Implementation Plan

### Phase 1: Data Model Enhancements (Day 1)

#### 1.1 Create Unified Event Table
```sql
CREATE TABLE events_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('data_quality', 'model_perf', 'fairness', 'security', 'compliance')),
  source_system_id UUID REFERENCES systems(id),
  source_model_id UUID REFERENCES models(id),
  severity TEXT CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_raw_type ON events_raw(event_type);
CREATE INDEX idx_events_raw_unprocessed ON events_raw(processed) WHERE NOT processed;
```

#### 1.2 Create Ownership Mapping Table
```sql
CREATE TABLE ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('system', 'model', 'dataset')),
  entity_id UUID NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id),
  team_name TEXT,
  escalation_email TEXT,
  on_call_schedule JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);
```

#### 1.3 Create SLO Configuration Table
```sql
CREATE TABLE slo_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL UNIQUE,
  target_value NUMERIC NOT NULL,
  threshold_warning NUMERIC,
  threshold_critical NUMERIC,
  measurement_window_hours INTEGER DEFAULT 24,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with POC defaults
INSERT INTO slo_config (metric_name, target_value, threshold_warning, threshold_critical) VALUES
  ('mttd_critical_minutes', 5, 10, 15),
  ('mttd_high_minutes', 15, 30, 60),
  ('mttr_critical_minutes', 60, 90, 120),
  ('mttr_high_minutes', 240, 360, 480),
  ('alert_precision', 0.80, 0.70, 0.60),
  ('alert_recall', 0.80, 0.70, 0.60),
  ('audit_completeness', 0.95, 0.90, 0.85);
```

---

### Phase 2: Event Ingestion & Scoring Edge Functions (Day 2)

#### 2.1 Create `ingest-events` Edge Function
**Purpose**: Normalize incoming telemetry from any source

```typescript
// supabase/functions/ingest-events/index.ts
// - Accepts batch of events
// - Validates against event schema
// - Stores in events_raw
// - Triggers processing if batch size > threshold
```

#### 2.2 Create `process-events` Edge Function
**Purpose**: Apply rules/ML checks and generate alerts

```typescript
// supabase/functions/process-events/index.ts
// - Reads unprocessed events from events_raw
// - Applies configurable thresholds from controls table
// - Correlates related events (e.g., multiple drift signals)
// - Creates deduped alerts with severity scoring
// - Marks events as processed
```

#### 2.3 Enhance `send-notification` Edge Function
**Purpose**: Route alerts to external channels

```typescript
// Add support for:
// - Microsoft Teams webhook
// - Slack webhook
// - Email via SMTP
// - PagerDuty escalation (placeholder)
```

---

### Phase 3: Dashboard Enhancements (Day 3-4)

#### 3.1 Create SLO/KPI Dashboard Component
**New file**: `src/components/dashboard/SLODashboard.tsx`

```typescript
// Display:
// - MTTD (Mean Time to Detect) by severity
// - MTTR (Mean Time to Respond) by severity
// - Alert precision/recall (if labeled test scenarios exist)
// - Audit completeness %
// - Traffic sparkline
// - Trend indicators
```

#### 3.2 Create Oversight Agent Status Panel
**New file**: `src/components/dashboard/OversightAgentStatus.tsx`

```typescript
// Display:
// - Agent health (running/stopped)
// - Last scan timestamp
// - Events processed (24h)
// - Alerts generated (24h)
// - Quick action buttons
```

#### 3.3 Enhance Command Center (`Index.tsx`)
- Add SLO dashboard widget
- Add oversight agent status panel
- Add event throughput metric

#### 3.4 Fix EU AI Act Assessment
**File**: `src/components/governance/EUAIActAssessment.tsx`
- Replace `Math.random()` with actual queries to `control_assessments`
- Store results to `control_assessments` table on completion
- Add real evidence references

---

### Phase 4: Evidence Storage & Audit Trail (Day 4)

#### 4.1 Create Storage Bucket for Evidence
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('oversight-evidence', 'oversight-evidence', false);

-- RLS policy for authenticated users
CREATE POLICY "Authenticated users can read evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'oversight-evidence' AND auth.role() = 'authenticated');
```

#### 4.2 Enhance Audit Log with Hash Chain
- Already exists via `compute_audit_hash()` trigger on `admin_audit_log`
- Verify chain integrity via `verify_audit_chain()` function (already exists)

#### 4.3 Add Evidence Attachment to Incidents
**Modify**: `incidents` table (add `evidence_url` column if needed)

---

### Phase 5: Alerting & Workflow Integration (Day 5)

#### 5.1 Auto-Assign Incidents to Owners
**Modify**: Incident creation flow to lookup `ownership` table and set `assignee_id`

#### 5.2 SLA Timer Integration
- Already exists in HITL Console via `SLACountdown` component
- Add SLA breach auto-escalation trigger

#### 5.3 Create Escalation Rules Table
```sql
CREATE TABLE escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  severity_filter TEXT[], -- ['critical', 'high']
  incident_type_filter TEXT[],
  sla_breach_minutes INTEGER,
  escalation_action TEXT CHECK (escalation_action IN ('notify_owner', 'notify_team', 'page', 'auto_create_ticket')),
  webhook_url TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Phase 6: Testing & Runbooks (Day 6)

#### 6.1 Create Test Scenarios
- Data quality violation (completeness < 80%)
- Model drift (PSI > 0.25)
- Fairness disparity (demographic parity > 0.1)
- Security anomaly (unusual error rate)
- Compliance breach (control assessment failed)

#### 6.2 Create Runbook Pages
**New file**: `src/pages/Runbooks.tsx`
- Incident triage decision tree
- Escalation path visualization
- Evidence attachment guide

#### 6.3 End-to-End Validation
- Simulate event → alert → triage → decision → audit flow
- Verify MTTD/MTTR calculations
- Verify hash chain integrity

---

## Summary of Changes

### New Database Tables (4)
| Table | Purpose |
|-------|---------|
| `events_raw` | Unified event ingestion |
| `ownership` | System/model → owner mapping |
| `slo_config` | KPI thresholds |
| `escalation_rules` | Auto-escalation logic |

### New Edge Functions (2)
| Function | Purpose |
|----------|---------|
| `ingest-events` | Normalize incoming telemetry |
| `process-events` | Apply rules and create alerts |

### Enhanced Edge Functions (1)
| Function | Enhancement |
|----------|-------------|
| `send-notification` | Add Teams/Slack/Email support |

### New UI Components (3)
| Component | Purpose |
|-----------|---------|
| `SLODashboard.tsx` | MTTD/MTTR/precision/recall KPIs |
| `OversightAgentStatus.tsx` | Agent health panel |
| `Runbooks.tsx` | Incident response guides |

### Modified UI Components (2)
| Component | Change |
|-----------|--------|
| `Index.tsx` | Add SLO widget, agent status |
| `EUAIActAssessment.tsx` | Connect to real control_assessments |

### Storage (1)
| Bucket | Purpose |
|--------|---------|
| `oversight-evidence` | Evidence artifacts with hash verification |

---

## Success Criteria (POC)

| KPI | Target |
|-----|--------|
| MTTD (Critical) | ≤5 minutes |
| MTTD (High) | ≤15 minutes |
| MTTR (Critical) | ≤60 minutes |
| Alert Precision | ≥0.80 |
| Audit Completeness | ≥95% |
| RLS Coverage | 100% tables |
| Evidence Bucket Policies | 100% |

---

## Implementation Order

1. **Database migrations** - Create new tables (events_raw, ownership, slo_config, escalation_rules)
2. **Edge functions** - Create ingest-events, process-events; enhance send-notification
3. **UI components** - Create SLODashboard, OversightAgentStatus
4. **Fix EUAIActAssessment** - Remove Math.random(), connect to real data
5. **Storage bucket** - Create oversight-evidence with policies
6. **Testing** - Run test scenarios end-to-end

