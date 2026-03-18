

# Role & Access Control Rewrite + Empty Page Cleanup

## Problem Statement

The CDAO (admin) currently has `sidebarSections: ['all']` — meaning they see every single ground-level operational page (Jailbreak Lab, AI Pentesting, Data Quality Engine, HITL Console, etc.). A Chief Data & AI Officer should see executive summaries, governance oversight, and compliance — not individual engine consoles or security testing tools. The other roles also have some access misalignments.

Additionally, several pages still contain `PlannedFeatureCard` placeholders (SSO, IP Allowlist, MLflow, Slack, PagerDuty in Settings) that should be hidden or removed.

---

## Redesigned Role Access Philosophy

```text
┌─────────────────────────────────────────────────────────────┐
│  CDAO (admin)         → Executive overview only             │
│  AI Steward (reviewer) → Governance + monitoring + oversight│
│  Agent Engineer (analyst) → Technical operations + config   │
│  Compliance Auditor (viewer) → Audit trails + compliance    │
└─────────────────────────────────────────────────────────────┘
```

### New Sidebar Sections Per Role

| Role | Sections | Rationale |
|------|----------|-----------|
| **CDAO (admin)** | `govern`, `data-governance`, `docs` | Executive sees Command Center dashboard, governance approvals, decision ledger, incidents (summaries), knowledge graph, data contracts. Does NOT see individual engines, security labs, or configuration pages. |
| **AI Steward (reviewer)** | `discover`, `monitor`, `govern`, `data-governance` | Governance oversight, HITL, incidents, monitoring. No engines, no security labs, no config. |
| **Agent Engineer (analyst)** | `discover`, `monitor`, `core-rai`, `core-security`, `data-governance`, `configure` | Full technical access — engines, security, config. No governance approvals. |
| **Compliance Auditor (viewer)** | `govern`, `data-governance`, `docs` | Audit trails, decision ledger, data contracts, documentation only. |

### Updated Route Access Map

Key changes:
- CDAO removed from: all engine routes (`/engine/*`), all security routes (`/security/*`), `/projects`, `/models`, `/environments`, `/settings`, `/continuous-evaluation`, `/evaluation`
- CDAO added to: governance, decision ledger, incidents, knowledge graph, data contracts — executive-level oversight pages
- Settings restricted to `analyst` only (the person who actually configures things)
- Governance approvals: `admin` + `reviewer` (CDAO approves, steward manages)

### New Default Routes

| Role | Default Route | Why |
|------|---------------|-----|
| CDAO | `/` | Executive Command Center |
| AI Steward | `/hitl` | Governance console (unchanged) |
| Agent Engineer | `/projects` | Technical workspace (unchanged) |
| Compliance Auditor | `/decision-ledger` | Audit trail (unchanged) |

---

## Empty/Placeholder Content to Hide

After searching the codebase:

1. **Settings → Security section**: Still has `PlannedFeatureCard` for "SSO" and "IP Allowlist" — keep these as they're clearly labeled "Enterprise feature" and are supplementary to the working security controls
2. **Settings → Integrations section**: Has `PlannedFeatureCard` for "MLflow", "Slack", "PagerDuty" — remove these placeholder cards since they add visual noise with zero functionality

No fully empty pages were found — all sidebar routes render real content with real data queries.

---

## Files to Change

### 1. `src/lib/role-personas.ts`
- Update `PERSONA_MAP.admin.sidebarSections` from `['all']` to `['govern', 'data-governance', 'docs']`
- Update `ROUTE_ACCESS_MAP` to remove CDAO from ground-level operational routes
- Add `analyst` to `/settings` access
- Remove `admin` from engine and security routes

### 2. `src/components/layout/Sidebar.tsx`
- No structural changes needed — the `filterNavItems` function already handles section filtering correctly
- CDAO will now naturally see only Command Center + Govern + Data Governance + Docs sections

### 3. `src/pages/Settings.tsx`
- Remove the 3 `PlannedFeatureCard` entries for MLflow, Slack, PagerDuty from the Integrations section
- Keep SSO and IP Allowlist cards since they're honestly labeled as enterprise features

### 4. `src/components/auth/ProtectedRoute.tsx`
- Update the `canAccessRoute` function call — currently it short-circuits for `admin` role (`if (roles.includes('admin')) return true`). This must be removed so CDAO is subject to the same route access map as everyone else.

### 5. `src/lib/role-personas.ts` — `canAccessRoute` function
- Remove the `if (roles.includes('admin')) return true` bypass at line 142. CDAO access is now explicitly defined in `ROUTE_ACCESS_MAP` like all other roles.

