

# Fix Project Deletion -- Foreign Key Cascade Failure

## Problem

When you try to delete a project, it fails with error:
> "update or delete on table 'systems' violates foreign key constraint 'regulatory_reports_system_id_fkey'"

The delete function in `useDeleteProject` only cleans up 5 child tables before deleting systems, but there are actually **15 tables** that reference `systems` via foreign keys. The missing ones block the delete.

## Root Cause

The `useDeleteProject` hook in `src/hooks/useProjects.ts` manually cascades deletes in this order:

1. models (by system_id) -- handled
2. models (by project_id) -- handled
3. risk_assessments -- handled
4. impact_assessments -- handled
5. system_documents -- handled
6. system_approvals -- handled
7. systems -- **FAILS here** because these are NOT cleaned up:
   - `regulatory_reports`
   - `security_test_runs`
   - `security_findings`
   - `threat_models`
   - `risk_metrics`
   - `evaluation_requirements`
   - `deployment_attestations`
   - `mlops_governance_events`
   - `request_logs`
   - `events_raw`

## Fix

Update `src/hooks/useProjects.ts` to delete ALL referencing tables before deleting systems. The full cascade order will be:

### Step 1: Get system IDs (already done)
### Step 2: Delete models (already done)
### Step 3: Delete ALL system-referencing tables (expanded)

Add deletes for these 10 missing tables (in addition to the 4 already handled):
- `regulatory_reports` (system_id)
- `security_test_runs` (system_id)
- `security_findings` (system_id)
- `threat_models` (system_id) -- must also delete `threat_vectors` first since they reference threat_models
- `risk_metrics` (system_id)
- `evaluation_requirements` (system_id)
- `deployment_attestations` (system_id)
- `mlops_governance_events` (system_id)
- `request_logs` (system_id)
- `events_raw` (source_system_id)

### Step 4: Delete project-referencing tables
Also clean up tables referencing `projects` directly:
- `request_logs` (project_id)
- `risk_assessments` (project_id)
- `impact_assessments` (project_id)

### Step 5: Delete systems (already done)
### Step 6: Delete project (already done)

## Technical Details

### File: `src/hooks/useProjects.ts`

In the `useDeleteProject` mutation function, add delete calls for all missing tables between the existing model deletes and the system deletes. Each uses `.delete().in("system_id", systemIds)` pattern, with warnings logged on failure (non-blocking for non-critical tables).

Special case: `threat_vectors` must be deleted before `threat_models` since threat_vectors references threat_models. This requires fetching threat_model IDs first, then deleting threat_vectors by `threat_model_id`.

Special case: `events_raw` uses `source_system_id` instead of `system_id`.

### Ordering within the mutation:

```text
1. Fetch system IDs for project
2. Fetch threat_model IDs for those systems
3. Delete threat_vectors (by threat_model_id)
4. Delete models (by system_id + project_id)
5. Delete risk_assessments (by system_id)
6. Delete impact_assessments (by system_id)
7. Delete system_documents (by system_id)
8. Delete system_approvals (by system_id)
9. Delete regulatory_reports (by system_id)
10. Delete security_test_runs (by system_id)
11. Delete security_findings (by system_id)
12. Delete threat_models (by system_id)
13. Delete risk_metrics (by system_id)
14. Delete evaluation_requirements (by system_id)
15. Delete deployment_attestations (by system_id)
16. Delete mlops_governance_events (by system_id)
17. Delete request_logs (by system_id)
18. Delete events_raw (by source_system_id)
19. Delete systems (by id)
20. Delete request_logs (by project_id) -- direct project ref
21. Delete project
```

## Summary

| What | Change |
|------|--------|
| File | `src/hooks/useProjects.ts` |
| Issue | 10 foreign-key tables not cleaned up before system deletion |
| Fix | Add delete calls for all 15 referencing tables in correct order |
| Risk | Low -- all deletes use `.in("system_id", systemIds)` which is safe |

