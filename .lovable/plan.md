

# Remove Non-Operational Pages + Complete Role-Access Matrix

## Pages to Remove

After auditing every page in the sidebar, only **2 pages** are non-operational:

1. **Decision Ledger** (`/decision-ledger`) — Queries `decision_ledger` table but has no write path; the table is only populated by demo seeder. Not a real operational feature.
2. **Governance API** (`/governance-framework`) — A static API documentation page with a live tester that hits an edge function. Not an operational governance page.

All other pages (AuditCenter, Governance, EnvironmentManagement, ContinuousEvaluation, etc.) have real database queries and functional CRUD operations.

## Changes

### 1. `src/components/layout/Sidebar.tsx`
- Remove the 2 nav items: `{ path: "/decision-ledger", ... }` and `{ path: "/governance-framework", ... }`

### 2. `src/App.tsx`
- Remove the lazy imports for `DecisionLedger` and `GovernanceFramework`
- Remove their `<Route>` entries

### 3. `src/lib/role-personas.ts`
- Remove `/decision-ledger` and `/governance-framework` from `ROUTE_ACCESS_MAP`
- Change Compliance Auditor's `defaultRoute` from `/decision-ledger` to `/audit-center` (their primary operational page)

### 4. `src/components/dashboard/GovernanceDashboard.tsx`
- Remove the "Recent Decisions" card (lines 164-191) that links to `/decision-ledger`
- Remove the `recentDecisions` query (lines 55-66)
- Replace the 2-column grid with a single HITL Queue card (full width)

### 5. `src/components/dashboard/ComplianceDashboard.tsx`
- Remove the "Decision Ledger (Hash-Chain)" card (lines 177-206)
- Remove the `recentDecisions` query (lines 65-76)
- Replace the 2-column grid with a single Attestations card (full width)

### 6. `src/pages/Documentation.tsx`
- Remove Step 4 "Review the Decision Ledger" (lines 559-597)
- Remove Section 8.2 "Decision Ledger" (lines 1582-1650+)
- Update incident response workflow text (line 2395) to remove "Decision Ledger" reference

---

## Complete Role-Access Matrix (What You Asked For)

```text
┌──────────────────────────────────────────────────────────────────────┐
│ PAGE                        │ CDAO │ Steward │ Engineer │ Auditor   │
├──────────────────────────────┼──────┼─────────┼──────────┼───────────┤
│ Command Center (/)          │  ✓   │    ✓    │    ✓     │    ✓      │
│                             │      │         │          │           │
│ DISCOVER                    │      │         │          │           │
│  AI Discovery               │      │    ✓    │    ✓     │           │
│  Agent Governance            │      │    ✓    │    ✓     │           │
│                             │      │         │          │           │
│ MONITOR                     │      │         │          │           │
│  Observability              │      │    ✓    │    ✓     │           │
│  Alerts                     │      │    ✓    │    ✓     │           │
│  Continuous Eval            │      │         │    ✓     │           │
│                             │      │         │          │           │
│ GOVERN                      │      │         │          │           │
│  Approvals                  │  ✓   │    ✓    │          │           │
│  HITL Console               │  ✓   │    ✓    │          │           │
│  Incidents                  │  ✓   │    ✓    │          │    ✓      │
│  Knowledge Graph            │  ✓   │    ✓    │          │    ✓      │
│  Audit Center               │  ✓   │    ✓    │          │    ✓      │
│                             │      │         │          │           │
│ DATA GOVERNANCE             │      │         │          │           │
│  Data Quality Engine        │      │    ✓    │    ✓     │    ✓      │
│  Data Contracts             │  ✓   │    ✓    │    ✓     │    ✓      │
│  Semantic Layer             │  ✓   │    ✓    │    ✓     │    ✓      │
│  Feature Store              │  ✓   │    ✓    │    ✓     │    ✓      │
│                             │      │         │          │           │
│ CORE RAI                    │      │         │          │           │
│  Fairness Engine            │      │         │    ✓     │           │
│  Hallucination Engine       │      │         │    ✓     │           │
│  Toxicity Engine            │      │         │    ✓     │           │
│  Privacy Engine             │      │         │    ✓     │           │
│  Explainability Engine      │      │         │    ✓     │           │
│                             │      │         │          │           │
│ CORE SECURITY               │      │         │          │           │
│  Security Dashboard         │      │         │    ✓     │           │
│  AI Pentesting              │      │         │    ✓     │           │
│  Jailbreak Lab              │      │         │    ✓     │           │
│  Threat Modeling            │      │         │    ✓     │           │
│                             │      │         │          │           │
│ CONFIGURE                   │      │         │          │           │
│  Projects                   │      │         │    ✓     │           │
│  Models                     │      │         │    ✓     │           │
│  Environments               │      │         │    ✓     │           │
│  Settings                   │      │         │    ✓     │           │
│  Documentation              │  ✓   │    ✓    │    ✓     │    ✓      │
└──────────────────────────────┴──────┴─────────┴──────────┴───────────┘
```

**Removed pages** (Decision Ledger, Governance API) are gone from all roles.

