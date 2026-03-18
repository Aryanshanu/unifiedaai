

# Fix: Kill All Background Polling to Achieve Sub-2s Page Transitions

## Root Cause

The global QueryClient config is correctly set (`staleTime: 120_000`, `refetchOnMount: false`, `refetchOnWindowFocus: false`). However, **16 files** override these defaults with explicit `refetchInterval` values (30s-120s), causing dozens of background fetch cycles that block the main thread during navigation. Every poll triggers the fetch interceptor, React state updates, and re-renders.

The `refetchOnMount: false` means cached data is reused instantly when navigating -- but the constant background polling from previously-visited pages keeps the network and React reconciler busy, causing 10-15s perceived latency.

## The Fix: One Surgical Change

Set `refetchInterval: false` in every file that currently has it. The data will still refresh when users manually navigate to a page (because `staleTime: 120_000` means after 2 minutes the next mount WILL refetch). No data goes stale -- it just stops polling in the background.

## Files to Change (all identical: `refetchInterval: <number>` → `refetchInterval: false`)

| File | Current Intervals | Queries Affected |
|------|------------------|-----------------|
| `src/components/dashboard/GovernanceDashboard.tsx` | 30s, 60s, 60s, 60s | 4 queries |
| `src/components/dashboard/ComplianceDashboard.tsx` | 120s, 120s, 120s, 60s | 4 queries |
| `src/components/dashboard/ExecutiveDashboard.tsx` | 120s, 120s, 60s | 3 queries |
| `src/components/dashboard/TechnicalDashboard.tsx` | 60s, 60s, 120s | 3 queries |
| `src/components/dashboard/IncidentSummaryCard.tsx` | 60s | 1 query |
| `src/components/dashboard/SLODashboard.tsx` | 120s | 1 query |
| `src/components/dashboard/OversightAgentStatus.tsx` | 120s | 1 query |
| `src/components/dashboard/RuntimeRiskOverlay.tsx` | 120s | 1 query |
| `src/components/monitoring/FeedbackLoopDiagram.tsx` | 120s | 1 query |
| `src/hooks/useRAIDashboard.ts` | 120s | 1 query |
| `src/hooks/usePredictiveGovernance.ts` | 120s, 120s, 60s | 3 queries |
| `src/hooks/useRealityMetrics.ts` | 120s | 1 query |
| `src/hooks/useRequestLogs.ts` | 60s | 1 query |
| `src/hooks/useGovernanceFlowMetrics.ts` | 120s | 1 query |
| `src/hooks/useFileUploadStatus.ts` | 60s | 1 query |

**Total: 27 background polling queries eliminated.**

Each change is a single-line replacement: `refetchInterval: <number>` → `refetchInterval: false`.

No behavioral change for users -- data still loads fresh on page visit (staleTime handles cache invalidation). The only difference is zero background network traffic when the user is on a different page.

