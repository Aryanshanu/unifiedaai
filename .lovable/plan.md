

# Fix: DQ Incidents Severity Mapping + Description Data + Dataset Persistence

## Root Causes

### Issue 1: "UNKNOWN_SEVERITY" warnings destroying trust score
The `dq-raise-incidents` edge function stores severity as `P0/P1/P2` in the `dq_incidents` table. When `dq-truth-enforcer` reads these incidents back, its `SEVERITY_TO_PRIORITY` map only knows `critical→P0, warning→P1, info→P2`. It sees `P2` as an unknown severity, generates warnings, and deducts 20 points from the trust score.

**Fix**: Update `SEVERITY_TO_PRIORITY` in `dq-truth-enforcer/index.ts` to also map `P0→P0, P1→P1, P2→P2` (identity mapping) so it recognizes its own output format.

### Issue 2: "N/A%" and generic descriptions
`DQIncidentsTabular.tsx` line 126 reads `incident.affected_records_percentage` and `incident.column_name` — fields that are never populated by `dq-raise-incidents`. The edge function stores `action` text but not structured metadata like column name or percentage.

**Fix**: Extract column name and percentage from the rule execution metrics data that's already available. Update `dq-raise-incidents` to include `column_name`, `affected_records_percentage`, and `rule_name` in the incident insert payload. Also update the `dq_incidents` table to accept these columns (or store them in a JSONB metadata field).

### Issue 3: No dataset persistence across navigation
`selectedDataset` in both `EvaluateTab` and `ControlPlaneTab` uses `useState('')`. When user navigates away and comes back, the selection is lost.

**Fix**: Persist `selectedDataset` to `localStorage` keyed by tab name. Restore on mount.

---

## Changes

### 1. `supabase/functions/dq-truth-enforcer/index.ts`
Add `P0`, `P1`, `P2` to `SEVERITY_TO_PRIORITY` map so it recognizes priority-format severities:
```
const SEVERITY_TO_PRIORITY = {
  'critical': 'P0',
  'warning': 'P1', 
  'info': 'P2',
  'P0': 'P0',  // identity mapping for already-mapped severities
  'P1': 'P1',
  'P2': 'P2',
};
```

### 2. `supabase/functions/dq-raise-incidents/index.ts`
Add `rule_name` and `column_name` to the incident insert payload so the UI can display meaningful descriptions instead of "N/A":
- Extract `column_name` from `metric.rule_name` (rules are named like `email_not_null`, `id_unique`)
- Compute `affected_records_percentage` from `metric.failed_count / metric.total_count * 100`
- Add these to the DB insert object

### 3. DB Migration
Add columns to `dq_incidents`: `rule_name TEXT`, `column_name TEXT`, `affected_records_count INT`, `affected_records_percentage NUMERIC`

### 4. `src/pages/engines/DataQualityEngine.tsx`
Persist `selectedDataset` to localStorage in both `EvaluateTab` and `ControlPlaneTab`:
```typescript
const [selectedDataset, setSelectedDataset] = useState<string>(() => {
  return localStorage.getItem('dq-selected-dataset') || '';
});
useEffect(() => {
  if (selectedDataset) localStorage.setItem('dq-selected-dataset', selectedDataset);
}, [selectedDataset]);
```

### 5. `src/components/engines/DQIncidentsTabular.tsx`
Update `generateIncidentDescription` fallback: if `column_name` is still missing, parse it from `rule_name` or `failure_signature` instead of showing "data" as default. Replace `N/A` percentage fallback with the failure info from `action` field.

---

## Summary

| File | Change |
|------|--------|
| `dq-truth-enforcer/index.ts` | Add P0/P1/P2 identity mappings to SEVERITY_TO_PRIORITY |
| `dq-raise-incidents/index.ts` | Include rule_name, column_name, affected % in insert |
| DB migration | Add 4 columns to dq_incidents |
| `DataQualityEngine.tsx` | localStorage persistence for selected dataset |
| `DQIncidentsTabular.tsx` | Smarter fallback for description generation |

