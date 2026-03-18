

# Implementation Plan: Complete All 5 Gap Closures

## Status Check
- **Implementation 1 (Framework CRUD)**: Already completed in prior message
- **Implementations 2-5**: All pending, will be done sequentially

## Existing Infrastructure
- `notification_channels` table: EXISTS (has channel_type, config, enabled, name, user_id)
- `notification_history` table: EXISTS
- `organization_settings` table: EXISTS (basic fields only)
- `deployment_environments` table: EXISTS (read-only, no session_id/region/status columns)
- `evaluation_schedules` table: EXISTS (CRUD works, no cron trigger)
- `platform_config` table: EXISTS (no governance_mode column)
- Tables NOT existing: `security_config`, `api_keys`, `governance_policies`, `governance_enforcements`, `evaluation_schedule_runs`

---

## Implementation 2: Settings — Replace All Placeholders

### Database Changes (Migration)
1. Create `security_config` table (user_id, mfa_enabled, session_timeout_minutes, password_min_length, require_special_chars, audit_retention_days) with RLS
2. Create `api_keys` table (user_id, name, key_hash, key_preview, permissions jsonb, expires_at, last_used_at, rate_limit, is_active) with RLS
3. Add columns to `organization_settings`: data_residency, compliance_frameworks (jsonb), gdpr_enabled, ccpa_enabled, audit_retention_years

### UI Changes
- **Security section** (`Settings.tsx`): Replace 5 `PlannedFeatureCard` with functional controls — MFA toggle, session timeout selector, password policy switches, audit retention selector. All persist to `security_config` table via new `useSecurityConfig` hook.
- **Notifications section**: Replace `PlannedFeatureCard` with channel CRUD using existing `useNotificationChannels` hook. Add channel type selector (email/slack/webhook), config fields, enable/disable toggles, test button.
- **API Keys section**: Replace single `PlannedFeatureCard` with key generator UI — name input, generate button, copy-once display, key list with revoke. Uses new `useApiKeys` hook against `api_keys` table.
- **Regions section**: Wire existing dropdowns to persist to `organization_settings` via `useUpdateSettings`. Add compliance framework checkboxes that save to DB.

### New Hooks
- `src/hooks/useSecurityConfig.ts` — CRUD for security_config table
- `src/hooks/useApiKeys.ts` — generate/list/revoke API keys

---

## Implementation 3: Environment Management

### Database Changes (Migration)
- Add columns to `deployment_environments`: `status` (text, default 'active'), `region` (text), `created_by` (uuid), `auto_destroy_at` (timestamptz)
- Enable RLS on `deployment_environments` (currently likely open)

### UI Changes
- Add "Create Environment" dialog to `EnvironmentManagement.tsx` with name, display_name, type (dev/staging/prod), region, approval_required, max_risk_tier, auto_monitoring toggles
- Add action buttons per card: Edit settings, Delete (non-production only)
- Add `useCreateEnvironment`, `useUpdateEnvironment`, `useDeleteEnvironment` mutations to the existing `useEnvironments` pattern

---

## Implementation 4: Continuous Evaluation Cron

### Database Changes (Migration)
- Create `evaluation_schedule_runs` table (schedule_id FK, started_at, completed_at, status, results jsonb, error_message, engines_run text[]) with RLS
- Enable `pg_cron` and `pg_net` extensions

### Cron Setup (Insert tool, NOT migration)
- Schedule cron job calling `run-scheduled-evaluations` every 15 minutes using project URL and anon key

### UI Changes
- Add run history section to `ContinuousEvaluation.tsx` showing recent runs per schedule
- Add "Run Now" button per schedule that manually invokes the edge function
- New `useScheduleRuns` hook to query `evaluation_schedule_runs`

### Edge Function Update
- Update `run-scheduled-evaluations` to log runs into `evaluation_schedule_runs` table

---

## Implementation 5: Governance Enforcement Mode

### Database Changes (Migration)
- Create `governance_policies` table (name, description, scope, target_id, condition_type, condition_config jsonb, action_type, is_active, created_by) with RLS
- Create `governance_enforcements` table (policy_id FK, target_type, target_id, attempted_action, decision, reason, overridden_by, override_justification, created_at) with RLS

### UI Changes
- Add `GovernanceEnforcementSwitch` component to Governance page header — toggle between advisory/enforced mode (writes to `platform_config` table with key `governance_mode`)
- Add policy builder section below the switch: list active policies, create new policy dialog with condition_type selector, threshold config, action_type
- Add enforcement log viewer showing recent policy checks

### New Hooks
- `src/hooks/useGovernancePolicies.ts` — CRUD for governance_policies
- `src/hooks/useGovernanceEnforcements.ts` — read enforcement logs

---

## Implementation Order
1. **Impl 2**: Settings (largest UI change, removes most placeholders)
2. **Impl 3**: Environment Management (small scope)
3. **Impl 4**: Continuous Evaluation Cron (DB + cron + edge function)
4. **Impl 5**: Governance Enforcement (new tables + UI)

All will be implemented sequentially without interruption. Each implementation will include the migration, hooks, and UI changes in a single batch.

