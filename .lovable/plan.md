

# Fix Plan: Security Edge Functions -- Database Schema Mismatch

## Root Cause

All three security edge functions (`security-pentest`, `security-jailbreak`, `security-threat-model`) fail on database saves because the INSERT statements reference columns that do not exist in the actual tables. The edge function code was written assuming a different schema than what is deployed.

The logs confirm this:
- `Could not find the 'initiated_by' column of 'security_test_runs' in the schema cache`
- `Could not find the 'metadata' column of 'threat_models' in the schema cache`

## Problem Summary

Every INSERT in all 3 edge functions uses wrong column names. Here is the full mapping:

### Table: `security_test_runs`

| Edge Function Uses | Actual Column | Fix |
|---|---|---|
| `model_id` | Does not exist (`system_id` exists) | Map model to system, use `system_id` |
| `overall_score` | Does not exist | Store in `summary` (jsonb) |
| `risk_level` | Does not exist | Store in `summary` (jsonb) |
| `results` | Does not exist | Store in `summary` (jsonb) |
| `initiated_by` | `triggered_by` | Rename to `triggered_by` |
| (missing) | `tests_total` (integer) | Set from prompt count |
| (missing) | `tests_passed` (integer) | Set from non-vulnerable count |
| (missing) | `tests_failed` (integer) | Set from vulnerable count |
| (missing) | `coverage_percentage` (numeric) | Calculate from success rate |

### Table: `security_findings`

| Edge Function Uses | Actual Column | Fix |
|---|---|---|
| `model_id` | Does not exist (`system_id` exists) | Map model to system, use `system_id` |
| `finding_type` | Does not exist | Drop (use `title` for categorization) |
| `score` | Does not exist | Store as `fractal_risk_index` |
| `details` | Does not exist | Store in `evidence` (jsonb) |
| (missing) | `vulnerability_id` (text) | Generate from type+index |

### Table: `threat_models`

| Edge Function Uses | Actual Column | Fix |
|---|---|---|
| `model_id` | Does not exist (`system_id` exists) | Map model to system, use `system_id` |
| `status` | Does not exist | Drop |
| `threat_count` | Does not exist | Drop |
| `metadata` | Does not exist | Drop (store in `architecture_graph` jsonb) |
| (missing) | `name` (text, likely required) | Set from framework + model name |

### Table: `threat_vectors`

| Edge Function Uses | Actual Column | Fix |
|---|---|---|
| `risk_score` | Does not exist | Drop |
| `category` | Does not exist | Map to `owasp_category` or `atlas_tactic` or `maestro_layer` based on framework |
| `mitigation_status` | Does not exist | Drop |
| `mitigations` | `mitigation_checklist` | Rename |

### Table: `review_queue`

| Edge Function Uses | Actual Column | Fix |
|---|---|---|
| `entity_type` | Does not exist | Drop |
| `entity_id` | `model_id` | Rename to `model_id` |
| `metadata` | Does not exist | Store in `context` (jsonb) |

### Table: `incidents`

| Edge Function Uses | Actual Column | Fix |
|---|---|---|
| `source` | Does not exist | Drop |
| `metadata` | Does not exist | Drop (append info to `description`) |
| `model_id` | Exists | OK |

---

## Fix Details

### File 1: `supabase/functions/security-pentest/index.ts`

**Save to `security_test_runs` (line 192-206):**
- Look up `system_id` from the model record (already fetched via `getModelConfig` -> query model with system)
- Replace `model_id` with `system_id`
- Replace `initiated_by` with `triggered_by`
- Remove `overall_score`, `risk_level`, `results` -- pack into `summary` jsonb
- Add `tests_total`, `tests_passed`, `tests_failed`, `coverage_percentage`

**Save to `security_findings` (line 211-224):**
- Replace `model_id` with `system_id`
- Remove `finding_type`, `score`, `details`
- Add `vulnerability_id` (generated)
- Map `score` to `fractal_risk_index`
- Map `details` to `evidence`

**Auto-escalation incidents (line 228-235):**
- Remove `source` and `metadata` fields
- Keep `model_id`, `title`, `description`, `severity`, `status`, `incident_type`

**Auto-escalation review_queue (line 238-247):**
- Replace `entity_type`/`entity_id` with `model_id`
- Replace `metadata` with `context`

**Additional change:** Modify `getModelConfig` call or add a separate query to get `system_id` for the model.

### File 2: `supabase/functions/security-jailbreak/index.ts`

Same pattern of fixes for:
- `security_test_runs` save (line 222-236): same column mapping
- `security_findings` save (line 242-253): same column mapping
- `incidents` save (line 258-266): remove `source`, `metadata`
- `review_queue` save (line 268-278): use `model_id` + `context`

### File 3: `supabase/functions/security-threat-model/index.ts`

- `threat_models` save (line 189-201): use `system_id` instead of `model_id`, remove `status`, `threat_count`, `metadata`, add `name`
- `threat_vectors` save (line 208-219): remove `risk_score`, `mitigation_status`, rename `mitigations` to `mitigation_checklist`, map `category` to appropriate framework field
- `security_test_runs` save (line 223-233): same column mapping as pentest/jailbreak
- `review_queue` save (line 237-247): same fixes

### File 4: `src/hooks/useSecurityScans.ts`

Update `useSecurityStats` to read from correct columns:
- Use `summary` jsonb field to extract `overall_score` and test type info
- Update aggregation logic to work with actual schema

### File 5: `src/pages/security/SecurityDashboard.tsx`

Update to handle data from correct column structure (`summary` jsonb instead of top-level `overall_score`).

---

## Model-to-System Resolution

All three functions need the model's `system_id`. The `getModelConfig` function already queries `models` with `system:systems(*)`. We will:
1. Add a helper that returns `{ modelConfig, systemId }` 
2. Or query separately: `SELECT system_id FROM models WHERE id = $modelId`

---

## Execution Order

1. Fix `security-pentest/index.ts` -- remap all INSERT columns
2. Fix `security-jailbreak/index.ts` -- remap all INSERT columns
3. Fix `security-threat-model/index.ts` -- remap all INSERT columns
4. Fix `useSecurityScans.ts` -- read from correct columns
5. Fix `SecurityDashboard.tsx` -- handle `summary` jsonb
6. Deploy all 3 edge functions
7. Test each function end-to-end

## Success Criteria

- All 3 edge functions return 200 with valid payloads
- `security_test_runs` rows created with correct columns
- `security_findings` rows created for vulnerabilities
- `threat_models` + `threat_vectors` rows created
- No PGRST204 errors in edge function logs
- Security Dashboard displays real data from scans
