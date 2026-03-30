

# Full Audit Remediation Plan — 4 Phases

This plan addresses every actionable finding from the audit report across 4 sequential phases: critical bugs, testing infrastructure, feature completions, and hygiene hardening.

---

## Phase 1 — Critical Bug Fixes

### 1.1 Fix `clarityScrore` typo in `src/lib/rai-formulas.ts`
- Rename function on line 651 from `clarityScrore` to `clarityScore`
- No callers found in the codebase importing this name, so no other files need updating

### 1.2 Wire Audit Center Download button in `src/pages/AuditCenter.tsx`
- In `ReportsTab()` (line 492), add `handleDownloadReport` function that:
  - Serializes report data (report_type, generated_at, record_hash, verification_status) as JSON
  - Creates a Blob download via `URL.createObjectURL`
  - Shows `toast.success` on download
- Wire the button on line 546: `<Button onClick={() => handleDownloadReport(report)}>`

### 1.3 Fix attestation sha256: URL handling in `src/pages/Governance.tsx`
- In `handleDownloadAttestation` (line 74): add early check for `sha256:` prefix before the `data:` check — generate a JSON metadata summary and trigger blob download
- In `handleViewAttestation` (line 98): same guard — open a new window with formatted JSON summary instead of trying to navigate to invalid URL

---

## Phase 2 — Testing Infrastructure

### 2.1 Create test setup file
- Create `src/tests/setup.ts` with `@testing-library/jest-dom` import and `matchMedia` mock
- Note: `vitest.config.ts` and `tsconfig.app.json` updates needed for test globals

### 2.2 Create RAI formula unit tests
- Create `src/lib/rai-formulas.test.ts` with tests for all 25 metric functions + 6 composite score functions
- Each function gets: pass case, fail case, edge case, shape validation
- Functions: `demographicParityScore`, `equalOpportunityScore`, `equalizedOddsScore`, `groupLossRatioScore`, `biasTagRateScore`, `responseHallucinationScore`, `claimHallucinationScore`, `faithfulnessScore`, `unsupportedSpanScore`, `abstentionQualityScore`, `overallToxicityScore`, `severeToxicityScore`, `toxicityDifferentialScore`, `topicToxicityScore`, `guardrailCatchScore`, `piiLeakageScore`, `phiLeakageScore`, `redactionCoverageScore`, `secretsExposureScore`, `minimizationScore`, `clarityScore`, `explanationFaithfulnessScore`, `coverageScore`, `actionabilityScore`, `simplicityScore`, plus composite calculators

### 2.3 Populate test fixtures
- Create `src/tests/fixtures/rai-test-data.ts` with reusable test constants
- Update `src/tests/utils/test-helpers.ts` with `renderWithQueryClient` helper

---

## Phase 3 — Feature Completions

### 3.1 Vendor Management page
- Create `src/pages/Vendors.tsx` — list page using `useVendors` hook with loading/empty/error states, vendor cards showing name, type, risk tier, contract status
- Add lazy import + route in `src/App.tsx`: `/vendors`
- Add to `ROUTE_ACCESS_MAP` in `src/lib/role-personas.ts`: `'/vendors': ['admin', 'analyst']`
- Add sidebar entry under "Configure" section in `src/components/layout/Sidebar.tsx`

### 3.2 Predictive Risk Signals on Governance page
- Import `usePredictiveGovernance` in `src/pages/Governance.tsx`
- Add a `<Collapsible>` section at the bottom showing top-3 risk signals (risk_score, prediction_type, entity_type)
- Hide entirely when no data returned

### 3.3 Red Team campaign rate limiting
- In `src/pages/Policy.tsx`, add 5-minute localStorage-based cooldown to `runSampleCampaign()`
- Show remaining cooldown in button label when locked
- Use `fractal-last-campaign-run` localStorage key with `Date.now()` comparison

### 3.4 Harden `canAccessRoute` sub-path logic
- In `src/lib/role-personas.ts`, simplify `canAccessRoute()` to remove the longest-prefix matching loop
- Logic: exact match → dynamic route parent lookup (`/projects/:id` → check `/projects`) → deny with console.warn
- Add `/vendors` to `ROUTE_ACCESS_MAP`

---

## Phase 4 — Hygiene & Annotation

### 4.1 Annotate orphaned hooks
- Add `@status ORPHANED` JSDoc to `src/hooks/useWeightProfiles.ts` and `src/hooks/useThreatModels.ts`
- `useScheduleRuns` is NOT orphaned (used by `ContinuousEvaluation.tsx`) — skip it

### 4.2 SERVICE_ROLE_KEY Phase 1 warnings
- Check `supabase/functions/copilot/index.ts` and `supabase/functions/realtime-chat/index.ts`
- Add `console.warn` for any SERVICE_ROLE_KEY usage doing user-level reads
- Add TODO comments referencing Phase 1 migration

### 4.3 `.env` note
- `.env` is auto-managed by Lovable Cloud and cannot be renamed. The `.gitignore` already has `*.local`. No action needed here — this is a platform constraint.

---

## Files Changed Summary

| File | Phase | Change |
|------|-------|--------|
| `src/lib/rai-formulas.ts` | P1 | Fix `clarityScrore` → `clarityScore` |
| `src/pages/AuditCenter.tsx` | P1 | Wire Download button handler |
| `src/pages/Governance.tsx` | P1+P3 | Fix sha256 attestation + add predictive signals |
| `src/tests/setup.ts` | P2 | Create test setup |
| `src/lib/rai-formulas.test.ts` | P2 | 25+ function unit tests |
| `src/tests/fixtures/rai-test-data.ts` | P2 | Test data constants |
| `src/tests/utils/test-helpers.ts` | P2 | Query client render helper |
| `src/pages/Vendors.tsx` | P3 | New vendor management page |
| `src/App.tsx` | P3 | Add `/vendors` route |
| `src/lib/role-personas.ts` | P3 | Add vendor route + harden canAccessRoute |
| `src/components/layout/Sidebar.tsx` | P3 | Add Vendors nav item |
| `src/pages/Policy.tsx` | P3 | Rate limit campaign runs |
| `src/hooks/useWeightProfiles.ts` | P4 | Orphan annotation |
| `src/hooks/useThreatModels.ts` | P4 | Orphan annotation |
| `supabase/functions/copilot/index.ts` | P4 | SERVICE_ROLE_KEY warning |
| `supabase/functions/realtime-chat/index.ts` | P4 | SERVICE_ROLE_KEY warning |

