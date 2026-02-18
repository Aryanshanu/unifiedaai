
# Fix Core Security Module -- SecurityDashboard Crash

## Problem

The Security Dashboard page (`/security`) crashes with `TypeError: Cannot read properties of undefined (reading 'avgResistance')` on line 32 of `SecurityDashboard.tsx`. This happens because `stats` is `undefined` while the query is loading, and the ternary `stats?.avgResistance !== null` evaluates the left side (which is `undefined !== null = true`), then tries to access `stats.avgResistance?.toFixed(0)` which fails.

## Fix

### File: `src/pages/security/SecurityDashboard.tsx` (line 32)

Change the Avg Resistance card to properly guard against `stats` being undefined:

**Before:**
```tsx
stats?.avgResistance !== null ? `${stats.avgResistance?.toFixed(0)}%` : '—'
```

**After:**
```tsx
stats?.avgResistance != null ? `${stats.avgResistance.toFixed(0)}%` : '—'
```

Using `!= null` (loose equality) catches both `undefined` and `null`, so when `stats` is undefined the entire optional chain `stats?.avgResistance` returns `undefined`, which `!= null` correctly evaluates to `false`, showing the dash instead of crashing.

## Summary

| File | Change |
|------|--------|
| `src/pages/security/SecurityDashboard.tsx` line 32 | Fix null guard on `stats?.avgResistance` |

This is a one-line fix. All other files (edge functions, hooks, pages, components, routes, sidebar) are correctly implemented and working.
