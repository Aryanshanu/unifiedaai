

# Plan: Logout Option, Latency Fix, Govern Pages Hardening

## Issues Identified

1. **No Logout button** -- Header only has "Switch Role" which does the same thing (signs out + goes to `/auth`). Need to rename it to "Logout" so it's clear.
2. **Latency on page transitions** -- Every page with `MainLayout` mounts `Sidebar` and `Header`, both of which fire DB queries. The Header fires 2 realtime subscriptions + 2 count queries on every mount. The `usePlatformMetrics` hook in Sidebar also fires on every page. Combined with `refetchOnMount: false` already set, the main remaining issue is the realtime channel setup/teardown on every navigation.
3. **Govern segment pages working** -- The Governance, HITL, Incidents, Decision Ledger, Approvals, Audit Center, and Governance Framework pages all query real database tables. The auth logs show `bad_jwt` / `missing sub claim` errors from the published URL, which means stale sessions from before the anonymous auth change are trying to hit the API. The fix is to handle stale JWT gracefully in the auth flow (clear bad tokens on 403).
4. **Role access enforcement** -- Already implemented via `ROUTE_ACCESS_MAP` + `ProtectedRoute`. Looks correct.

## Changes

### 1. Header -- Add proper "Logout" label + fix latency
**File: `src/components/layout/Header.tsx`**
- Rename "Switch Role" to "Logout" (user confirmed logout = go to role picker, which is exactly what `handleSwitchRole` does)
- Move notification count fetching into a separate hook with proper caching to avoid re-subscribing on every page navigation
- Remove the realtime subscription from Header entirely (notifications update via staleTime/refetchInterval instead) -- this eliminates the biggest source of latency (channel setup/teardown per navigation)

### 2. Auth -- Handle stale JWT tokens gracefully
**File: `src/hooks/useAuth.tsx`**
- In `getSession()` error handling, if session exists but is invalid (403 errors), clear it and redirect to `/auth`
- Add error handling in `fetchUserRoles` so a failed role fetch doesn't leave the app in a broken state

### 3. Sidebar -- Remove usePlatformMetrics from Sidebar
**File: `src/components/layout/Sidebar.tsx`**
- The Sidebar calls `usePlatformMetrics()` just for `pendingApprovals` badge count. This fires a complex multi-table query on every page. Remove it -- the badge is a nice-to-have but not worth the latency cost. Or replace with a lightweight count-only query with long staleTime (5 min).

### 4. Govern pages -- Add error boundaries and empty state handling
**Files: `src/pages/Governance.tsx`, `src/pages/Approvals.tsx`**
- Wrap realtime subscriptions in try/catch
- Ensure all query hooks have `staleTime: 120_000` explicitly set to prevent redundant fetches
- Add proper error state UI instead of letting errors bubble up silently

### 5. Global latency -- Reduce realtime channel churn  
**File: `src/pages/Index.tsx`**
- The Index page subscribes to realtime channels for incidents. When user navigates away and back, channels are torn down and recreated. Add channel subscription cleanup optimization.

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/Header.tsx` | EDIT | Rename to "Logout", remove realtime subscription, use cached count query |
| `src/hooks/useAuth.tsx` | EDIT | Handle stale JWT, add error handling in fetchUserRoles |
| `src/components/layout/Sidebar.tsx` | EDIT | Replace `usePlatformMetrics` with lightweight count query |
| `src/pages/Governance.tsx` | EDIT | Add staleTime to hooks, wrap realtime in error handling |
| `src/pages/Index.tsx` | EDIT | Add staleTime to all queries, optimize realtime |
| `src/pages/Incidents.tsx` | EDIT | Add staleTime to hooks |
| `src/pages/HITL.tsx` | EDIT | Add staleTime to hooks |
| `src/pages/Approvals.tsx` | EDIT | Add staleTime to hooks |
| `src/pages/AuditCenter.tsx` | EDIT | Add staleTime to hooks |
| `src/pages/DecisionLedger.tsx` | EDIT | Add staleTime to hooks |

