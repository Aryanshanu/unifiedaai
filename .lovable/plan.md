
## Goal (what you asked for)
1) Produce an end-to-end, **no-hallucination** architecture map for the sidebar domains you named: **Monitor, Govern, Respond, Impact, Configure**:
- what the UI shows
- which frontend files/hooks power it
- which backend tables/functions it uses
- how realtime syncing works

2) Identify and remove/replace anything that is **fake, simulated, hardcoded, misleading, or “looks real but isn’t”** across those areas (and any cross-cutting UI like header badges).

3) Enforce a consistent “truth” pattern:
- if data exists: show it (derived from backend)
- if it doesn’t: show **N/A / Not available** (not “100”, not random, not “healthy”)
- all clickable things either work end-to-end or are removed (no dead/disabled “coming soon” controls in production UI)

---

## What I already verified in code (evidence-based, not guessing)

### A) Sidebar routing (source of truth)
- **Routes defined in**: `src/App.tsx`
- **Sidebar items defined in**: `src/components/layout/Sidebar.tsx`

The sections you asked about map to these core routes:

**Monitor**
- `/observability` → `src/pages/Observability.tsx`
- `/alerts` → `src/pages/Alerts.tsx`

**Govern**
- `/governance/approvals` → `src/pages/Approvals.tsx`
- `/decision-ledger` → `src/pages/DecisionLedger.tsx`
- `/hitl` → `src/pages/HITL.tsx`
- `/incidents` → `src/pages/Incidents.tsx`
- `/lineage` → `src/pages/Lineage.tsx`

**Respond**
- `/policy` → `src/pages/Policy.tsx`
- `/golden` → `src/pages/GoldenDemoV2.tsx` (explicit demo page, allowed exception)

**Impact**
- `/impact-dashboard` → `src/pages/ImpactDashboard.tsx`
- `/regulatory-reports` → `src/pages/RegulatoryReports.tsx`

**Configure**
- `/projects` → `src/pages/Projects.tsx`
- `/models` → `src/pages/Models.tsx`
- `/configuration` → `src/pages/Configuration.tsx` (redirects to `/settings`)
- `/runbooks` → `src/pages/Runbooks.tsx`
- `/settings` → `src/pages/Settings.tsx`
- `/docs` → `src/pages/Documentation.tsx`

---

## Critical “fake/simulated/hardcoded” problems found (must be fixed)

### 1) Simulated numbers and simulated “sync”
**File**: `src/components/data/DataSourceConnectors.tsx`
- Uses `setTimeout()` to “simulate sync completion”
- Sets `row_count` using `Math.random()`
This violates your “all numbers must be real” requirement.

### 2) Synthetic event generation exposed in normal UI
**File**: `src/components/oversight/SimulationController.tsx`
- Calls backend function `generate-synthetic-events`
- Shows “Starting synthetic event generation…”
Even if this is “for testing”, it cannot be present in normal production navigation unless it’s restricted to `/golden` only (your exception).

### 3) “Fallback to 100” creates fake health/risk
These patterns fabricate “healthy/minimal” status when scores are missing:
- `fairness_score ?? 100`, `robustness_score ?? 100`
Found in:
- `src/pages/Observability.tsx` (`getModelStatus`)
- `src/pages/Models.tsx` (status/risk fallback)
- `src/components/dashboard/ModelCard.tsx` (`getRiskFromScores`)
This produces incorrect UI when no evaluations exist.

### 4) Alerts page has disabled “coming soon” actions (dead UI)
**File**: `src/pages/Alerts.tsx`
- Filter button disabled with “coming soon”
- Acknowledge/Resolve disabled with “coming soon”
- “Alert Rules” tab is explicitly “reference only” and includes hardcoded rule examples

This fails your mandate: no placeholder controls in production UI.

### 5) Observability has “oversight simulation” exposed + other partial tooling
**File**: `src/pages/Observability.tsx`
- Contains an “Oversight Agent” tab that renders `SimulationController` (synthetic generator)
- Also includes some “not implemented” notes

### 6) Impact Dashboard currently has logic gaps that can look like “real metrics”
**File**: `src/pages/ImpactDashboard.tsx`
- Declares arrays like `groups` and `alerts` but doesn’t populate them from real queries
- Some stats can default to “0” or “100%” without being backed by computation output
This needs tightening so it never implies computed results if none were computed.

### 7) Header notifications indicator is always “on”
**File**: `src/components/layout/Header.tsx`
- Notification bell shows a red dot unconditionally.
That is a “fake signal” if there are zero open alerts/incidents.

### 8) Demo data seeding code exists (even if not wired into header right now)
**File**: `src/hooks/useDemoMode.ts`
- Defaults demo mode to TRUE for new visitors via localStorage
- Contains seeding logic that calls backend functions and inserts “demo” records
Your comment says “auto-init disabled”, and I did not find it actively called from main UI right now, but the existence + default behavior is risky. We should hard-lock this so demo seeding is only possible from `/golden`.

### 9) Core RAI non-compliance → incident+alerts is inconsistent across engines
From the backend functions inspected:
- `eval-toxicity-hf` and `eval-privacy-hf` already create:
  - `review_queue` item
  - `incidents` row
  - `drift_alerts` row (as a visibility “alert”)
- `eval-fairness`, `eval-hallucination-hf`, `eval-explainability-hf` (in the ranges inspected) still **only** escalate to `review_queue` but do **not** consistently create `incidents` + `drift_alerts`.
This creates gaps where “non-compliant” doesn’t propagate uniformly into Alerts/Incidents.

---

## Deliverable 1: “How each sidebar feature works end-to-end” (architecture map)
Instead of trying to “explain everything” verbally in chat (which becomes un-auditable), I will implement an in-app **Architecture & Truth Map** under `/docs` with a strict template per sidebar page:

For each page (Observability, Alerts, Approvals, Decision Ledger, HITL, Incidents, Knowledge Graph, Policy, Impact Dashboard, Regulatory Reports, Projects, Models, Settings):
- Purpose (plain English)
- UI Components (frontend file(s))
- Data sources (tables + key columns)
- Backend functions invoked (name + request/response shape)
- Realtime subscriptions (which tables, what gets invalidated)
- Metrics & formulas shown (where computed, with formula + units)
- Escalation rules (when it creates Incident, Alert, HITL item)
- “Truth rules” (what shows as N/A, what is computed, what is blocked)

This turns your requirement into something reviewable and enforceable.

---

## Deliverable 2: Remove/replace fake/simulated UI + enforce “truth UI” everywhere

### Phase 1 — Purge simulation from production navigation (highest priority)
1) Remove `SimulationController` from `/observability` (keep it only for `/golden` if you still want synthetic generation there).
2) Ensure any synthetic generators and demo seeders are gated by:
   - route == `/golden` OR query param `?sandbox=true` (explicit)  
   - and never run automatically

Files:
- `src/pages/Observability.tsx`
- `src/components/oversight/SimulationController.tsx`
- `src/hooks/useDemoMode.ts`
- any other demo seed entry points discovered during implementation

Acceptance:
- No UI path outside `/golden` can generate synthetic events or seed demo data.

---

### Phase 2 — Remove “fake defaults” (replace with “N/A / Unknown”)
1) Replace `?? 100` fallbacks for model scores:
- If `fairness_score`/`robustness_score` is null → status becomes `"unknown"` (new UI state) and UI shows “N/A” not “healthy”.

2) Update `ModelCard` and `Models` page helpers:
- Risk level and environment must not be inferred from missing scores.

Files:
- `src/components/dashboard/ModelCard.tsx`
- `src/pages/Models.tsx`
- `src/pages/Observability.tsx`

Acceptance:
- A brand new model with no evals never appears “minimal risk / healthy / production” by default.

---

### Phase 3 — Alerts page: remove disabled “coming soon” and make it fully functional
Implement real actions:
- **Filter** (client-side filter is fine, but must work)
- **Acknowledge** and **Resolve** must update backend records:
  - Incidents: update `incidents.status`
  - Drift alerts: update `drift_alerts.status`
If the schema doesn’t support “acknowledged” as a distinct status, we will:
- either add a column like `acknowledged_at`, `acknowledged_by`
- or add `status = 'acknowledged'` (with migration updating enum/constraints if needed)

Also: remove the “Alert Rules” tab if it’s not backed by real enforcement, or fully implement it using persisted configuration (no “reference only” pretending).

Files:
- `src/pages/Alerts.tsx`
- Potential DB migration (depending on existing `drift_alerts` fields)

Acceptance:
- No disabled “coming soon” buttons remain on Alerts.
- Every displayed alert row can be actioned and updates in realtime.

---

### Phase 4 — Data source connectors: remove random row counts + simulated sync
Minimum truth-safe behavior:
- If we cannot actually sync to an external database/API yet, then:
  - “Sync” must be removed, or replaced with a backend-driven operation that returns real results (even if results are “Not supported yet”)
  - `row_count` must come from real ingestion metrics or be shown as N/A

Files:
- `src/components/data/DataSourceConnectors.tsx`
- Potential new backend function to validate connectors (if we keep “Sync”)

Acceptance:
- No `Math.random()` affects displayed data.
- No setTimeout “fake sync completion”.

---

### Phase 5 — Governance chain correctness (Decision Ledger truth)
The current UI shows “Chain Valid” based on a weak heuristic.
We will implement actual chain verification:
- recompute each record hash deterministically from canonical fields
- verify `previous_hash` matches the prior row’s `record_hash`
- show “Valid / Broken / Unknown” with evidence

Files:
- `src/pages/DecisionLedger.tsx`
- possibly shared hash utilities (frontend-only verification using WebCrypto SHA-256)

Acceptance:
- “Chain Valid” is only shown if validated, otherwise “Not validated / Broken”.

---

### Phase 6 — Standardize escalation rules so everything routes consistently
Define a single escalation contract used by:
- Data Quality incidents
- All Core RAI engines

Contract:
- Non-compliant evaluation ⇒ create:
  1) `incidents` row (canonical incident)
  2) `review_queue` row (human decision required)
  3) `drift_alerts` row (visibility on Alerts page) OR a dedicated `alerts` table if you prefer cleaner separation

Then ensure HITL decisions:
- can resolve/close linked incident(s)
- can resolve corresponding alert(s)

Files (backend):
- `supabase/functions/eval-fairness/index.ts`
- `supabase/functions/eval-hallucination-hf/index.ts`
- `supabase/functions/eval-explainability-hf/index.ts`
- (verify DQ path) `supabase/functions/dq-raise-incidents/index.ts`

Acceptance:
- Any engine failure is visible in:
  - Incidents page
  - Alerts page
  - HITL queue
…and linked, not duplicated without traceability.

---

### Phase 7 — Header truth
- Notification dot should reflect actual open alerts/incidents count.
- If count == 0, show no dot.

Files:
- `src/components/layout/Header.tsx`
- small hook (or reuse existing hooks) to compute open items

Acceptance:
- Header never signals “new notifications” if there are none.

---

## End-to-end verification (what “100% real-time + no fake” means in practice)
I will run a “Brutal Audit” style checklist across each sidebar area:

For each page:
1) Open page with empty DB state → must show empty state, not fabricated numbers.
2) Trigger a real event (example):
   - run a DQ pipeline to create a DQ incident
   - run a Core RAI eval that fails threshold
   - run a pentest scan that creates findings
3) Confirm realtime propagation:
   - new records appear in Alerts
   - incident appears in Incidents
   - HITL item appears in HITL queue
4) Confirm actions work:
   - acknowledge/resolve updates backend state
   - state changes reflect across pages via realtime subscriptions
5) Confirm UI never shows raw technical errors:
   - replace direct `toast.error(error.message)` patterns with sanitized messaging or centralized wrappers (`safeInvoke`, `sanitizeErrorMessage`).

---

## Files expected to change (implementation scope)
Frontend (high confidence):
- `src/pages/Observability.tsx`
- `src/pages/Alerts.tsx`
- `src/components/layout/Header.tsx`
- `src/pages/ImpactDashboard.tsx`
- `src/components/data/DataSourceConnectors.tsx`
- `src/pages/Models.tsx`
- `src/components/dashboard/ModelCard.tsx`
- `src/pages/DecisionLedger.tsx`
- `/docs` page updates (likely `src/pages/Documentation.tsx`)

Backend functions (high confidence):
- `supabase/functions/eval-fairness/index.ts`
- `supabase/functions/eval-hallucination-hf/index.ts`
- `supabase/functions/eval-explainability-hf/index.ts`
- verify/adjust `supabase/functions/dq-raise-incidents/index.ts`

Database migration (possible, depending on current schema):
- Add acknowledged fields/status support for alerts/incidents if missing
- Add linkage fields or standardize linkage via `metadata` JSON

---

## Acceptance criteria (what you can use to judge “40% → 100%”)
1) No user-visible simulated numbers (no random counts, no fake “sync”).
2) No default “100” or “healthy” when data is missing; must be “N/A/Unknown”.
3) Alerts page has working Filter + Acknowledge + Resolve (no disabled placeholders).
4) Non-compliant results consistently create and link:
   - Incident
   - Alert visibility
   - HITL escalation
5) Header notification indicator reflects real counts only.
6) `/golden` remains the only place where synthetic/demo behaviors are allowed.

