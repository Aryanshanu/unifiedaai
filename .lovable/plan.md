

# Gap Analysis: What Was Actually Missed

After auditing the database, hooks, and UI for all 4 implementations, here's the precise delta:

## Status of Each Implementation

| Impl | Status | What's Missing |
|------|--------|---------------|
| 2: Settings | 95% done | Security config missing `require_uppercase` and `require_numbers` columns + UI toggles |
| 3: Environments | 100% done | Fully functional CRUD with create/delete dialogs |
| 4: Continuous Eval | 99% done | Cron + runs table + UI all working. Missing: `governance_mode` seed row in `platform_config` |
| 5: Governance Enforcement | 99% done | Panel + policies + enforcements all working. `governance_mode` config row not seeded |

## Concrete Fixes Required

### Fix 1: Add missing password policy columns to `security_config`
- Migration: `ALTER TABLE security_config ADD COLUMN require_uppercase boolean DEFAULT true, ADD COLUMN require_numbers boolean DEFAULT true;`
- Update `useSecurityConfig.ts` interface to include `require_uppercase` and `require_numbers`
- Update `SecuritySection` in `Settings.tsx` to add two more Switch toggles for uppercase and numbers requirements

### Fix 2: Seed `governance_mode` into `platform_config`
- Insert (not migration): `INSERT INTO platform_config (config_key, config_value, category, description) VALUES ('governance_mode', '{"mode": "advisory"}', 'governance', 'Global governance enforcement mode');`
- This makes the GovernanceEnforcementPanel toggle persist properly instead of always defaulting

### Fix 3: Session timeout options mismatch
- User spec says 15/30/60/240 min options. Current code has 15/30/60/120/480. Minor — update the select options to match spec (add 240, remove 120/480 or keep all).

### Fix 4: Audit retention display
- User spec says 90d/180d/1y/7y. Current code has 1y/3y/5y/7y/10y. Add 90-day and 180-day options.

## What's NOT Missing (already complete)
- Security section: MFA toggle, session timeout, password length, special chars, audit retention — all functional with DB persistence
- Notifications section: Channel CRUD (email/slack/webhook), enable/disable, delete — all functional
- API Keys section: Generate with SHA-256 hash, copy-once display, revoke — all functional
- Regions section: Data residency selector, GDPR/CCPA toggles, compliance frameworks, audit retention — all functional with DB persistence
- Environment Management: Create/Delete dialogs, region selector, risk tier, approval gates — all functional
- Continuous Evaluation: Schedule CRUD, Run Now button, run history display, pg_cron active — all functional
- Governance Enforcement: Advisory/Enforced toggle, policy CRUD, enforcement log — all functional

## Implementation Plan
1. Database migration: add `require_uppercase` and `require_numbers` to `security_config`
2. Insert `governance_mode` row into `platform_config` (using insert tool, not migration)
3. Update `useSecurityConfig.ts` interface
4. Update `SecuritySection` in `Settings.tsx` with additional toggles and corrected dropdown options

Total scope: ~30 lines of code changes + 1 small migration + 1 data insert.

