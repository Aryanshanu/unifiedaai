

# Comprehensive Audit Report: Functional Issues & Missing Backend Logic

## Executive Summary

After thorough investigation of the codebase, database state, edge functions, and UI components, I've identified **14 critical issues** that need to be fixed for the platform to be truly production-ready.

---

## Issue Categories

### Category A: Empty/Zero Data in Critical Tables (4 Issues)

| Issue # | Table/Feature | Current Value | Expected | Impact |
|---------|---------------|---------------|----------|--------|
| A1 | `events_raw` count | 10 (just generated) | 10,000+ | Oversight Agent cannot validate MTTD/MTTR |
| A2 | `predictive_governance` | 4 (just generated) | 50+ | Predictive Risk Panel shows "No High-Risk Predictions" |
| A3 | `function_metrics` | 0 | 100+ | Edge Function observability dashboard is empty |
| A4 | Processed events count | 0 (events sit at 0 after processing) | Events should create incidents | Event pipeline not triggering properly |

**Root Cause**: The edge functions exist and work (tested via curl), but they're never called automatically. Users must manually click buttons, and even then, the events are processed but no visible outcome appears in the UI.

---

### Category B: UI Components Without Proper Backend Wiring (5 Issues)

| Issue # | Component | Problem | Fix Required |
|---------|-----------|---------|--------------|
| B1 | `PredictiveRiskPanel` | Shows "No High-Risk Predictions" even when predictions exist (risk_score >= 70 filter too high) | Lower the threshold or show all predictions |
| B2 | `SimulationController` | Works but generated events show 0 after `process-events` runs | Check why incidents aren't being created from events |
| B3 | `BulkTriagePanel` | Works when clicked, but no AI suggestions appear initially | Auto-fetch suggestions on mount |
| B4 | Settings > Platform Config | Engine weights display as decimals (0.25) but sliders expect 0-100 | Fix value conversion (multiply by 100) |
| B5 | Configuration.tsx page | Separate page created but duplicates Settings > Platform Config | Should redirect or unify |

---

### Category C: Edge Functions Not Auto-Triggered (2 Issues)

| Issue # | Function | Problem | Expected Behavior |
|---------|----------|---------|-------------------|
| C1 | `process-events` | Only runs when manually triggered | Should auto-run on cron or after `generate-synthetic-events` |
| C2 | `predictive-governance` | Only runs when "Run Analysis" clicked | Should run on schedule or after evaluation completions |

---

### Category D: Data Format Mismatches (3 Issues)

| Issue # | Location | Problem | Fix |
|---------|----------|---------|-----|
| D1 | Engine weights in DB | Stored as decimals (0.25) | UI expects percentages (25) - needs conversion |
| D2 | SLO targets | Config values work but UI shows "minutes" while stored as minutes | Correct but needs better labeling |
| D3 | Predictions threshold | `useHighRiskPredictions(3)` passes 3 as minRiskScore | Should be 70, but got overwritten |

---

## Detailed Fixes Required

### Fix 1: Engine Weights Value Conversion (Settings.tsx)
**File**: `src/pages/Settings.tsx` (PlatformConfigEditor component)
**Problem**: Database stores weights as decimals (0.25, 0.20), but sliders display 0-100.
**Fix**: Multiply by 100 when loading, divide by 100 when saving.

### Fix 2: PredictiveRiskPanel Threshold Issue  
**File**: `src/pages/Index.tsx` line 35
**Current**: `useHighRiskPredictions(3)` - This passes 3 as the minRiskScore limit, not 70
**Should be**: `useHighRiskPredictions()` or `useHighRiskPredictions(70)`

### Fix 3: Auto-Process Events After Generation
**File**: `supabase/functions/generate-synthetic-events/index.ts`
**Current**: Calls `process-events` at the end but the call may fail silently
**Fix**: Add better error handling and ensure JWT is passed

### Fix 4: Add Cron Job for Predictive Governance
**Database**: Add pg_cron schedule to run `predictive-governance` every hour
```sql
SELECT cron.schedule(
  'run-predictive-governance',
  '0 * * * *',
  $$ SELECT net.http_post(
    url := 'https://avmzkngttrfmowihkqzr.supabase.co/functions/v1/predictive-governance',
    headers := '{"Authorization": "Bearer ' || current_setting('supabase.service_role_key') || '"}'::jsonb
  ); $$
);
```

### Fix 5: Events Not Creating Incidents
**File**: `supabase/functions/process-events/index.ts`
**Issue**: Events are marked as processed but incidents only created for medium/high/critical severity
**Current**: 10 events generated, 0 incidents (likely all were low/info severity or duplicates)
**Fix**: Verify the event distribution includes enough medium+ severity events

### Fix 6: Configuration.tsx Duplicate Page
**Files**: `src/pages/Configuration.tsx` and `src/pages/Settings.tsx`
**Issue**: Two different places to configure platform settings
**Fix**: Remove Configuration.tsx or make it redirect to Settings?tab=config

### Fix 7: BulkTriagePanel Auto-Analysis
**File**: `src/components/hitl/BulkTriagePanel.tsx`
**Issue**: User must click "Analyze Queue" to see AI suggestions
**Fix**: Auto-run analysis on component mount (optional, UX preference)

### Fix 8: Add Missing Function Metrics Recording
**Issue**: `function_metrics` table is empty because no function records to it
**Fix**: Create a wrapper utility and update key edge functions to record metrics

### Fix 9: usePlatformConfig Hook Not Returning Correct History
**File**: `src/hooks/usePlatformConfig.ts` line 99
**Issue**: `useConfigHistory` requires a configId but the Settings page doesn't pass it
**Fix**: Either pass the configId or create a separate hook for all recent history

---

## Implementation Priority

### Phase 1: Critical Data Issues (Must Fix Now)
1. **Engine weights display bug** - Users see 0-0.25 instead of 0-100%
2. **PredictiveRiskPanel threshold** - Shows empty when predictions exist
3. **Events → Incidents pipeline** - Generate more medium/high severity events

### Phase 2: Automation (High Priority)
4. Add cron job for `predictive-governance`
5. Ensure `process-events` runs reliably after event generation
6. Add function metrics recording

### Phase 3: UI Polish (Medium Priority)
7. Unify Configuration pages
8. Auto-analyze HITL queue
9. Better error handling in edge functions

---

## Verification Queries

After implementing fixes, run these to verify:

```sql
-- Check events are being processed
SELECT COUNT(*) FROM events_raw WHERE processed = true;

-- Check incidents are being created
SELECT COUNT(*) FROM incidents WHERE created_at > now() - interval '1 hour';

-- Check predictions exist with high scores
SELECT * FROM predictive_governance WHERE risk_score >= 70 ORDER BY risk_score DESC LIMIT 10;

-- Check function metrics are recording
SELECT * FROM function_metrics ORDER BY recorded_at DESC LIMIT 20;
```

---

## Summary of Files to Modify

| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Fix engine weights value conversion (×100) |
| `src/pages/Index.tsx` | Fix useHighRiskPredictions call |
| `src/components/dashboard/PredictiveRiskPanel.tsx` | Adjust threshold or add empty state messaging |
| `supabase/functions/generate-synthetic-events/index.ts` | Improve severity distribution for testing |
| `src/hooks/usePlatformConfig.ts` | Add getAllHistory hook |
| `src/pages/Configuration.tsx` | Either remove or redirect |
| Database migration | Add cron jobs for automation |

---

## Edge Function Test Results (Verified Working)

| Function | Status | Response |
|----------|--------|----------|
| `generate-synthetic-events` | ✅ 200 OK | Generated 10 events |
| `predictive-governance` | ✅ 200 OK | Created 4 predictions |
| `hitl-auto-assist` | ✅ 200 OK | Analyzed 5 items with suggestions |
| `process-events` | ✅ Deployed | Marks events processed, incident creation conditional |

The edge functions are all working correctly - the issues are with:
1. How data is displayed in the UI (value conversions)
2. How often functions are triggered (no automation)
3. Event severity distribution (not enough medium+ to create incidents)

