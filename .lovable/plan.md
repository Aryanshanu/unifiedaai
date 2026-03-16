

# Role-Based UI Views: 4 Persona-Driven Experiences

## Role Design & Gap Analysis

The three roles you specified map to clear organizational functions. The gap between them is **Compliance & Audit** -- the person who needs to review evidence, sign attestations, generate regulatory reports, and manage the audit trail. This role bridges the AI Steward (governance) and the Chief Data & AI Officer (executive) but focuses specifically on regulatory readiness and evidence integrity.

### The 4 Roles

| Role | Persona | Core Responsibility | Current Enum Mapping |
|------|---------|-------------------|---------------------|
| **Chief Data & AI Officer** | Executive leadership | High-level KPIs, risk posture, compliance status, board-ready reporting | `admin` (reuse) |
| **AI Steward** | Governance & risk manager | Policy enforcement, risk assessments, HITL reviews, incident management, approvals | `reviewer` (reuse) |
| **Agent Engineer** | Technical builder | Model/agent registration, evaluation engines, security testing, data quality, configurations | `analyst` (reuse) |
| **Compliance Auditor** | Regulatory & audit specialist | Audit trails, attestations, regulatory reports, evidence packages, decision ledger | `viewer` (reuse) |

**Why reuse the existing enum:** The 4 existing database roles (`admin`, `reviewer`, `analyst`, `viewer`) map 1:1 to these personas. Changing the enum would require rewriting every RLS policy (340+ references across 14 migration files). Instead, we map the personas to existing roles at the UI layer and filter the sidebar/dashboard accordingly. Zero database disruption.

---

## What Each Role Sees

### Chief Data & AI Officer (`admin`)
**Sidebar sections:** All sections visible (full platform access)
**Dashboard:** Executive Command Center
- Overall platform health score (single number)
- Compliance posture across all frameworks (EU AI Act, NIST, ISO 42001, SOC 2)
- Risk distribution heatmap (critical/high/medium/low across all systems)
- Top 5 incidents requiring attention
- Pending approvals count
- Model portfolio summary (total models, % compliant, avg scores)
- Trend charts (risk trajectory over 30 days)

### AI Steward (`reviewer`)
**Sidebar sections:** DISCOVER, Monitor, Govern, DATA GOVERNANCE (no CORE RAI engines, no CORE SECURITY, no Configure except Docs)
**Dashboard:** Governance & Risk Operations Center
- Pending HITL reviews with SLA countdown
- Active incidents by severity
- Policy violation trends
- Risk assessment queue
- Approval pipeline status
- Drift alerts summary
- Recent decision ledger entries

### Agent Engineer (`analyst`)
**Sidebar sections:** DISCOVER, Monitor, CORE RAI, CORE SECURITY, DATA GOVERNANCE, Configure (Projects, Models, Environments)
**Dashboard:** Technical Operations Center
- Model evaluation scores (fairness, toxicity, privacy, hallucination)
- Recent evaluation runs with pass/fail
- Data quality pipeline status
- Security scan results
- Agent trace activity
- Drift detection alerts
- Active data contracts status

### Compliance Auditor (`viewer`)
**Sidebar sections:** Govern (read-only), DATA GOVERNANCE (read-only), Documentation
**Dashboard:** Audit & Compliance Center
- Compliance framework coverage (% controls assessed per framework)
- Attestation status (pending/signed/expired)
- Audit trail integrity (hash chain verification status)
- Recent regulatory reports generated
- Evidence package inventory
- Decision ledger summary (read-only)
- Open incidents requiring documentation

---

## Implementation Plan

### 1. Database Migration -- Role-to-Persona Display Mapping
Create a `role_personas` table that maps `app_role` enum values to display names and metadata. No enum changes needed.

```sql
CREATE TABLE public.role_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  icon text,
  default_route text NOT NULL DEFAULT '/',
  sidebar_sections jsonb NOT NULL DEFAULT '[]',
  dashboard_layout text NOT NULL DEFAULT 'default'
);

INSERT INTO role_personas (role, display_name, description, icon, default_route, sidebar_sections, dashboard_layout) VALUES
('admin', 'Chief Data & AI Officer', 'Executive oversight of AI governance, risk posture, and compliance across the enterprise', 'crown', '/', '["all"]', 'executive'),
('reviewer', 'AI Steward', 'Governance and risk management, policy enforcement, HITL reviews, and incident response', 'shield-check', '/hitl', '["discover","monitor","govern","data-governance"]', 'governance'),
('analyst', 'Agent Engineer', 'Technical configuration, model evaluation, security testing, and data quality operations', 'wrench', '/projects', '["discover","monitor","core-rai","core-security","data-governance","configure"]', 'technical'),
('viewer', 'Compliance Auditor', 'Regulatory compliance, audit trails, evidence packages, and attestation management', 'file-check', '/decision-ledger', '["govern","data-governance","docs"]', 'compliance');
```

### 2. Update Auth Page (`src/pages/Auth.tsx`)
- After sign-up, show a role selection step (4 cards with persona name, icon, description)
- On selection, insert into `user_roles` table
- Existing sign-in flow unchanged -- role is already loaded from `user_roles`

### 3. Create Role-Specific Dashboard Components
- `src/components/dashboard/ExecutiveDashboard.tsx` -- for Chief Data & AI Officer
- `src/components/dashboard/GovernanceDashboard.tsx` -- for AI Steward
- `src/components/dashboard/TechnicalDashboard.tsx` -- for Agent Engineer
- `src/components/dashboard/ComplianceDashboard.tsx` -- for Compliance Auditor

### 4. Update `src/pages/Index.tsx`
- Read user's role from `useAuth()`
- Render the corresponding dashboard component
- All 4 dashboards pull from existing hooks/tables -- no new backend queries needed

### 5. Update `src/components/layout/Sidebar.tsx`
- Filter `navItems` based on user's role using the `role_personas.sidebar_sections` mapping
- Add role badge next to the logo showing current persona

### 6. Update `src/components/layout/Header.tsx`
- Display persona name instead of raw role enum
- Show persona-appropriate icon

### 7. Update `src/hooks/useAuth.tsx`
- Add `persona` field derived from role mapping
- Add `primaryRole` getter that returns the display-friendly persona name

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| Database migration | CREATE | `role_personas` table with seed data |
| `src/pages/Auth.tsx` | EDIT | Add role selection step after sign-up |
| `src/components/dashboard/ExecutiveDashboard.tsx` | CREATE | CDAO dashboard |
| `src/components/dashboard/GovernanceDashboard.tsx` | CREATE | AI Steward dashboard |
| `src/components/dashboard/TechnicalDashboard.tsx` | CREATE | Agent Engineer dashboard |
| `src/components/dashboard/ComplianceDashboard.tsx` | CREATE | Compliance Auditor dashboard |
| `src/pages/Index.tsx` | EDIT | Route to role-specific dashboard |
| `src/components/layout/Sidebar.tsx` | EDIT | Filter nav items by role |
| `src/components/layout/Header.tsx` | EDIT | Show persona name/icon |
| `src/hooks/useAuth.tsx` | EDIT | Add persona metadata |
| `src/components/auth/ProtectedRoute.tsx` | EDIT | No changes needed (existing role checks work) |

## What Is NOT Disrupted

- All existing RLS policies remain untouched (340+ references to `app_role` enum preserved)
- All existing edge functions remain untouched (they check `admin`, `reviewer`, `analyst`, `viewer`)
- All existing pages remain accessible -- only sidebar visibility changes per role
- The `admin` role (CDAO) still sees everything
- No enum changes, no schema breaks, no migration conflicts

