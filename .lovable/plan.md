
# Remove Entire Core Security Module

## Scope

Remove all Core Security pages, components, hooks, edge functions, sidebar entries, dashboard references, and route definitions.

---

## Files to DELETE (27 files)

### Pages (5 files)
- `src/pages/security/SecurityDashboard.tsx`
- `src/pages/security/Pentesting.tsx`
- `src/pages/security/JailbreakLab.tsx`
- `src/pages/security/ThreatModeling.tsx`
- `src/pages/security/AttackLibrary.tsx`

### Components (11 files)
- `src/components/security/AttackCard.tsx`
- `src/components/security/BuiltInTargetButton.tsx`
- `src/components/security/ConnectionTestButton.tsx`
- `src/components/security/FindingCard.tsx`
- `src/components/security/FrameworkBadge.tsx`
- `src/components/security/OWASPCoverageChart.tsx`
- `src/components/security/PentestProgress.tsx`
- `src/components/security/ScoreTooltip.tsx`
- `src/components/security/SecurityPostureGauge.tsx`
- `src/components/security/SystemErrorDisplay.tsx`
- `src/components/security/ThreatVectorRow.tsx`

### Hooks (5 files)
- `src/hooks/useSecurityStats.ts`
- `src/hooks/useSecurityFindings.ts`
- `src/hooks/useSecurityTestRuns.ts`
- `src/hooks/useThreatModels.ts`
- `src/hooks/useAttackLibrary.ts`
- `src/hooks/useSecurityHealthMonitor.ts`

### Edge Functions (4 directories)
- `supabase/functions/agent-pentester/index.ts`
- `supabase/functions/agent-jailbreaker/index.ts`
- `supabase/functions/agent-threat-modeler/index.ts`
- `supabase/functions/security-evidence-service/index.ts`

---

## Files to EDIT (3 files)

### 1. `src/App.tsx`
- Remove 5 lazy imports (SecurityDashboard, Pentesting, JailbreakLab, ThreatModeling, AttackLibrary)
- Remove 5 Route definitions (lines 122-127)

### 2. `src/components/layout/Sidebar.tsx`
- Remove the "CORE SECURITY" divider and all 5 navigation items (lines 51-56)

### 3. `src/pages/Index.tsx`
- Remove the `securityMetrics` query (lines 79-95)
- Remove the `security_findings` realtime subscription listener (lines 147-153)
- Remove the `securityItems` array (lines 199-205)
- Remove the entire "Core Security Section" from the dashboard grid (lines 323-389)
- Change the grid from `lg:grid-cols-2` to single column since only Data Governance remains
- Remove unused icon imports (FlaskConical, ScanSearch, Target, Library) if no longer used elsewhere
- Remove unused `securityMetrics` variable references

---

## What is NOT removed

- Database tables (`security_findings`, `security_test_runs`, `attack_library`, `threat_models`, `threat_vectors`) -- these stay in the database; removing tables requires a migration and could lose data
- The `supabase/config.toml` entries for these functions -- these are auto-managed
- Any shared utilities in `supabase/functions/_shared/` -- these may be used by other functions

---

## Technical Summary

| Action | Count |
|--------|-------|
| Files deleted | 27 |
| Files edited | 3 |
| Routes removed | 5 |
| Sidebar items removed | 6 (1 divider + 5 links) |
| Hooks removed | 6 |
| Edge functions removed | 4 |
| Dashboard section removed | 1 (Core Security grid column) |
