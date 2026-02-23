

# HITL + Incidents Flow Audit: Critical Fixes

## Problems Found

### 1. FAKE SLACK NOTIFICATION (Critical -- violates "no fake UI" mandate)

In `ReviewDecisionDialog.tsx` lines 94-100, after every HITL decision, a **hardcoded fake toast** appears:

```
"Notification sent to #rai-alerts on Slack"
```

This is literally labelled `// Fake Slack notification` in the code. No Slack integration exists. This is deceptive UI that makes users think a real notification was sent.

**Fix:** Remove the fake Slack toast entirely. If `send-notification` edge function is invoked after decisions, show a toast based on the actual response. Otherwise, show nothing.

---

### 2. NO LINK BETWEEN INCIDENTS AND REVIEW QUEUE (Critical -- architectural gap)

The database has NO foreign key or explicit column linking `review_queue` entries to `incidents`. The only link is the weak `model_id` match, which creates a **many-to-many mess**:

- Running pentest 3 times on the same model creates 3 incidents AND 3 review queue items, all sharing the same `model_id`
- When a HITL reviewer approves a review, the code resolves ALL open incidents for that `model_id`:
  ```typescript
  .eq('model_id', review.model_id)
  .eq('status', 'open')
  ```
  This means approving ONE review resolves ALL 3 duplicate incidents -- even the ones that were never reviewed

- For red team failures and other reviews where `model_id` is null, the incident link is completely broken -- approving these reviews resolves NOTHING

**Database evidence:**
- 3 duplicate pentest reviews exist for model `1460d6d1`, all pending
- 3 duplicate pentest incidents exist for same model, all open
- Red team failure reviews have `model_id: null`, so their linked incidents can never be resolved via HITL

**Fix:**
1. Add an `incident_id` column to `review_queue` table
2. Update edge functions (security-pentest, security-jailbreak, eval-fairness, eval-toxicity, etc.) to create the incident FIRST, get the incident ID, then pass it to the review_queue insert
3. Update `ReviewDecisionDialog.tsx` to resolve the SPECIFIC linked incident by `incident_id` from `review.context`, not blanket `model_id`

---

### 3. QUERY KEY MISMATCH -- Stats Never Refresh (High)

`useIncidentStats()` in `useIncidents.ts` uses query key `['incidents', 'stats']`.

But `Incidents.tsx` invalidates `['incident-stats']` (lines 98, 154, 510).

These keys do NOT match. Stats KPI cards (Open, Critical, High, Total) in the Incidents page NEVER refresh when incidents change in realtime or after lifecycle checks.

**Fix:** Change all `invalidateQueries({ queryKey: ['incident-stats'] })` in `Incidents.tsx` to `invalidateQueries({ queryKey: ['incidents', 'stats'] })`, or use `invalidateQueries({ queryKey: ['incidents'] })` which matches both `['incidents']` and `['incidents', 'stats']`.

---

### 4. HITL "Recent Decisions" Shows Wrong Data (Medium)

In `HITL.tsx` line 67:
```typescript
const recentDecisions = reviews?.filter(r => r.status === 'approved' || r.status === 'rejected').slice(0, 3);
```

This filters the `review_queue` table for approved/rejected items and labels them "Recent Decisions". But these are REVIEWS, not actual DECISIONS. The `decisions` table (which stores the rationale, reviewer, timestamp) is never queried for display anywhere in the HITL page. Users see "Authorized" / "Denied" but have no way to see WHO decided or WHY.

**Fix:** Query the `decisions` table joined with `review_queue` for the "Recent Decisions" panel, showing the actual reviewer rationale, timestamp, and decision details.

---

### 5. DUPLICATE ESCALATION -- No Deduplication (Medium)

Edge functions create BOTH an incident AND a review queue item every time they run. Running a pentest 3 times on the same model creates 3 identical incidents and 3 identical reviews. There is zero deduplication logic.

**Fix:** Before inserting into `incidents` or `review_queue`, check for existing open entries for the same `model_id` + `incident_type` or `review_type`. Skip or update if one already exists.

---

### 6. `useUpdateReview` IMPORTED BUT NEVER USED (Low)

In `ReviewDecisionDialog.tsx` line 34:
```typescript
const updateReview = useUpdateReview();
```
This is imported and instantiated but never called. The review status update happens inside `useCreateDecision` instead.

**Fix:** Remove the unused import and variable.

---

## Implementation Plan

### Step 1: Database Migration -- Add `incident_id` to `review_queue`
```sql
ALTER TABLE public.review_queue 
ADD COLUMN incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL;
```

### Step 2: Fix Edge Functions (6 files)
For each escalation function (security-pentest, security-jailbreak, eval-fairness, eval-toxicity-hf, eval-privacy-hf, eval-explainability-hf):
- Insert incident FIRST and capture the returned `id`
- Pass `incident_id` in the `review_queue` insert AND in the `context` JSONB
- Add deduplication check before inserting

### Step 3: Fix `ReviewDecisionDialog.tsx`
- Remove fake Slack notification toast
- Change incident resolution from `model_id` match to specific `incident_id` from `review.context.incident_id` or `review.incident_id`
- Remove unused `useUpdateReview` import

### Step 4: Fix `Incidents.tsx` Query Key Mismatch
- Replace all `invalidateQueries({ queryKey: ['incident-stats'] })` with `invalidateQueries({ queryKey: ['incidents'] })`

### Step 5: Fix HITL "Recent Decisions" Panel
- Query `decisions` table joined with `review_queue` to show actual decision details (rationale, reviewer, timestamp)

### Step 6: Add Deduplication to Edge Functions
- Before inserting, check for existing open incident with same `model_id` + `incident_type`
- Before inserting review, check for existing pending review with same `model_id` + `review_type`

---

## Files Modified

| # | File | Change |
|---|------|--------|
| 1 | DB Migration | Add `incident_id` column to `review_queue` |
| 2 | `supabase/functions/security-pentest/index.ts` | Link incident to review, add dedup |
| 3 | `supabase/functions/security-jailbreak/index.ts` | Link incident to review, add dedup |
| 4 | `supabase/functions/eval-fairness/index.ts` | Link incident to review, add dedup |
| 5 | `supabase/functions/eval-toxicity-hf/index.ts` | Link incident to review, add dedup |
| 6 | `supabase/functions/eval-privacy-hf/index.ts` | Link incident to review, add dedup |
| 7 | `supabase/functions/eval-explainability-hf/index.ts` | Link incident to review, add dedup |
| 8 | `src/components/hitl/ReviewDecisionDialog.tsx` | Remove fake notification, fix incident resolution, remove unused import |
| 9 | `src/pages/Incidents.tsx` | Fix query key mismatch |
| 10 | `src/pages/HITL.tsx` | Fix Recent Decisions to query `decisions` table |
| 11 | `src/hooks/useReviewQueue.ts` | Add `incident_id` to `ReviewItem` interface |

