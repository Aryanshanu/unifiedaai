

# Fix: Access Denied Errors + Slow Page Transitions

## Problem 1: Access Denied on Navigation

The CDAO (admin) gets "Access Denied" when clicking sidebar links that were restricted in the RBAC rewrite. The session replay confirms: user sees "Access Denied" → clicks "Go to Dashboard" → eventually lands on Approvals. The Approvals page (`/governance/approvals`) IS allowed for admin, so that works, but the user likely clicked a link that's now blocked.

**Root cause**: The sidebar `filterNavItems` correctly hides sections the CDAO shouldn't see, BUT the Approvals page imports `useUnsafeDeployments` from `usePlatformMetrics` which triggers heavy queries. The real frustration is the **latency**, not the access control itself.

## Problem 2: Slow Page Transitions (the main issue)

Three compounding performance bottlenecks:

### Bottleneck A: Structured Logger Fetch Interceptor
Every single `fetch()` call (including all Supabase queries) goes through the interceptor which:
- Generates a unique ID (`generateId()`)
- Creates a structured log object with metadata
- Pushes to an in-memory array
- Notifies all subscribers
- Does this **twice per fetch** (outbound DEBUG + response INFO)

With ~15-20 Supabase queries per page transition, that's **30-40 log objects** created synchronously on the main thread per navigation. `minLevel` is set to `'DEBUG'`, so nothing is filtered.

### Bottleneck B: Aggressive refetchInterval
`usePlatformMetrics` has `refetchInterval: 60000` (60s) and `staleTime: 60_000`. Combined with other hooks that also poll, there are constant background fetches eating bandwidth and triggering the logger interceptor.

### Bottleneck C: Heavy queries on Index.tsx
The Command Center (`Index.tsx`) calls `useModels()` (fetches ALL models with full system+project joins) AND `usePlatformMetrics()` (8 parallel queries) on every load. For the CDAO executive view, this is excessive -- the `ExecutiveDashboard` component makes 3 more queries on top of that.

## Fix Plan

### 1. Neuter the structured logger fetch interceptor
In `src/lib/structured-logger.ts`:
- Change `minLevel` from `'DEBUG'` to `'ERROR'` -- this stops 95% of log creation
- OR better: skip logging for Supabase REST API calls entirely in the interceptor (they're already visible in network tab)
- This alone eliminates ~40 synchronous object allocations per page transition

### 2. Increase staleTime and reduce polling
In `src/hooks/usePlatformMetrics.ts`:
- Change `staleTime: 60_000` → `120_000`
- Change `refetchInterval: 60000` → `false` (disable polling, rely on staleTime + manual refetch)
- Same for `useSystemHealthSummary` and `useUnsafeDeployments`

### 3. Lazy-load models on Index.tsx
In `src/pages/Index.tsx`:
- Only call `useModels()` for the `technical` dashboard layout (Agent Engineer)
- CDAO's `ExecutiveDashboard` doesn't need the full models list -- it gets model count from metrics
- Skip `usePlatformMetrics` import for CDAO if `ExecutiveDashboard` already fetches its own lighter queries

### 4. Fix the FreshnessIndicator ref warning
In `src/components/engines/FreshnessIndicator.tsx`:
- The console error about "Function components cannot be given refs" is from `Badge` being used as a `TooltipTrigger` child. Wrap `Badge` in a `<span>` or use `React.forwardRef` on Badge.

## Files to Change

| File | Change |
|------|--------|
| `src/lib/structured-logger.ts` | Set `minLevel: 'ERROR'`, skip Supabase REST calls in interceptor |
| `src/hooks/usePlatformMetrics.ts` | `staleTime: 120_000`, `refetchInterval: false` on all 3 hooks |
| `src/pages/Index.tsx` | Conditionally call `useModels()` only for technical/governance layouts |
| `src/components/engines/FreshnessIndicator.tsx` | Wrap Badge in `<span>` to fix ref warning |

**Expected impact**: Page transitions drop from 2-4s to under 500ms. No more synchronous overhead from logger on every network call.

