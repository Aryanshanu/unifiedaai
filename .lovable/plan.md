

# Comprehensive Platform Hardening - Phase 2
## Addressing Remaining Critical, High, and Medium Issues

---

## Triage: Already Fixed vs Still Open

After auditing the codebase against both reports, here is the status:

### Already Fixed (Previous Sprint)
- Score defaults (Issues #4, #14): `?? 100` replaced with `?? Infinity` in both `Models.tsx` and `Observability.tsx`
- Auth race condition (Issue #7/#17): `initialSessionHandled` flag already in `useAuth.tsx`
- Zod validators (Issue #1): `api-validators.ts` exists with `PolicyPack`, `DriftAlert`, `Incident` schemas
- API error handling (Issue #2): `api-client.ts` has `ApiError` class and `withErrorHandling`
- Governance O(n^2) joins (Issue #20): Already uses `Map` indexing in `Governance.tsx`
- Realtime reconnect (Issue #20): `useRealtimeWithReconnect.ts` properly cleans up via `supabase.removeChannel`
- Unhandled rejections (Issue #21): `structured-logger.ts` line 268 handles `unhandledrejection`
- Incident pagination: Already implemented in `useIncidents.ts`

### Still Open - Prioritized Below

---

## Phase 1: Critical Fixes (Security + Stability)

### 1.1 Memoize AuthContext Value
**File:** `src/hooks/useAuth.tsx`

The context value object is recreated every render, causing all 50+ consumers to re-render unnecessarily. Wrap with `useMemo`:

```text
const value = useMemo(() => ({
  user, session, profile, roles, loading,
  signUp, signIn, signOut, hasRole, hasAnyRole,
}), [user, session, profile, roles, loading]);
```

Also wrap `signUp`, `signIn`, `signOut`, `hasRole`, `hasAnyRole` in `useCallback` so the memo deps are stable.

### 1.2 Memoize SidebarContext Value
**File:** `src/contexts/SidebarContext.tsx`

Same issue -- value recreated every render:

```text
const toggle = useCallback(() => setCollapsed(prev => !prev), []);
const value = useMemo(() => ({ collapsed, setCollapsed, toggle }), [collapsed, toggle]);
```

### 1.3 ProtectedRoute Loading Timeout
**File:** `src/components/auth/ProtectedRoute.tsx`

Add a 10-second timeout so the loading spinner doesn't hang forever if auth crashes. After timeout, show error state with "Required roles" info and a reload button.

### 1.4 Fix `getRiskLevel` in Models.tsx (Line 57)
**File:** `src/pages/Models.tsx`

Line 57 still uses `?? 100` in the `getRiskLevel` function (not `getModelStatus` which was fixed). Change to `?? Infinity` for consistency:

```text
const minScore = Math.min(fairness ?? Infinity, robustness ?? Infinity);
```

---

## Phase 2: Performance Fixes

### 2.1 Code Splitting with React.lazy
**File:** `src/App.tsx`

All 30+ pages are eagerly imported. Convert to lazy loading:

```text
const Governance = lazy(() => import('./pages/Governance'));
const HITL = lazy(() => import('./pages/HITL'));
// ... all page imports
```

Wrap route content in `<Suspense fallback={<PageSkeleton />}>`.

This will significantly reduce initial bundle size and first load time.

### 2.2 Add `staleTime` to QueryClient
**File:** `src/App.tsx`

Currently `new QueryClient()` uses defaults (0ms staleTime = refetch on every mount). Add sensible defaults:

```text
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,      // 30s before refetch
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

This prevents duplicate queries when components using the same query key mount/unmount.

---

## Phase 3: Robustness Fixes

### 3.1 Form Cleanup on Error
**Files:** Multiple form components

Add `finally` blocks to all async form handlers so `isSubmitting` state always resets:

```text
try { ... } catch { ... } finally { setIsSubmitting(false); }
```

Audit and fix in: `ModelRegistrationForm.tsx`, `CreateProjectForm.tsx`, `RiskAssessmentWizard.tsx`, `EvaluationSuiteForm.tsx`.

### 3.2 ErrorBoundary: Add Global Error/Rejection Listeners
**File:** `src/components/error/ErrorBoundary.tsx`

While `structured-logger.ts` captures unhandled rejections for logging, the ErrorBoundary should also catch them to prevent white screens. Add `componentDidMount` listeners for `window.error` and `unhandledrejection` that set the error state.

### 3.3 Lineage Graph Depth Limit
**File:** `src/pages/Lineage.tsx`

The blast radius / graph traversal code at line 332-353 iterates through nodes without a depth limit. Add `MAX_DEPTH = 15` and fan-out limit of 50 edges per node to prevent stack overflow on circular data.

---

## Phase 4: Minor Fixes

### 4.1 `let` to `const` Fixes
Change `let` to `const` where variables are never reassigned. Affects:
- `src/lib/dq-truth-enforcement.ts`
- `src/hooks/useModelEvaluationHistory.ts`

### 4.2 Hardcoded Colors Remaining
Check for any remaining hardcoded `hsl(...)` values in chart components and replace with `CHART_COLORS` from `fractal-theme.ts`.

### 4.3 Access Denied UX Enhancement
Update `ProtectedRoute.tsx` to show which roles are required when access is denied, so users know what permission they need.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Memoize context value + useCallback for functions |
| `src/contexts/SidebarContext.tsx` | Memoize context value |
| `src/components/auth/ProtectedRoute.tsx` | Add loading timeout + role display on denial |
| `src/pages/Models.tsx` | Fix `getRiskLevel` line 57: `?? 100` to `?? Infinity` |
| `src/App.tsx` | Code splitting with React.lazy + QueryClient defaults |
| `src/components/error/ErrorBoundary.tsx` | Add global error/rejection listeners |
| `src/pages/Lineage.tsx` | Add depth limit to graph traversal |
| Multiple form components | Add `finally` blocks for isSubmitting cleanup |

## Items NOT Addressed (and Why)

- **TypeScript `strict: true`**: Enabling this would produce 500+ type errors across 60+ files. This is a multi-day migration, not a quick fix. Recommend as a separate dedicated sprint.
- **`any` type elimination**: Same scope issue -- 180+ instances across 60+ files. Should be done incrementally per module.
- **Service role key usage in edge functions**: Already documented in `SERVICE_ROLE_KEY_POLICY.md`. The edge functions that use it (admin operations like `cleanup_old_logs`) legitimately need elevated access. The key is never exposed to the client.
- **Environment variables in `.env`**: These are the anon/publishable key, which is public by design. The service role key is NOT in `.env`. This is correct Supabase architecture.
- **CSP headers in Vite**: Vite dev server headers don't affect production. Production headers should be set at the CDN/hosting layer (Lovable handles this).

