

# Command Center Audit Report: Complete List of Functional, Practical, and Logical Issues

## Executive Summary

After thorough investigation of the Command Center page (`src/pages/Index.tsx`) and all its components, hooks, and database state, I have identified **23 distinct issues** categorized into **5 categories**.

---

## Category 1: Critical Data Display Issues (6 Issues)

### Issue 1.1: PredictiveRiskPanel Shows "No High-Risk Predictions" When Data Exists
- **Location**: `src/components/dashboard/PredictiveRiskPanel.tsx` line 21
- **Problem**: Component calls `useHighRiskPredictions(5)` passing `5` as the limit, but the hook treats this as `minRiskScore`
- **Current Data**: 4 predictions exist with scores 58, 56, 48, 35 (all below 70)
- **Root Cause**: The hook's default threshold is 70, but predictions generated have max score of 58
- **Impact**: Panel always shows "No High-Risk Predictions" even when the system has predictions

### Issue 1.2: Hardcoded Date in RealityCheckDashboard
- **Location**: `src/components/dashboard/RealityCheckDashboard.tsx` line 16, 41
- **Problem**: Hardcoded "December 11, 2025" and "Cleared Dec 11" text
- **Current Date**: February 3, 2026 (2 months outdated)
- **Impact**: Looks unprofessional and misleading to users

### Issue 1.3: "100% Production Data" Badge Always Shows
- **Location**: `src/components/dashboard/RealityCheckDashboard.tsx` line 43-44
- **Problem**: Badge shows "100% Production Data" even when `allZero` is true (no data)
- **Impact**: False confidence indicator when no real production data exists

### Issue 1.4: "Governance Blocks" Metric Mislabeled
- **Location**: `src/hooks/useRealityMetrics.ts` line 31
- **Problem**: `governanceBlocks` returns total incident count, not blocked requests
- **Current Query**: `supabase.from("incidents").select("id", { count: "exact", head: true })`
- **Should Be**: Count of BLOCK decisions from `request_logs` or policy violations
- **Impact**: Completely wrong metric displayed

### Issue 1.5: "View Predictions" Button Navigates to Wrong Page
- **Location**: `src/pages/Index.tsx` line 189
- **Problem**: When high-risk predictions exist, clicking "View Predictions" navigates to `/configuration`
- **Expected**: Should navigate to a predictions detail view or the Observability page
- **Impact**: Confusing UX - Configuration page has nothing to do with predictions

### Issue 1.6: Governance Coverage Shows 0% Despite 11 States
- **Location**: `src/components/dashboard/GovernanceHealthCards.tsx`
- **Database**: 11 governance_activation_state records exist, but likely all are 'inactive'
- **Problem**: Shows "0% — Early Stage" which may not reflect actual governance health
- **Impact**: Discouraging to users when platform may actually be configured

---

## Category 2: Missing Backend Wiring Issues (5 Issues)

### Issue 2.1: No Explanation Tracking
- **Database State**: 8 decisions exist, 0 explanations
- **Impact**: "Decision Explanation Rate" in Governance Health shows 0%
- **Root Cause**: When decisions are created, no corresponding explanations are inserted

### Issue 2.2: No Attestations Created
- **Database State**: 0 attestations in `deployment_attestations`
- **Impact**: "Attestation Coverage" shows 0% with "No live data yet"
- **Root Cause**: No workflow exists to create attestations when systems are approved

### Issue 2.3: No MLOps Governance Events
- **Database State**: 0 records in `mlops_governance_events`
- **Impact**: "Governance Bypasses" metric works by accident (shows 0), but no tracking
- **Root Cause**: No edge function or workflow records mlops events

### Issue 2.4: Only 10 Events Ever Generated
- **Database State**: 10 events in `events_raw`, all processed
- **Problem**: Oversight Agent has almost no data to work with
- **Impact**: MTTD/MTTR calculations are based on minimal sample size

### Issue 2.5: High Risk Predictions Not Generated Properly
- **Database State**: All 4 predictions have scores < 70 (max is 58)
- **Problem**: `predictive-governance` function generates low scores
- **Impact**: PredictiveRiskPanel never shows any predictions

---

## Category 3: Logical/Calculation Errors (4 Issues)

### Issue 3.1: SLO Dashboard Shows 0 for All Metrics
- **Location**: `src/components/dashboard/SLODashboard.tsx`
- **Problem**: Calculates MTTD/MTTR from incidents, but:
  - Most incidents have no `detected_at` field populated
  - No incidents have `resolved_at` field (218 open incidents)
- **Result**: All MTTD/MTTR show "0.0 min" which is incorrect

### Issue 3.2: Audit Completeness Calculation Is Wrong
- **Location**: `src/components/dashboard/SLODashboard.tsx` lines 67-79
- **Formula**: `documentedIncidents / totalIncidents` where `documentedIncidents` = decisions count
- **Current**: 8 decisions / 218 incidents (24h window) = very low
- **Problem**: Comparing decisions (which may span all time) to incidents in 24h window
- **Impact**: Audit completeness percentage is misleading

### Issue 3.3: OversightAgentStatus Shows "Idle" When Events Are Processed
- **Location**: `src/components/dashboard/OversightAgentStatus.tsx` lines 66-75
- **Logic**: Status is 'running' only if last processed event was within 5 minutes
- **Current**: All 10 events processed, but if processed > 5 min ago, shows "Idle"
- **Impact**: Misleading status - agent processed everything but looks inactive

### Issue 3.4: Events Count Query Returns Wrong Number
- **Location**: `src/pages/Index.tsx` lines 43-54
- **Query**: Counts events where `processed = false`
- **Current State**: All 10 events are processed, so returns 0
- **Impact**: "Pending events" badge never shows when all caught up (which is actually good)

---

## Category 4: UX/Practical Issues (5 Issues)

### Issue 4.1: Too Many Overlapping Widgets
- **Location**: `src/pages/Index.tsx`
- **Problem**: Page shows:
  - GovernanceFlowDiagram
  - SLODashboard + OversightAgentStatus
  - SimulationController + PredictiveRiskPanel
  - IncidentSummaryCard + FeedbackLoopDiagram
  - RealityCheckDashboard
  - GovernanceHealthCards (6 cards)
  - PlatformHealthCards (4 cards)
  - Quick Actions (3 cards)
  - Core RAI Engines (5 cards)
- **Total**: 25+ distinct widgets competing for attention
- **Impact**: Information overload, unclear what's most important

### Issue 4.2: Duplicate Incident Counts in Multiple Places
- **Problem**: Open incidents shown in:
  1. IncidentSummaryCard (218 total)
  2. FeedbackLoopDiagram ("Issues Detected")
  3. PlatformHealthCards ("recentIncidents")
  4. GovernanceFlowDiagram (Stage 6 Monitoring)
- **Impact**: Redundant information, wasted screen space

### Issue 4.3: SimulationController on Command Center
- **Location**: `src/pages/Index.tsx` line 245
- **Problem**: Simulation tool for generating test data is prominent on dashboard
- **Expected**: This should be in Settings or a dedicated Testing page
- **Impact**: Confusing for production users who don't need to generate synthetic data

### Issue 4.4: "Process Now" Button Disabled When No Pending Events
- **Location**: `src/components/dashboard/OversightAgentStatus.tsx` line 212
- **Logic**: Button disabled when `pendingEvents === 0`
- **Problem**: User can't trigger processing if there are no events
- **Expected**: Fine behavior, but shows as "Idle" with no way to test

### Issue 4.5: Quick Actions Cards Show Same Icon
- **Location**: `src/pages/Index.tsx` lines 278-312
- **Problem**: "Registered Systems" and "ML Models" both use `Database` icon
- **Impact**: Hard to visually distinguish between the two metrics

---

## Category 5: Data Consistency Issues (3 Issues)

### Issue 5.1: 546 Pending Reviews But Low Visibility
- **Database State**: 546 items in `review_queue` with status='pending'
- **Problem**: Only FeedbackLoopDiagram shows pending count (in a small warning box)
- **Expected**: This is a critical metric that should be prominent

### Issue 5.2: Realtime Subscription Query Key Mismatch
- **Location**: `src/pages/Index.tsx` lines 106-112
- **Problem**: Realtime subscription for `predictive_governance` invalidates `['predictive-high-risk']`
- **Hook Uses**: `['high-risk-predictions', minRiskScore]` as query key
- **Impact**: Realtime updates won't refresh the PredictiveRiskPanel

### Issue 5.3: Missing Realtime for Key Tables
- **Location**: `src/pages/Index.tsx` useEffect
- **Missing Subscriptions**:
  - `review_queue` (546 pending items changing)
  - `drift_alerts` (for Reality Check dashboard)
  - `decisions` (for Governance Health)
- **Impact**: Dashboard doesn't update in realtime for critical governance data

---

## Summary Table

| Category | Issue Count | Severity |
|----------|-------------|----------|
| Data Display Issues | 6 | Critical |
| Missing Backend Wiring | 5 | High |
| Logical/Calculation Errors | 4 | High |
| UX/Practical Issues | 5 | Medium |
| Data Consistency Issues | 3 | Medium |
| **Total** | **23** | |

---

## Priority Fixes (Top 10)

1. **Fix PredictiveRiskPanel threshold** - Change from `useHighRiskPredictions(5)` to `useHighRiskPredictions(40)` or adjust hook
2. **Fix "Governance Blocks" metric** - Query BLOCK decisions from request_logs, not incident count
3. **Remove hardcoded December 11, 2025 date** - Use `new Date().toLocaleDateString()`
4. **Fix "View Predictions" navigation** - Navigate to `/observability` or dedicated predictions view
5. **Fix realtime query key** - Change to match `['high-risk-predictions']`
6. **Fix audit completeness calculation** - Use same time window for both queries
7. **Move SimulationController to Settings** - Not appropriate for main dashboard
8. **Reduce widget count** - Consolidate redundant incident displays
9. **Add prominent pending reviews indicator** - 546 items need attention
10. **Generate higher-risk predictions** - Adjust `predictive-governance` function scoring

---

## Files Requiring Changes

| File | Changes Needed |
|------|----------------|
| `src/pages/Index.tsx` | Fix navigation, query keys, realtime subscriptions |
| `src/components/dashboard/PredictiveRiskPanel.tsx` | Fix threshold parameter |
| `src/components/dashboard/RealityCheckDashboard.tsx` | Remove hardcoded dates |
| `src/hooks/useRealityMetrics.ts` | Fix governanceBlocks query |
| `src/components/dashboard/SLODashboard.tsx` | Fix audit completeness calculation |
| `supabase/functions/predictive-governance/index.ts` | Generate higher risk scores |

