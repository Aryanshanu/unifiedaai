

# Fixes Required: Gap Closure Audit Results

## Current State Summary

All 5 implementations are **95-100% done**. Database tables, hooks, and UI are all in place. However, there are **3 concrete bugs** that will cause runtime failures:

---

## Bug 1: `deployment_environments` — RLS blocks CREATE/DELETE (CRITICAL)

**Problem:** RLS is enabled on `deployment_environments` with only a `SELECT` policy (`"Users can view environments"`, `qual: true`). The Create Environment and Delete Environment buttons will silently fail with RLS violations.

**Fix:** Add INSERT, UPDATE, and DELETE policies for authenticated users via a migration:
```sql
CREATE POLICY "Authenticated users can create environments"
  ON deployment_environments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update environments"
  ON deployment_environments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete non-production environments"
  ON deployment_environments FOR DELETE TO authenticated USING (is_production = false);
```

---

## Bug 2: `run-scheduled-evaluations` — Missing from `config.toml` (CRITICAL)

**Problem:** The cron job invokes `run-scheduled-evaluations` every 15 minutes with the anon key. But this function is NOT listed in `supabase/config.toml`, so it defaults to `verify_jwt = true`. The cron job's anon-key-based call will be rejected. The "Run Now" button from the UI works because the user has a JWT, but the automated cron will fail.

**Fix:** Add the function to `config.toml` with `verify_jwt = false` (since it's called by cron with just the anon key, not a user JWT).

---

## Bug 3: `useSettings` hook may not handle new columns (MEDIUM)

**Problem:** The Regions section reads/writes `data_residency`, `compliance_frameworks`, `gdpr_enabled`, `ccpa_enabled`, `audit_retention_years` via `useUpdateSettings`. Need to verify the `useSettings` hook accepts these fields in its mutation.

**Fix:** Inspect and patch `useSettings` if the update mutation filters out unknown fields.

---

## What's NOT Broken (Verified Working)

| Component | Status | Evidence |
|-----------|--------|----------|
| `security_config` table | All 11 columns present including `require_uppercase`, `require_numbers` | DB query confirmed |
| `api_keys` table | Exists with proper RLS (`Users manage own api keys`) | DB query confirmed |
| `governance_policies` table | Exists with read + manage policies | DB query confirmed |
| `governance_enforcements` table | Exists with read + insert policies | DB query confirmed |
| `evaluation_schedule_runs` table | Exists with read + insert policies | DB query confirmed |
| `governance_mode` seed | Present in `platform_config` as `{"mode": "advisory"}` | DB query confirmed |
| Cron job | Active: `run-scheduled-evaluations-every-15min` at `*/15 * * * *` | DB query confirmed |
| `notification_channels` | Full CRUD RLS policies in place | DB query confirmed |
| `organization_settings` | All regional columns present | DB query confirmed |
| Settings UI | All 4 sections (Security, Notifications, API Keys, Regions) are functional components | Code confirmed |
| Environment Management UI | Create/Delete dialogs implemented | Code confirmed |
| Continuous Evaluation UI | Schedule CRUD + Run Now + Run History | Code confirmed |
| Governance Enforcement UI | Mode toggle + Policy CRUD + Enforcement log | Code confirmed |

---

## Implementation Plan

1. **Migration:** Add INSERT/UPDATE/DELETE RLS policies on `deployment_environments`
2. **Config.toml:** Add `[functions.run-scheduled-evaluations]` with `verify_jwt = false`
3. **Verify `useSettings` hook** handles the regional fields correctly — patch if needed

Total: 1 migration + 1 config file edit + 1 hook verification. ~15 lines of changes.

