

# Plan: Kill Latency, Fix All Page Errors, Harden Every Segment

## Root Causes Found

1. **Realtime channel churn is the #1 latency source.** Every page with a realtime subscription (Index, Governance, Incidents, HITL, Approvals, DecisionLedger, AuditCenter) creates and tears down Supabase WebSocket channels on every mount/unmount. When navigating between pages, this causes 200-500ms+ delays per page transition.

2. **Index page fires `usePlatformMetrics` (8 parallel DB queries) on every visit** in addition to 3 more inline queries + a realtime subscription. That's 11+ network calls on landing.

3. **Governance hooks fire 5 parallel queries** (frameworks, controls, assessments, stats, attestations) plus a realtime subscription. None have `staleTime` set in the hook definitions, so they re-fetch every mount despite the global `staleTime: 120_000` (which should work -- but `refetchOnMount: false` is global so this should be OK... unless the queries are invalidated by realtime).

4. **Realtime handlers call `invalidateQueries` on every event**, which forces immediate refetches even within the 120s staleTime window. This creates a cascade: realtime event → invalidate → refetch all queries → slow page.

5. **`bad_jwt` / `missing sub claim` errors** from published URL: stale sessions from before anonymous auth migration. The auth handler catches `TOKEN_REFRESHED` but doesn't catch the case where `getSession()` returns a stale token that the API rejects with 403.

## Changes

### 1. Remove ALL per-page realtime subscriptions
**Files:** `Governance.tsx`, `Incidents.tsx`, `HITL.tsx`, `Approvals.tsx`, `DecisionLedger.tsx`, `AuditCenter.tsx`, `Index.tsx`

Replace realtime WebSocket subscriptions with `refetchInterval: 30_000` (30s polling). This eliminates channel churn entirely. The realtime badges and counters will be removed since they add no value with polling.

For each page:
- Remove the `useEffect` with `supabase.channel(...)` 
- Remove `realtimeCount` state
- Remove the Realtime badge from the header
- Add `refetchInterval: 30_000` to the primary data hooks

### 2. Add `staleTime` to ALL governance hooks
**File:** `src/hooks/useGovernance.ts`

Add `staleTime: 120_000` to every hook: `useControlFrameworks`, `useControls`, `useControlAssessments`, `useComplianceStats`, `useAttestations`.

### 3. Reduce `usePlatformMetrics` query count
**File:** `src/hooks/usePlatformMetrics.ts`

Add `staleTime: 120_000` and `refetchInterval: 60_000` to the hook. It already uses count queries which is good.

### 4. Fix stale JWT handling in useAuth
**File:** `src/hooks/useAuth.tsx`

In the `getSession()` callback, if the session exists but has no `sub` claim (anonymous token that expired), call `signOut()` and redirect. Also add a global Supabase error interceptor that catches 403 responses and clears the session.

### 5. Add `staleTime` to all remaining hooks used by Govern pages
**Files:** `src/hooks/useIncidents.ts`, `src/hooks/useReviewQueue.ts`, `src/hooks/useSystemApprovals.ts`

Add `staleTime: 120_000` to each query hook.

### 6. Governance page - remove Realtime badge UI
**File:** `src/pages/Governance.tsx`

Remove the `realtimeCount` state, the Realtime badge, and the entire realtime `useEffect`. The page will rely on cached data + 30s polling.

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Governance.tsx` | EDIT | Remove realtime subscription and badges |
| `src/pages/Incidents.tsx` | EDIT | Remove realtime subscription |
| `src/pages/HITL.tsx` | EDIT | Remove realtime subscription |
| `src/pages/Approvals.tsx` | EDIT | Remove realtime subscription |
| `src/pages/DecisionLedger.tsx` | EDIT | Remove realtime subscription if present |
| `src/pages/AuditCenter.tsx` | EDIT | Remove realtime subscription if present |
| `src/pages/Index.tsx` | EDIT | Remove realtime subscription, add refetchInterval |
| `src/hooks/useGovernance.ts` | EDIT | Add staleTime to all hooks |
| `src/hooks/useIncidents.ts` | EDIT | Add staleTime |
| `src/hooks/useReviewQueue.ts` | EDIT | Add staleTime |
| `src/hooks/useSystemApprovals.ts` | EDIT | Add staleTime |
| `src/hooks/usePlatformMetrics.ts` | EDIT | Add staleTime + refetchInterval |
| `src/hooks/useAuth.tsx` | EDIT | Fix stale JWT cleanup on 403 |

