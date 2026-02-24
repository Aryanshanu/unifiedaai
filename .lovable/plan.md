

# Command Center, Data Quality & Incidents -- Deep Fix

## Problems Identified

### 1. Command Center (Index.tsx) Issues
- **Duplicate data fetching**: `usePlatformMetrics` fetches open incidents and pending approvals, then `Index.tsx` independently fetches the exact same counts again (`pending-reviews-count`, `recent-incidents`, `dq-summary`). This means 8+ parallel DB queries on every page load, most of them redundant.
- **"Open Alerts" card on right sidebar links to `/alerts` but shows `metrics?.recentIncidents`** -- this is the open incidents count, not alerts. Misleading label.
- **The `usePlatformMetrics` hook fetches ALL `request_logs` rows for the last 24 hours** (not `count: 'exact', head: true`) -- it pulls every row into memory to count them. With any real traffic this becomes extremely slow and is the primary latency source.
- **`useSystemHealthSummary` has an N+1 query problem**: it loops over each system and makes a separate DB call for request_logs per system. This is never called on Index but it's imported via `usePlatformMetrics.ts` and could be triggered elsewhere.
- **Realtime channel subscribes to 4 tables** (`incidents`, `dq_incidents`, `review_queue`, `semantic_drift_alerts`), creating 4 postgres_changes listeners on every mount.

### 2. Data Quality Engine Issues
- **`useQualityStats` uses `useEffect` + `useState` instead of `useQuery`** -- no caching, no deduplication, no staleTime. Every mount re-fetches. Also subscribes to realtime changes on `data_uploads` AND `quality_issues` which triggers full re-fetches on every change.
- **Critical Issues count (showing 58)** comes from `quality_issues` table with `severity = 'critical'` and `status = 'open'`. This queries ALL critical issues across ALL datasets ever -- it should only count issues for the user's current context or recent uploads.
- **7 tabs** is excessive -- Control Plane, Sources, Import, Evaluate, AI Readiness, Bias Scan, History. "Sources" and "Import" overlap. "AI Readiness" and "Bias Scan" are disconnected features.

### 3. Incidents Page Issues
- **Double invalidation**: Line 97-98 in `Incidents.tsx` calls `queryClient.invalidateQueries({ queryKey: ['incidents'] })` TWICE in the same callback. Same at lines 153-154.
- **`useIncidents` returns `{ data, totalCount, hasMore }`** but `Incidents.tsx` accesses `incidents?.data` -- the hook wraps data in an object with pagination info that's never used (no pagination UI).
- **Incident stats (`useIncidentStats`) makes a separate full-table scan** of all non-archived incidents just to compute counts -- could be combined with the main incidents query.

### 4. Latency Issues (Cross-Cutting)
- **`usePlatformMetrics` fetches full rows** instead of using `count: 'exact', head: true` for counts and aggregations. This is the #1 latency problem.
- **30-second `refetchInterval` on 12+ hooks** means the app is making dozens of background queries every 30 seconds across every page.
- **`staleTime: 30_000`** in QueryClient but `refetchInterval: 30000` on many hooks -- these cancel each other out. Data is always considered stale by the time refetch fires.
- **`useAllUploads` and `useQualityStats` don't use `useQuery`** -- they bypass React Query's deduplication and caching entirely.

---

## Fix Plan

### Fix 1: Rewrite `usePlatformMetrics` to Use Count Queries

Replace full-row fetches with `count: 'exact', head: true` queries. This reduces data transfer from potentially thousands of rows to just integer counts.

**File: `src/hooks/usePlatformMetrics.ts`**
- Change `request_logs` query from `select("decision, latency_ms, status_code")` to 3 separate count queries: total, blocked, error
- For `avgLatency`, use a database function or accept a simpler approach (latest 100 logs only)
- Remove the N+1 loop in `useSystemHealthSummary` -- fetch all request_logs in one query and group client-side
- Increase `staleTime` to 60_000 to reduce redundant fetches

### Fix 2: Consolidate Command Center Queries

**File: `src/pages/Index.tsx`**
- Remove the standalone `pending-reviews-count` query -- use `metrics?.pendingApprovals` from `usePlatformMetrics` instead (already fetched)
- Remove the standalone `recent-incidents` query count -- use `metrics?.recentIncidents` instead
- Keep `dq-summary` and `semantic-summary` as they query different tables
- Fix "Open Alerts" label to "Open Incidents" and link to `/incidents` not `/alerts`
- Reduce realtime subscriptions from 4 tables to 2 (incidents + review_queue only, the important ones)

### Fix 3: Fix `useQualityStats` to Use React Query

**File: `src/hooks/useFileUploadStatus.ts`**
- Convert `useQualityStats` from `useState + useEffect` to `useQuery` with proper caching
- Remove the realtime subscription that triggers full re-fetches (rely on React Query's `refetchInterval` instead)
- Scope `criticalIssues` to recent uploads only (last 30 days) to avoid showing stale historical counts

### Fix 4: Fix Incident Double-Invalidation and Data Access

**File: `src/pages/Incidents.tsx`**
- Remove duplicate `queryClient.invalidateQueries` calls (lines 97-98 and 153-154)
- Fix data access pattern: `incidents?.data` is correct but add null safety
- Remove the `handleQuickResolveAll` function that bulk-resolves ALL critical incidents with one click (dangerous -- should resolve individually)

### Fix 5: Merge Incident Stats Into Main Query

**File: `src/hooks/useIncidents.ts`**
- Combine `useIncidentStats` computation into the main `useIncidents` query to avoid a second full-table scan
- Or convert `useIncidentStats` to use `count: 'exact', head: true` queries instead of fetching all rows

### Fix 6: Reduce Global Refetch Intervals

**File: `src/App.tsx`**
- Increase global `staleTime` from `30_000` to `60_000`
- This means data is considered fresh for 60 seconds, reducing redundant refetches

**Files: Multiple hooks**
- Change `refetchInterval: 30000` to `refetchInterval: 60000` on non-critical hooks (platform metrics, DQ stats)
- Keep `refetchInterval: 30000` only on actively-monitored data (incidents, review queue)

### Fix 7: Data Quality Engine Tab Cleanup

**File: `src/pages/engines/DataQualityEngine.tsx`**
- Merge "Sources" and "Import" tabs into "Import" (data sources are connectors that produce imports)
- Reduce from 7 tabs to 5: Control Plane, Import, Evaluate, Bias Scan, History
- Remove standalone "AI Readiness" tab (its content -- ReadyDatasetsList -- is a simple list that can live under History or Evaluate)

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `src/hooks/usePlatformMetrics.ts` | Rewrite to use count queries; fix N+1 in system health |
| `src/pages/Index.tsx` | Remove 2 redundant queries; fix labels; reduce realtime channels |
| `src/hooks/useFileUploadStatus.ts` | Convert `useQualityStats` to `useQuery`; scope critical issues |
| `src/pages/Incidents.tsx` | Remove double invalidation; remove dangerous bulk resolve |
| `src/hooks/useIncidents.ts` | Convert `useIncidentStats` to count queries |
| `src/App.tsx` | Increase staleTime to 60s |
| `src/pages/engines/DataQualityEngine.tsx` | Merge tabs from 7 to 5 |

