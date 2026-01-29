
# Production-Ready Implementation Plan: 85% → 95% PDR

## Executive Summary

Based on thorough analysis of the current codebase and database state, this plan addresses all identified gaps to push the platform from **Pilot-Ready (85%)** to **Production-Ready (95%+)**.

### Current State Metrics (Live Database)
| Metric | Value | Status |
|--------|-------|--------|
| `events_raw` (Oversight Agent telemetry) | **0** | Critical Gap |
| HITL Backlog (`review_queue` pending) | **546** | Critical Gap |
| Open Incidents | **218** | Needs triage |
| Governance Capabilities Enforced | **11/11** | Complete |
| Rate Limit Entries | **29** | DB-backed exists |
| Control Assessments | **100** | Healthy |
| Evaluation Runs | **14** | Active |
| Open Drift Alerts | **18** | Active |

---

## Phase 1: Oversight Agent Full Validation (Priority: CRITICAL)

### 1.1 Create Synthetic Event Generator Edge Function
**New file**: `supabase/functions/generate-synthetic-events/index.ts`

Generates diverse telemetry events for testing the Oversight Agent pipeline:

```text
Event Distribution (10,000 events):
├── data_quality (45%) - 4,500 events
├── model_perf (20%) - 2,000 events  
├── fairness (15%) - 1,500 events
├── security (12%) - 1,200 events
└── compliance (8%) - 800 events

Severity Distribution:
├── critical (5%) - Test MTTD ≤5min
├── high (15%) - Test MTTD ≤15min
├── medium (30%) - Standard processing
├── low (30%) - Noise filtering
└── info (20%) - Log-only
```

### 1.2 Create Simulation Controller Component
**New file**: `src/components/oversight/SimulationController.tsx`

UI for running and monitoring synthetic workloads:
- Start/stop simulation with configurable batch sizes
- Real-time counters for events, alerts, incidents
- MTTD/MTTR live measurement
- Precision/recall calculation against labeled scenarios

### 1.3 Enhance `process-events` with Threshold Configuration
**Modified file**: `supabase/functions/process-events/index.ts`

Add configurable thresholds by reading from `slo_config` table instead of hardcoded values:
- Fetch thresholds dynamically
- Add correlation window configuration (default: 5 minutes)
- Add compound alert logic for multi-signal scenarios

---

## Phase 2: HITL Backlog Elimination (Priority: CRITICAL)

### 2.1 Create HITL Auto-Assist Engine
**New file**: `supabase/functions/hitl-auto-assist/index.ts`

AI-powered pre-triage for review queue items:
- Generate summary of issue
- Suggest decision (approve/reject/escalate)
- Extract evidence references
- Calculate risk score
- Provide SLA recommendation

```typescript
interface AutoAssistResult {
  summary: string;
  suggested_decision: 'approve' | 'reject' | 'escalate';
  confidence: number;
  risk_score: number;
  evidence_refs: string[];
  reasoning: string;
}
```

### 2.2 Create Bulk Triage Interface
**New file**: `src/components/hitl/BulkTriagePanel.tsx`

Batch processing UI for HITL backlog:
- Multi-select with shift-click
- Bulk approve/reject with common rationale
- Auto-apply AI suggestions for low/medium severity
- SLA-based priority sorting
- "Clear Low Risk" quick action

### 2.3 Add Auto-Approval Policies Table
**Database migration**:
```sql
CREATE TABLE auto_approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL,
  severity_filter TEXT[] CHECK (severity_filter <@ ARRAY['low', 'medium', 'high', 'critical']),
  review_type_filter TEXT[],
  max_risk_score NUMERIC DEFAULT 30,
  auto_action TEXT CHECK (auto_action IN ('approve', 'reject', 'escalate')) DEFAULT 'approve',
  enabled BOOLEAN DEFAULT false,
  requires_audit_log BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.4 Enhance HITL Page with Triage Features
**Modified file**: `src/pages/HITL.tsx`

Add:
- Bulk selection toolbar
- AI suggestion indicators
- Auto-approval toggle (admin only)
- Backlog health indicator
- "Process with AI Assist" button

---

## Phase 3: Incident Lifecycle Engine (Priority: HIGH)

### 3.1 Create Incident Lifecycle Edge Function
**New file**: `supabase/functions/incident-lifecycle/index.ts`

Automated incident state management:
- SLA timer enforcement (auto-escalate on breach)
- Auto-close stale incidents (>7 days, low severity)
- RCA template assignment
- Knowledge Graph linking
- Follow-up scheduling

### 3.2 Add RCA Templates Table
**Database migration**:
```sql
CREATE TABLE rca_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  template_content JSONB NOT NULL,
  required_fields TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rca_template_id UUID REFERENCES rca_templates(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rca_completed_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS follow_up_date DATE;
```

### 3.3 Create Incident Bulk Resolution Component
**New file**: `src/components/incidents/BulkResolutionPanel.tsx`

- Multi-select with filters (severity, age, status)
- Common resolution reason dropdown
- Auto-link to RCA template
- Batch close with audit trail

---

## Phase 4: Unified Platform Configuration (Priority: HIGH)

### 4.1 Create Configuration Registry Table
**Database migration**:
```sql
CREATE TABLE platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('engine_weights', 'thresholds', 'slo', 'escalation', 'policy')),
  version INTEGER DEFAULT 1,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  description TEXT
);

CREATE TABLE platform_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES platform_config(id),
  previous_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Create Config Management Hook
**New file**: `src/hooks/usePlatformConfig.ts`

Centralized configuration access with:
- Type-safe config retrieval
- Version tracking
- Change history
- Real-time updates via Supabase subscription

### 4.3 Create Configuration Dashboard
**New file**: `src/pages/Configuration.tsx`

Admin UI for managing:
- Engine weight profiles
- DQ thresholds by dimension
- Fairness thresholds (demographic parity, etc.)
- SLO values (MTTD, MTTR)
- Escalation rules
- Policy settings

---

## Phase 5: Golden Demo Automation Enhancement (Priority: MEDIUM)

### 5.1 Add Demo Scenarios Table
**Database migration**:
```sql
CREATE TABLE demo_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  expected_outcomes JSONB,
  duration_seconds INTEGER DEFAULT 90,
  category TEXT CHECK (category IN ('sales', 'audit', 'investor', 'training')),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 Enhance Golden Demo Orchestrator
**Modified file**: `src/hooks/useGoldenDemoOrchestrator.ts`

Add:
- Scenario-based execution from `demo_scenarios` table
- Stepper-based visual walkthrough
- Investor mode (condensed 60s version)
- Audit mode (comprehensive 5min version)
- Export demo log as evidence package

### 5.3 Add Demo Narration Component
**New file**: `src/components/golden/DemoNarrator.tsx`

Visual overlay showing:
- Current step description
- What's happening technically
- Why it matters for governance
- Next step preview

---

## Phase 6: Edge Function Observability (Priority: MEDIUM)

### 6.1 Create Function Metrics Table
**Database migration**:
```sql
CREATE TABLE function_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  invocation_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  total_latency_ms BIGINT DEFAULT 0,
  cold_start_count INTEGER DEFAULT 0,
  measurement_window TIMESTAMPTZ DEFAULT now(),
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_function_metrics_name_time ON function_metrics(function_name, recorded_at DESC);
```

### 6.2 Create Metrics Recording Utility
**New file**: `supabase/functions/_shared/function-metrics.ts`

Wrapper for edge functions that records:
- Invocation count
- Latency distribution
- Error rates by type
- Cold start detection

### 6.3 Create Edge Function Dashboard
**New file**: `src/components/observability/EdgeFunctionDashboard.tsx`

Visualizations:
- Latency heatmap by function
- Error rate chart
- Invocation volume sparklines
- Cold start percentage

---

## Phase 7: Governance Bypass Detection (Priority: MEDIUM)

### 7.1 Create Bypass Detection Edge Function
**New file**: `supabase/functions/detect-governance-bypass/index.ts`

Monitors for:
- API calls without signed JWT
- Direct database access patterns
- Unusual request patterns
- Policy circumvention attempts
- Suspicious rate limit behaviors

### 7.2 Add Bypass Detection Alerts
Automatically creates incidents when bypass detected:
- Links to admin audit log
- Captures request details
- Assigns to security team

---

## Phase 8: Rate Limiting Hardening (Priority: HIGH)

### 8.1 Verify DB-Backed Rate Limiting
The `rate_limits` table already exists with 29 entries. Verify all critical functions use it:

**Functions to verify/update**:
- `ai-gateway` - Uses DB-backed ✓
- `llm-generate` - Uses DB-backed ✓
- `cicd-gate` - Uses in-memory ✗ (needs fix)
- `eval-*` functions - Need rate limiting

### 8.2 Add Rate Limit Cleanup CRON
**Database migration** (for scheduled cleanup):
```sql
SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/15 * * * *',
  $$DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour'$$
);
```

### 8.3 Fix `cicd-gate` Rate Limiting
**Modified file**: `supabase/functions/cicd-gate/index.ts`

Replace in-memory Map with database-backed implementation:
```typescript
// Replace rateLimitMap with database queries
async function checkRateLimit(identifier: string): Promise<boolean> {
  const { count } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .gte('window_start', new Date(Date.now() - 60000).toISOString());
  
  return (count || 0) < RATE_LIMIT;
}
```

---

## Phase 9: Predictive Governance (Governance Capability 12)

### 9.1 Create Predictive Model Table
**Database migration**:
```sql
CREATE TABLE predictive_governance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT CHECK (entity_type IN ('model', 'system', 'dataset')),
  entity_id UUID NOT NULL,
  prediction_type TEXT CHECK (prediction_type IN ('drift_risk', 'compliance_risk', 'incident_probability')),
  risk_score NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL,
  predicted_timeframe_hours INTEGER,
  factors JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 9.2 Create Predictive Analysis Edge Function
**New file**: `supabase/functions/predictive-governance/index.ts`

Analyzes historical patterns to predict:
- Likelihood of drift based on traffic patterns
- Compliance risk based on evaluation trends
- Incident probability based on error rates

### 9.3 Add Predictive Indicators to Dashboard
**Modified file**: `src/pages/Index.tsx`

Add predictive risk badges:
- "Drift likely in 24h" warning
- "Compliance risk increasing" indicator
- "Model degradation trend" alert

---

## Phase 10: Policy-as-Code Validation

### 10.1 Create Policy Linter Edge Function
**New file**: `supabase/functions/policy-lint/index.ts`

Static validation for policy configurations:
- Syntax validation
- Threshold range checks
- Conflict detection
- Regulatory alignment verification

### 10.2 Add Policy Version History
**Database migration**:
```sql
CREATE TABLE policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  validated BOOLEAN DEFAULT false,
  validation_errors JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(policy_id, version)
);
```

### 10.3 Integrate with CI/CD Gate
**Modified file**: `supabase/functions/cicd-gate/index.ts`

Add policy validation check before deployment approval.

---

## Implementation Summary

### New Database Tables (8)
| Table | Purpose |
|-------|---------|
| `auto_approval_policies` | HITL automation rules |
| `rca_templates` | Root cause analysis templates |
| `platform_config` | Unified configuration |
| `platform_config_history` | Config change tracking |
| `demo_scenarios` | Golden Demo scripts |
| `function_metrics` | Edge function observability |
| `predictive_governance` | Governance predictions |
| `policy_versions` | Policy versioning |

### New Edge Functions (7)
| Function | Purpose |
|----------|---------|
| `generate-synthetic-events` | Oversight Agent testing |
| `hitl-auto-assist` | AI-powered HITL triage |
| `incident-lifecycle` | Automated incident management |
| `detect-governance-bypass` | Security monitoring |
| `predictive-governance` | Risk prediction |
| `policy-lint` | Policy validation |
| `edge-function-metrics` | Observability wrapper |

### Modified Edge Functions (2)
| Function | Changes |
|----------|---------|
| `process-events` | Dynamic thresholds from config |
| `cicd-gate` | DB-backed rate limiting |

### New UI Components (8)
| Component | Purpose |
|-----------|---------|
| `SimulationController` | Synthetic event generation UI |
| `BulkTriagePanel` | HITL batch processing |
| `BulkResolutionPanel` | Incident batch closing |
| `Configuration.tsx` | Platform config management |
| `DemoNarrator` | Golden Demo walkthrough |
| `EdgeFunctionDashboard` | Function observability |
| `PredictiveIndicators` | Risk prediction badges |
| `PolicyLintResults` | Policy validation UI |

### Modified UI Files (4)
| File | Changes |
|------|---------|
| `HITL.tsx` | Add bulk triage, AI assist |
| `Index.tsx` | Add predictive indicators |
| `Observability.tsx` | Add function metrics |
| `useGoldenDemoOrchestrator.ts` | Add scenario-based execution |

---

## Success Criteria (Target Metrics)

| KPI | Current | Target |
|-----|---------|--------|
| Events in `events_raw` | 0 | 10,000+ |
| HITL Backlog | 546 | <50 |
| Open Incidents | 218 | <30 |
| MTTD (Critical) | N/A | ≤5 min |
| MTTR (Critical) | N/A | ≤60 min |
| Rate Limiting | Partial | 100% DB-backed |
| Golden Demo Automation | Partial | Complete |
| Config Centralization | None | 100% |
| Edge Function Observability | None | 100% |
| Governance Capabilities | 11/11 | 12/12 (with predictive) |

---

## Implementation Order

1. **Phase 1**: Synthetic Event Generator + Oversight Agent validation (unblocks all SLO measurement)
2. **Phase 2**: HITL Auto-Assist + Bulk Triage (clears 546 backlog)
3. **Phase 3**: Incident Lifecycle Engine (clears 218 incidents)
4. **Phase 8**: Rate Limiting Hardening (security requirement)
5. **Phase 4**: Unified Platform Configuration
6. **Phase 5**: Golden Demo Enhancement
7. **Phase 6**: Edge Function Observability
8. **Phase 7**: Governance Bypass Detection
9. **Phase 9**: Predictive Governance
10. **Phase 10**: Policy-as-Code Validation
