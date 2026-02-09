

# Architecture, Backend, Frontend & Algorithmic Fixes

## Verified Issue Status

After auditing the codebase against the 25 issues in the analysis, here is what is already handled vs what needs fixing:

### Already Addressed (No Fix Needed)
- **Realtime cleanup (Issue #4):** Both `Index.tsx` and `Governance.tsx` properly call `.subscribe()` and clean up with `supabase.removeChannel(channel)` in `useEffect` return
- **Global error boundary for promises (Issue #21):** `structured-logger.ts` already handles `unhandledrejection` events at line 268
- **RAI formulas unused (Issue #13):** The formulas ARE used via `evaluator-harness.ts` which imports all 5 `calculate*Score` functions and calls them through `runEvaluation()`

### Remaining Fixes (14 items across 4 phases)

---

## Phase 1: Critical Score & Data Integrity Fixes

### 1.1 Fix Fake Score Defaults in Observability

**File:** `src/pages/Observability.tsx` (lines 29-30)

The `getModelStatus` function uses `?? 100` for null scores, making unevaluated models appear "healthy."

**Fix:** Return "warning" when scores are null (same pattern already used in `Models.tsx` lines 26-28), and use `?? 0` instead of `?? 100` when scores exist but one is null.

### 1.2 Fix Partial Score Default in Models.tsx

**File:** `src/pages/Models.tsx` (line 32)

Lines 26-28 correctly return "warning" for fully null scores, but line 32 still uses `?? 100` when only one score is null. If `fairness_score` is 45 but `robustness_score` is null, it calculates `Math.min(45, 100) = 45` instead of `Math.min(45, 0) = 0`.

**Fix:** Change `?? 100` to `?? Infinity` so null scores are ignored rather than treated as perfect, and only real scores participate in the `Math.min`.

### 1.3 Fix Auth Race Condition

**File:** `src/hooks/useAuth.tsx` (lines 59-95)

Both `onAuthStateChange` and `getSession()` can set state simultaneously, potentially calling `fetchUserProfile` and `fetchUserRoles` twice.

**Fix:** Use a flag (`initialSessionHandled`) so `getSession()` only sets state if the listener hasn't fired first. The `onAuthStateChange` with `INITIAL_SESSION` event handles the initial load.

---

## Phase 2: Data Validation & Error Handling

### 2.1 Add Zod Validation for Critical API Responses

**New File:** `src/lib/api-validators.ts`

Create Zod schemas for the most common types used with blind `as Type[]` assertions:
- `PolicyPackSchema` (used in `usePolicies.ts`)
- `DriftAlertSchema` (used in 3 files)
- `IncidentSchema` (used in `useIncidents.ts`)

Replace `return data as Type[]` with `return z.array(Schema).parse(data)` in the 6 identified files. Wrap in try/catch that falls back to the raw data with a console warning if validation fails (graceful degradation, not hard crash).

### 2.2 Add Form Validation for Model Registration

**File:** `src/components/models/ModelRegistrationForm.tsx`

Add Zod schema validation for `CreateModelInput`:
- `name`: min 2 chars, max 100 chars, trimmed
- `model_type`: enum validation against known types
- `version`: semver format regex
- `endpoint`: valid URL format when provided
- `business_owner_email`: valid email when provided

Show inline validation errors before submission.

### 2.3 Consistent Error Handling Wrapper

**New File:** `src/lib/api-client.ts`

Create `ApiError` class and `withErrorHandling` wrapper function that:
- Normalizes all errors into `ApiError` format with `code`, `isRetryable`, and friendly `message`
- Logs via existing `structured-logger`
- Sanitizes raw error messages (per the raw-error-message-elimination mandate)

Apply to the highest-traffic hooks: `useModels`, `useIncidents`, `usePolicies`.

---

## Phase 3: Performance Fixes

### 3.1 Fix O(n^2) Joins in Governance Page

**File:** `src/pages/Governance.tsx` (lines 41-52)

Current code does nested `filter` + `find` loops to join frameworks, controls, and assessments.

**Fix:** Build `Map` indexes:
```
const controlMap = new Map(controls.map(c => [c.id, c]))
const assessmentsByFramework = new Map()
```
Then use `Map.get()` for O(1) lookups instead of `Array.find()`.

### 3.2 Add Pagination to Drift Alerts

**File:** `src/hooks/useDriftDetection.ts` (line 43)

Currently uses `.limit(50)` with no pagination UI and no count feedback.

**Fix:** Add `{ count: 'exact' }` to the select, accept `page` parameter, use `.range()` for pagination. Return `{ data, totalCount, hasMore }`.

### 3.3 Add Pagination to Incidents

**File:** `src/hooks/useIncidents.ts`

Same pattern as drift alerts - add page-based pagination with total count.

---

## Phase 4: UI Consistency

### 4.1 Unified Loading State Component

**New File:** `src/components/shared/DataLoadingState.tsx`

Create a shared component that standardizes loading/error/empty states:
- Loading: Shows skeleton matching the content shape
- Error: Shows friendly message with retry button
- Empty: Shows icon + description + optional CTA

### 4.2 Fix Hardcoded Colors

**File:** `src/lib/fractal-theme.ts` (extend existing)

Add chart color constants that reference CSS variables:
```
export const chartColors = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  ...
}
```

Update `LiveMetrics.tsx` and other files with hardcoded `hsl(...)` values.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/Observability.tsx` | Fix `?? 100` score fallback |
| `src/pages/Models.tsx` | Fix partial `?? 100` on line 32 |
| `src/hooks/useAuth.tsx` | Add initial session flag to prevent race |
| `src/lib/api-validators.ts` | NEW - Zod schemas for API responses |
| `src/lib/api-client.ts` | NEW - ApiError class + withErrorHandling |
| `src/hooks/usePolicies.ts` | Add Zod validation |
| `src/hooks/useIncidents.ts` | Add Zod validation + pagination |
| `src/hooks/useDriftDetection.ts` | Add Zod validation + pagination |
| `src/hooks/useDriftAlerts.ts` | Add Zod validation |
| `src/components/models/ModelRegistrationForm.tsx` | Add form validation |
| `src/pages/Governance.tsx` | Replace O(n^2) joins with Map indexing |
| `src/components/shared/DataLoadingState.tsx` | NEW - unified loading/error/empty |
| `src/lib/fractal-theme.ts` | Add chart color constants |

## Acceptance Criteria

- No `?? 100` score fallbacks remain anywhere in codebase
- All critical API responses validated with Zod schemas
- Governance page loads in under 200ms with 100+ frameworks
- Model registration form shows inline validation errors
- Auth state never triggers duplicate profile/role fetches
- Drift alerts and incidents support paginated loading

