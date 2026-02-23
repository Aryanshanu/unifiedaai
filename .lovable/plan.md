
# Comprehensive End-to-End Audit Report: Fractal Unified Autonomous Governance Platform

---

## SECTION 1: ARCHITECTURE OVERVIEW

The application has **33 routed pages**, **~90 components**, **~50 hooks**, and **~50 edge functions** backed by **100+ database tables**. It follows a React + Vite + Tailwind + TypeScript frontend with Supabase (Lovable Cloud) backend.

---

## SECTION 2: ORPHANED / UNREACHABLE FILES

These files exist in `src/pages/` but have **NO route** in `App.tsx` and are **NOT referenced from the sidebar**. They are dead code.

| File | Status | Action Needed |
|------|--------|---------------|
| `src/pages/ImpactCenter.tsx` | No route, no nav link | DELETE -- its tabs are already available at `/impact-dashboard` and `/regulatory-reports` |
| `src/pages/PolicyCenter.tsx` | No route, no nav link | DELETE -- its tabs are available at `/policy`, `/data-contracts`, `/golden` |
| `src/pages/Reports.tsx` | No route, no nav link | DELETE -- duplicates `/regulatory-reports` with less functionality |
| `src/pages/Configuration.tsx` | Has route `/configuration`, redirects to `/settings` | DELETE -- pure redirect, `/settings` is already in sidebar |

**Verdict:** 4 dead page files should be removed.

---

## SECTION 3: PAGE-BY-PAGE AUDIT

### 3.1 Command Center (`/` -- Index.tsx) -- CORRECT
- Data sources: `review_queue`, `datasets`, `dq_incidents`, `data_contracts`, `data_contract_violations`, `incidents`, `models`, `platform-metrics`
- All queries hit real tables with correct columns
- Realtime subscriptions for `incidents`, `dq_incidents`, `review_queue` are correct
- **Issue:** `pendingApprovals` metric comes from `usePlatformMetrics` which queries `system_approvals.status='pending'` -- correct

### 3.2 Projects (`/projects` -- Projects.tsx) -- CORRECT
- Uses `useProjects()` and `useSystems()` hooks
- CRUD operations use correct columns
- Delete cascade fixed in recent update (21-step cascade)
- **Minor issue:** Duplicate `console.log` on line 162 and 164 in `useProjects.ts` -- cosmetic

### 3.3 Models (`/models` -- Models.tsx) -- CORRECT
- `useModels()` fetches from `models` with `system:systems(*)` and `project:projects(*)`
- Status derivation uses real `uri_score`, `fairness_score`, `robustness_score` -- mathematically sound
- `getTeamName()` generates team names from model type -- **this is fabricated data** (assigns "AI Team" to LLMs, etc.) but is cosmetic labeling, not fake metrics

### 3.4 Governance (`/governance` -- Governance.tsx) -- CORRECT
- Queries `control_frameworks`, `controls`, `control_assessments`, `attestations`
- Compliance score calculation: `(compliantAssessments / totalControls) * 100` -- mathematically correct
- Attestation download/view with data URL handling -- functional
- Realtime on `attestations` and `control_assessments` -- correct
- **Advisory Mode banner** -- honest about enforcement status

### 3.5 Approvals (`/governance/approvals` -- Approvals.tsx) -- CORRECT
- Protected with `requiredRoles={['admin', 'reviewer']}`
- Uses `useSystemApprovals()` hook

### 3.6 HITL Console (`/hitl` -- HITL.tsx) -- CORRECT
- Uses `useReviewQueue()` with correct schema
- SLA countdown, bulk triage, review decision dialog all wired
- Realtime on `review_queue` and `decisions` tables
- Queue distribution calculated from real data
- **EnforcementBadge level="enforced"** -- appropriate since HITL decisions DO write to DB

### 3.7 Decision Ledger (`/decision-ledger`) -- CORRECT
- Queries `decision_ledger` with `models:model_id(name)` join -- correct
- Hash chain display (`record_hash`, `previous_hash`) -- correct
- Stats query for today's count -- correct

### 3.8 Incidents (`/incidents`) -- CORRECT
- Uses `useIncidents()` hook
- Realtime subscriptions present

### 3.9 Observability (`/observability`) -- MOSTLY CORRECT
- KPIs from `usePlatformMetrics()` -- correct
- System Health from `useSystemHealthSummary()` -- correct
- Model Health from `useModels()` -- correct
- Drift alerts from `useDriftAlerts()` -- correct
- **Issue:** "Gateway Health" percentage calculation `(1 - errorCount/totalRequests)*100` -- correct math but misleading label (it counts HTTP 500s, not actual gateway uptime)
- Process Events button invokes `process-events` edge function -- functional

### 3.10 Alerts (`/alerts`) -- CORRECT
- Combines `drift_alerts` + `incidents` into unified alert feed
- Acknowledge/Resolve buttons write directly to correct tables
- Notification channels CRUD uses `useNotificationChannels()` -- correct
- **Issue:** Alert Rules tab renders placeholder static rules, not from DB -- **incomplete feature**

### 3.11 Evaluation Hub (`/evaluation`) -- CORRECT
- Uses `useEvaluationRuns()`, `useEvaluationSuites()`, `useEvaluationStats()`
- Score rings display real scores from `evaluation_runs`
- **Issue:** "Schedule" button and "Create Suite" `Plus` button are not wired to any action -- **non-functional buttons**

### 3.12 Impact Dashboard (`/impact-dashboard`) -- PARTIALLY FUNCTIONAL
- Queries `impact_assessments`, `decision_outcomes`, `decision_appeals` -- all real tables
- "Compute Metrics" calls `compute-population-impact` edge function -- functional
- **Issue:** `groups` array is always empty (hardcoded `[]`) because population impact computation results are not parsed back into group-level data. The group metrics table will always show "No group metrics available" even after computing.
- **Issue:** `overall` stats are hardcoded to `{ totalDecisions: 0, ... }` -- never populated from DB data

### 3.13 Regulatory Reports (`/regulatory-reports`) -- CORRECT
- CRUD on `regulatory_reports` table with correct columns (`report_content`, `document_hash`)
- Report generation via `generate-audit-report` edge function
- Download as JSON -- functional
- Approve mutation updates `status` and `approved_at` -- correct
- **Minor issue:** Insert uses `content` and `content_hash` columns but schema shows `report_content` and `document_hash` -- **potential schema mismatch** that would silently fail on insert

### 3.14 Core RAI Engines (Fairness, Toxicity, Privacy, Hallucination, Explainability) -- CORRECT
- All 5 engines follow the template pattern with InputOutputScope, ComputationBreakdown, EvidencePackage
- Call respective `eval-*` edge functions
- Results display with ComplianceBanner (NON-COMPLIANT < 70%)

### 3.15 Data Quality Engine (`/engine/data-quality`) -- CORRECT
- Complex multi-tab engine with profiling, rules, execution, monitoring
- Uses dedicated `dq-*` edge functions

### 3.16 Security Pentest (`/security/pentest`) -- RECENTLY FIXED
- Edge function remapped to correct columns in recent update
- Frontend reads results from edge function response (not DB directly for display)
- **Functional after recent fixes**

### 3.17 Security Jailbreak (`/security/jailbreak`) -- RECENTLY FIXED
- Same pattern as pentest, uses `useAttackLibrary()` for attack selection
- Attack library reads from `attack_library` table -- correct

### 3.18 Security Threat Model (`/security/threats`) -- RECENTLY FIXED

### 3.19 Security Dashboard (`/security`) -- RECENTLY FIXED
- Updated to read `summary` JSONB field for stats

### 3.20 Policy Studio (`/policy`) -- CORRECT
- Uses `compile-policy` edge function for DSL validation/compilation
- Policy CRUD on `policy_packs` table

### 3.21 Data Contracts (`/data-contracts`) -- CORRECT
- CRUD on `data_contracts` and `data_contract_violations`

### 3.22 Knowledge Graph / Lineage (`/lineage`) -- CORRECT
- Reads from `kg_nodes` and `kg_edges`
- Graph visualization present

### 3.23 Golden Demo (`/golden`) -- CORRECT
- Explicitly marked as demo data -- appropriate exception per project rules
- Multi-mode demo orchestrator

### 3.24 Runbooks (`/runbooks`) -- CORRECT
- Decision tree, escalation paths -- static but useful reference content
- RCA Templates query `rca_templates` table -- correct

### 3.25 Audit Center (`/audit-center`) -- CORRECT
- Reads from `admin_audit_log`, `dataset_quality_runs`, `datasets`, `models`, `evaluation_runs`, `incidents`
- Hash chain integrity display -- correct
- **Well-structured** multi-tab audit view

### 3.26 Settings (`/settings`) -- MOSTLY CORRECT
- General settings save to `organization_settings` -- functional
- Platform Config editor with engine weights -- functional
- Users & Teams section -- functional
- **Issue:** Security, Notifications, Integrations, API Keys, Regions sections are all **planned features** with `PlannedFeatureCard` components -- honest but non-functional
- **Issue:** The `handleSecuritySave`, `handleNotificationSave`, `handleGenerateApiKey` functions show success toasts but **do not persist anything** -- misleading UX if users expect persistence

### 3.27 Documentation (`/docs`) -- CORRECT
- 2400-line static documentation page -- comprehensive and accurate
- Still references "Fractal RAI-OS" in content (branding not fully updated)

### 3.28 Auth (`/auth`) -- CORRECT
- Standard email/password auth via Supabase Auth
- Login and signup forms

---

## SECTION 4: BACKEND (EDGE FUNCTIONS) AUDIT

### 4.1 Correctly Functioning Functions
| Function | Status |
|----------|--------|
| `eval-fairness` | Functional |
| `eval-toxicity-hf` | Functional |
| `eval-privacy-hf` | Functional |
| `eval-hallucination-hf` | Functional |
| `eval-explainability-hf` | Functional |
| `security-pentest` | Fixed (schema remapped) |
| `security-jailbreak` | Fixed (schema remapped) |
| `security-threat-model` | Fixed (schema remapped) |
| `compile-policy` | Functional |
| `generate-audit-report` | Functional |
| `generate-scorecard` | Functional |
| `ai-gateway` | Functional |
| `copilot` | Functional |
| `rai-assistant` | Functional |
| `dq-*` (all DQ functions) | Functional |

### 4.2 Functions with Potential Issues
| Function | Issue |
|----------|-------|
| `send-notification` | Creates notification_history records but actual delivery (email/Slack/webhook) is not implemented |
| `detect-drift` | Functional but depends on sufficient `request_logs` data |
| `compute-population-impact` | Returns data but frontend doesn't parse groups from response |

---

## SECTION 5: DATABASE CONSISTENCY ISSUES

| Issue | Severity | Details |
|-------|----------|---------|
| `regulatory_reports` insert uses `content` instead of `report_content` | HIGH | In `RegulatoryReports.tsx` line 91: `.insert({ content: data })` but actual column is `report_content`. Inserts will fail silently or create NULL `report_content`. |
| `security_test_runs` typed as `any` | LOW | `useSecurityScans.ts` casts to `any` to bypass type checking. Functional but loses type safety. |
| `useSecurityScans` client-side model filtering | LOW | Fetches ALL security test runs then filters by `summary.model_id` client-side. Inefficient at scale. |

---

## SECTION 6: NON-FUNCTIONAL UI ELEMENTS

These buttons/features exist in the UI but do nothing when clicked:

| Page | Element | Issue |
|------|---------|-------|
| Evaluation Hub | "Schedule" button | No handler attached |
| Evaluation Hub | "Create Suite" `Plus` button | No dialog or handler |
| Reports (orphaned) | "Filter" button | Shows toast only |
| Reports (orphaned) | "Date Range" button | Shows toast only |
| Reports (orphaned) | "Generate Report" button | No handler |
| Reports (orphaned) | Quick Generate buttons | No handlers |
| Governance | "View All" pending controls button | Disabled with tooltip "coming soon" |
| Governance | "Add Framework" button | Disabled with tooltip "coming soon" |
| Alerts | Alert Rules tab | Static placeholder content, no DB backing |
| Settings > Security | All planned features | `PlannedFeatureCard` -- not functional |
| Settings > Notifications | All planned features | `PlannedFeatureCard` -- not functional |
| Settings > Integrations | Integration toggles | State is local only, not persisted |
| Settings > API Keys | "Generate API Key" | Shows success toast but generates nothing |
| Settings > Regions | Compliance toggles | State is local only, not persisted |

---

## SECTION 7: BRANDING INCONSISTENCIES

The recent branding update missed some locations:

| File | Text Found | Should Be |
|------|-----------|-----------|
| `src/pages/Documentation.tsx` (line 78) | "Fractal RAI-OS" | "Fractal Unified Autonomous Governance Platform" |
| `src/pages/Documentation.tsx` (line 64) | "Fractal RAI-OS" in subtitle | Update needed |
| Various test fixtures | "Fractal RAI-OS" references | Update if user-facing |

---

## SECTION 8: SIDEBAR NAVIGATION AUDIT

The sidebar in `Sidebar.tsx` has **27 navigation items** across 7 sections. All items correctly link to routes defined in `App.tsx`.

**Issue:** `/configuration` is in the sidebar but just redirects to `/settings` -- should be removed from sidebar.

---

## SECTION 9: SUMMARY VERDICT

### What is CORRECT and Working:
- Core architecture (routing, auth, RLS, layout)
- All 5 RAI Evaluation Engines (Fairness, Toxicity, Privacy, Hallucination, Explainability)
- Data Quality Engine (full pipeline)
- Security Engines (Pentest, Jailbreak, Threat Model) -- post-fix
- Project/System/Model CRUD with cascade delete
- Governance compliance tracking
- HITL Console with real-time queue
- Decision Ledger with hash chain
- Audit Center with multi-source timeline
- Observability with realtime telemetry
- Alerts with notification channel management
- Policy Studio with DSL compiler
- Data Contracts
- Knowledge Graph / Lineage
- Theme toggle (dark/light)

### What Needs Fixing (Priority Order):

1. **HIGH -- `RegulatoryReports.tsx` schema mismatch**: Insert uses wrong column name (`content` instead of `report_content`). Reports cannot be saved.

2. **HIGH -- `ImpactDashboard.tsx` empty data**: `groups` and `overall` are hardcoded empty -- the page never shows real group-level metrics even after computing.

3. **MEDIUM -- 4 orphaned page files**: `ImpactCenter.tsx`, `PolicyCenter.tsx`, `Reports.tsx`, `Configuration.tsx` are dead code.

4. **MEDIUM -- Non-functional buttons**: ~12 buttons across Evaluation, Governance, Alerts, and Settings that do nothing or show fake success toasts.

5. **MEDIUM -- Settings persistence gap**: Security, Notifications, Integrations, API Keys, and Regions settings sections show UI controls that don't save to the database.

6. **LOW -- Branding**: Documentation page still says "Fractal RAI-OS" in several places.

7. **LOW -- Sidebar cleanup**: Remove `/configuration` link (it's just a redirect to `/settings`).

### What is Unnecessary Bloat:
- `ImpactCenter.tsx` -- wrapper that duplicates `/impact-dashboard` + `/regulatory-reports`
- `PolicyCenter.tsx` -- wrapper that duplicates `/policy` + `/data-contracts` + `/golden`
- `Reports.tsx` -- weaker version of `/regulatory-reports`
- `Configuration.tsx` -- empty redirect to `/settings`
- Settings sections with local-only state (Security toggles, Integration toggles, etc.) give a false sense of configurability

---

## SECTION 10: TECHNICAL RECOMMENDATIONS

1. Delete the 4 orphaned pages and remove `/configuration` from sidebar
2. Fix `RegulatoryReports.tsx` to use `report_content` column name
3. Fix `ImpactDashboard.tsx` to parse `compute-population-impact` response into `groups` and `overall`
4. Either wire non-functional buttons to real actions or replace them with `PlannedFeatureCard` (the honest approach already used in Settings)
5. Update Documentation page branding to "Fractal Unified Autonomous Governance Platform"
6. Consider adding server-side filtering for security test runs instead of client-side
