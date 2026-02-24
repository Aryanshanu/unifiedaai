

# Fix 30-Second Page Navigation Latency

## Root Cause Analysis

The page transition delay comes from TWO compounding problems:

### Problem 1: Structured Logger Intercepts Every Fetch Call
The `structured-logger.ts` wraps `window.fetch` globally and for EVERY request:
- Calls `console.groupCollapsed()` on request start
- Calls `console.log()` 3 times inside the group (Full Log, Metadata, Tags)
- Calls `console.groupEnd()`
- Then AGAIN on response (another 4 console calls)

With 10-15 parallel database queries firing on each page load, that's **80-120 synchronous console calls** blocking the main thread. Console operations are synchronous and expensive -- they block rendering.

### Problem 2: Too Many Aggressive Background Refetches
Despite the previous fix setting some hooks to 60s, there are still **8 hooks at 30-second intervals** and one at **10 seconds**:
- `OversightAgentStatus`: 10s (fires 6x per minute)
- `IncidentSummaryCard`: 30s
- `useGovernanceFlowMetrics`: 30s (makes 8 parallel queries each time)
- `useRealityMetrics`: 30s (makes 4 parallel queries each time)
- `useRAIDashboard`: 30s (heaviest hook -- queries evaluation_runs for ALL models)
- `useRequestLogs`: 30s
- `FeedbackLoopDiagram`: 30s
- `RuntimeRiskOverlay`: 30s
- `SLODashboard`: 30s
- `usePredictiveGovernance`: 30s (2 hooks)

Combined with the logger overhead, every 30 seconds the browser processes **40+ network requests** each generating **8 console calls** = **320+ synchronous console operations** every 30 seconds. This starves the main thread and makes page transitions feel frozen.

---

## Fix Plan

### Fix 1: Disable Structured Logger's Fetch Interceptor in Production

**File: `src/lib/structured-logger.ts`**

The fetch interceptor is useful for debugging but catastrophic for performance. Change it to only activate in development mode with explicit opt-in, or remove the console output entirely and just store logs in memory.

- Skip `console.groupCollapsed` / `console.log` / `console.groupEnd` calls -- these are the main thread blockers
- Keep the in-memory log storage for the observability page but don't output to console
- This alone will eliminate 80%+ of the lag

### Fix 2: Increase All Remaining 30s/10s Intervals to 60s+

**Files (7 files):**
- `src/components/dashboard/OversightAgentStatus.tsx`: 10s -> 120s
- `src/components/dashboard/IncidentSummaryCard.tsx`: 30s -> 60s
- `src/hooks/useGovernanceFlowMetrics.ts`: 30s -> 120s
- `src/hooks/useRealityMetrics.ts`: 30s -> 120s
- `src/hooks/useRAIDashboard.ts`: 30s -> 120s
- `src/hooks/useRequestLogs.ts`: 30s -> 60s
- `src/components/monitoring/FeedbackLoopDiagram.tsx`: 30s -> 120s
- `src/components/dashboard/RuntimeRiskOverlay.tsx`: 30s -> 120s
- `src/components/dashboard/SLODashboard.tsx`: 30s -> 120s
- `src/hooks/usePredictiveGovernance.ts`: 30s -> 120s (both hooks)

Dashboard-level aggregation hooks (governance flow, RAI dashboard, reality metrics, oversight) don't need sub-minute freshness. 120s is appropriate. Operational hooks (incidents, request logs) stay at 60s.

### Fix 3: Add staleTime to Hooks Missing It

Several hooks have `refetchInterval` but no `staleTime`, meaning React Query considers data stale immediately and re-fetches on every component mount (page navigation). Adding `staleTime: 60_000` prevents redundant fetches during navigation.

**Files:** Same files as Fix 2 -- add `staleTime: 60_000` where missing.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/lib/structured-logger.ts` | Disable console output from fetch interceptor (keep in-memory only) |
| `src/components/dashboard/OversightAgentStatus.tsx` | 10s -> 120s, add staleTime |
| `src/components/dashboard/IncidentSummaryCard.tsx` | 30s -> 60s, add staleTime |
| `src/hooks/useGovernanceFlowMetrics.ts` | 30s -> 120s, add staleTime |
| `src/hooks/useRealityMetrics.ts` | 30s -> 120s, add staleTime |
| `src/hooks/useRAIDashboard.ts` | 30s -> 120s, add staleTime |
| `src/hooks/useRequestLogs.ts` | 30s -> 60s, add staleTime |
| `src/components/monitoring/FeedbackLoopDiagram.tsx` | 30s -> 120s, add staleTime |
| `src/components/dashboard/RuntimeRiskOverlay.tsx` | 30s -> 120s, add staleTime |
| `src/components/dashboard/SLODashboard.tsx` | 30s -> 120s, add staleTime |
| `src/hooks/usePredictiveGovernance.ts` | 30s -> 120s, add staleTime |

## Expected Impact

- Page transitions drop from ~30 seconds to under 2 seconds
- Background network requests reduced from ~40 every 30s to ~15 every 60-120s
- Console overhead eliminated entirely (the biggest single bottleneck)

