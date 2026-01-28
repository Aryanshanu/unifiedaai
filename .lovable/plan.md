

# Fix: GovernanceFlowDiagram Crash (Cannot read 'qualityScore' of undefined)

## Root Cause Analysis

The application crashes on the home page (`/`) because:

1. **Primary Issue**: In `GovernanceFlowDiagram.tsx` line 69, the code calls `dynamicStages.map()` but `dynamicStages` can be undefined when data hasn't loaded yet:
   ```typescript
   const stages = propStages || dynamicStages.map(s => ({...}));
   ```

2. **Secondary Issue**: In `useGovernanceFlowMetrics.ts` line 117, inconsistent null checking:
   ```typescript
   value: data?.qualityScore !== null ? `${data.qualityScore}%` : 'N/A'
   //                                    ↑ This access is unguarded!
   ```

The error stack trace confirms:
```
TypeError: Cannot read properties of undefined (reading 'qualityScore')
at useGovernanceFlowMetrics (src/hooks/useGovernanceFlowMetrics.ts:118:66)
at GovernanceFlowDiagram (src/components/dashboard/GovernanceFlowDiagram.tsx:67:50)
```

---

## Fix Implementation

### File 1: `src/hooks/useGovernanceFlowMetrics.ts`

**Problem**: The `stages` array is built outside the data check, accessing `data.qualityScore` without proper guarding.

**Fix**: Add proper null checks throughout and return empty array when data is undefined:

```typescript
// Line 102-151: Wrap stages construction with proper data checks
const stages: StageMetrics[] = data ? [
  {
    id: 1,
    name: "Data Ingestion",
    // ...
    metrics: [{ label: "Sources", value: data.sourcesCount ?? 0 }]
  },
  {
    id: 2,
    name: "Data Quality",
    // ...
    metrics: [{ label: "Quality Score", value: data.qualityScore != null ? `${data.qualityScore}%` : 'N/A' }]
  },
  // ... rest of stages with proper null guards
] : [];
```

### File 2: `src/components/dashboard/GovernanceFlowDiagram.tsx`

**Problem**: Line 69 calls `.map()` on potentially undefined `dynamicStages`.

**Fix**: Add fallback empty array:

```typescript
// Line 69
const stages = propStages || (dynamicStages || []).map(s => ({
  ...s,
  icon: stageIcons[s.id] || Activity,
}));
```

Also add early return if no stages to render:

```typescript
// After line 72
if (!isLoading && stages.length === 0) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>6-Stage Governance Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Loading governance data...</p>
      </CardContent>
    </Card>
  );
}
```

---

## Summary of Changes

| File | Line(s) | Change |
|------|---------|--------|
| `useGovernanceFlowMetrics.ts` | 102-151 | Wrap stages array in conditional: `data ? [...] : []` |
| `useGovernanceFlowMetrics.ts` | 117 | Fix null check: `data.qualityScore != null ? \`${data.qualityScore}%\` : 'N/A'` |
| `GovernanceFlowDiagram.tsx` | 69 | Add fallback: `(dynamicStages || []).map(...)` |
| `GovernanceFlowDiagram.tsx` | 73-83 | Add empty state check for better UX |

---

## Expected Outcome

After fix:
- Home page (`/`) loads without crashing
- 6-Stage Pipeline diagram renders correctly
- Loading skeleton shows while data fetches
- Proper values display once data arrives
