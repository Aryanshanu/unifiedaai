

# Fix 2 Remaining Open Issues

## What's Actually Still Broken

Two items were committed to in previous plans but never implemented:

### Fix 1: Lineage Graph Depth Limit (Lineage.tsx)

The blast radius traversal at lines 332-353 iterates through `criticalPaths` and `lineageData.nodes` without any depth or fan-out limit. If the backend returns circular or deeply nested data, this can cause performance degradation or stack overflow.

**Change:** Add a `MAX_NODES = 200` safety cap to the blast radius processing at line 334. If `affectedIds.size` exceeds the cap, stop adding more nodes. This is a simple guard -- the actual traversal is flat (not recursive), so a depth limit doesn't apply here, but a node count limit does.

```text
File: src/pages/Lineage.tsx (lines 332-353)

Add MAX_NODES constant and check affectedIds.size before adding:
- const MAX_BLAST_RADIUS_NODES = 200;
- if (affectedIds.size >= MAX_BLAST_RADIUS_NODES) break/return early
```

### Fix 2: Wire Zod Validators to Hooks

The `safeValidateArray` function exists in `api-validators.ts` but is never imported or called. Three hooks still use blind `as Type[]` casts.

**Changes:**

1. **`src/hooks/useIncidents.ts`** (line 46): Replace `data as Incident[]` with `safeValidateArray(IncidentSchema, data, 'incidents')`

2. **`src/hooks/useDriftDetection.ts`** (line 47): Replace `data as DriftAlert[]` with `safeValidateArray(DriftAlertSchema, data, 'drift-alerts')`

3. **`src/hooks/usePolicies.ts`**: Find the policy pack fetch and replace its `as PolicyPack[]` cast with `safeValidateArray(PolicyPackSchema, data, 'policy-packs')`

Each hook needs to import `safeValidateArray` and the corresponding schema from `@/lib/api-validators`.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/Lineage.tsx` | Add MAX_BLAST_RADIUS_NODES = 200 cap to blast radius processing |
| `src/hooks/useIncidents.ts` | Wire `safeValidateArray(IncidentSchema, ...)` |
| `src/hooks/useDriftDetection.ts` | Wire `safeValidateArray(DriftAlertSchema, ...)` |
| `src/hooks/usePolicies.ts` | Wire `safeValidateArray(PolicyPackSchema, ...)` |

After this, the only remaining open items are the explicitly deferred ones (TypeScript strict mode and `any` type elimination), which are multi-day efforts requiring a dedicated sprint.
