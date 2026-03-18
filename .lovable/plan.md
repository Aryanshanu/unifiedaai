

# Fractal RAI-OS 2.0: Phased Implementation Plan

## Scope Assessment

The uploaded document describes 5 concrete implementations plus a broader architectural vision (4 immersive experiences, unified entity model). The 5 implementations are actionable now. The broader vision (Entity Explorer, Governance Timeline, Decision Forensics) requires a separate phase after the foundation is solid.

This plan covers **Phase 1: Gap Closure** -- the 5 specific implementations that turn placeholders into working features.

---

## Implementation 1: Framework CRUD

**Current state:** "Add Framework" button disabled with "coming soon" tooltip on Governance page.

**What to build:**
- New edge function `framework-crud` supporting GET/POST/DELETE with JWT validation
- New database tables: `frameworks`, `framework_domains`, `framework_controls`, `control_assessments` (with RLS + session isolation)
- KG sync trigger on `frameworks` table
- Dialog-based framework builder on Governance page using `react-hook-form` + `useFieldArray` for nested domains/controls
- Replace the disabled "Add Framework" button with a working "Create Framework" dialog
- Framework cards showing domain count, control count, compliance score
- Activate/archive lifecycle

**Database changes:** 4 new tables with RLS policies scoped by `auth.uid()`. Hash chain on `control_assessments`.

---

## Implementation 2: Settings -- Replace All Placeholders

**Current state:** Security, Notifications, API Keys, Regions sections all use `PlannedFeatureCard` placeholders.

**What to build:**

### Security Settings
- New `security_config` table (single row per user) storing MFA preferences, session timeout, password policy, audit retention
- Functional UI with Switch toggles for MFA, session timeout selector, active sessions list
- Save persists to database (not just toast)

### Notification Settings  
- New `notification_channels` table (type: email/slack/webhook, events array, enabled boolean)
- Channel CRUD UI: add email/slack/webhook channels, select subscribed events
- Test notification button (calls existing `send-notification` edge function)
- Default routing rules display

### API Keys
- New `api_keys` table (name, key_hash, key_preview, permissions, expires_at, rate_limit)
- Generate key UI (show once, copy to clipboard)
- Revoke key UI
- Edge function `api-key-manage` for create/revoke with AES-256 key generation

### Regions & Compliance
- Functional UI reading/writing to `organization_settings` table (add columns: `data_residency`, `compliance_frameworks`, `gdpr_enabled`, `ccpa_enabled`, `audit_retention_years`)
- Framework checkbox list (EU AI Act, NIST, SOC2, ISO 42001)
- Data residency dropdown

**Database changes:** 3 new tables + column additions to `organization_settings`. All with RLS.

---

## Implementation 3: Environment Management

**Current state:** Read-only cards showing `deployment_environments` table data.

**What to build:**
- Create Environment dialog (name, type dev/staging/prod, region, auto-destroy days for dev)
- Environment detail view with deployed systems count
- Deploy/Promote/Rollback actions (UI + mutations to `deployment_environments`)
- Destroy button for non-production environments
- New columns on existing `deployment_environments`: `session_id`, `region`, `status`, `auto_destroy_at`

**Database changes:** Alter existing `deployment_environments` table + add RLS with session scoping.

---

## Implementation 4: Continuous Evaluation Cron

**Current state:** Schedules are CRUD'd in `evaluation_schedules` table but never executed. The `run-scheduled-evaluations` edge function exists but no cron trigger calls it.

**What to build:**
- Enable `pg_cron` and `pg_net` extensions
- Create cron job: `SELECT cron.schedule(...)` calling `run-scheduled-evaluations` every 15 minutes
- Add `evaluation_schedule_runs` table for run history logging
- Update edge function to log runs and auto-create incidents on failures
- UI enhancement: show run history, last run status, next scheduled run time

**Database changes:** 1 new table (`evaluation_schedule_runs`), cron job creation via SQL insert.

---

## Implementation 5: Governance Enforcement Mode

**Current state:** Advisory mode only -- the `EnforcementBadge` shows "Advisory" and violations generate warnings but don't block.

**What to build:**
- New `governance_policies` table (condition rules like min_quality_score, required_approval, max_risk_score)
- New `governance_enforcements` table (audit log of policy checks: allowed/blocked/warning/escalated)
- Add `governance_mode` column to `platform_config` (advisory | enforced)
- `GovernanceEnforcementSwitch` component on Governance page (admin only)
- `check-governance` edge function that evaluates policies against a target
- `useGovernanceCheck` hook for pre-action policy validation
- Policy builder UI: create rules with condition type, threshold, and action (block/warn/require_approval)
- Override flow: blocked actions can be overridden with justification (logged to enforcements table)

**Database changes:** 2 new tables + 1 column addition.

---

## Implementation Order

| Step | What | Why First |
|------|------|-----------|
| 1 | Framework CRUD | Unblocks governance page -- most visible gap |
| 2 | Settings completion | Removes all "coming soon" placeholders |
| 3 | Governance Enforcement | Transforms advisory → enforced (core value prop) |
| 4 | Continuous Eval Cron | Makes schedules actually execute |
| 5 | Environment Management | Enhances existing read-only page |

---

## What This Plan Does NOT Cover (Phase 2)

- **4 Immersive Experiences** (Entity Explorer, Governance Timeline, Decision Forensics) -- requires significant routing/navigation overhaul
- **Data Isolation** (session_id on all tables) -- requires migrating ~30+ tables and all RLS policies
- **Unified Entity Model** (FractalEntity interface) -- architectural refactor across entire codebase
- **Self-Healing Governance Agent** -- requires autonomous AI agent infrastructure
- **Predictive Governance** -- requires ML trend analysis

These are Phase 2 items that build on top of Phase 1's foundation.

---

## Estimated Scope

- **New database tables:** ~10
- **New/modified edge functions:** ~3
- **New UI components:** ~8
- **Modified pages:** 3 (Governance, Settings, EnvironmentManagement)
- **New pages:** 0 (all features integrate into existing pages)

This will be implemented across multiple messages due to the volume of changes. Each implementation will be a separate focused batch.

