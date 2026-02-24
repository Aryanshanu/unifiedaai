

# Data Quality Engine -- Deep Root-Level Audit & Fix

## Critical Issues Found

### Issue 1: Profiling Validity Score is HARDCODED (Lines 356-366 of `dq-profile-dataset`)

**Location:** `supabase/functions/dq-profile-dataset/index.ts` lines 346-367

**Problem:** The validity dimension score uses hardcoded magic numbers instead of computing from actual data:
- Numeric columns: `const validScore = 0.95` -- hardcoded, always returns 95%
- Datetime columns: `validityScores[col.column_name] = 0.98` -- hardcoded, always returns 98%
- String columns: uses completeness as a proxy instead of actual format validation

**Fix:** Actually compute validity by checking:
- Numeric columns: count values within 3 standard deviations of mean
- Datetime columns: count values that successfully parse as valid dates
- String columns: check for empty strings, whitespace-only values, and common garbage patterns

### Issue 2: Accuracy Dimension is FABRICATED (Lines 377-393)

**Location:** `supabase/functions/dq-profile-dataset/index.ts` lines 377-393

**Problem:** Accuracy is marked `computed: true` but is actually just `(validity * 0.7 + completeness * 0.3)` -- this is a synthetic formula, not a real accuracy measurement. Without ground-truth data to compare against, accuracy CANNOT be computed. The score is misleading.

**Fix:** Mark accuracy as `computed: false` with `reason: "Requires ground-truth reference data"` and set `score: null`. This is honest -- accuracy requires external validation data that we don't have.

### Issue 3: Timeliness Score Defaults to 1.0 (Perfect) When No Date Columns Exist (Line 397)

**Location:** `supabase/functions/dq-profile-dataset/index.ts` line 397

**Problem:** `let timelinessScore = 1.0; // Default to fresh if no date columns` -- this gives a perfect 100% timeliness score when there are NO date columns. This is dishonest. If there's no temporal data, timeliness is not measurable.

**Fix:** When no date columns exist, set `computed: false`, `score: null`, `reason: "No datetime columns found"`.

### Issue 4: Timeliness Fallback on Parse Failure (Line 412)

**Location:** `supabase/functions/dq-profile-dataset/index.ts` line 412

**Problem:** `timelinessDetails[col.column_name] = 0.8; // Default if date parsing fails` -- fabricated score.

**Fix:** Set to `0` with a logged warning, or skip the column from the average.

### Issue 5: Consistency Score Formula is Arbitrary (Lines 428-455)

**Location:** `supabase/functions/dq-profile-dataset/index.ts` lines 428-455

**Problem:** The consistency calculation uses `Math.max(0.5, ...)` which means the minimum possible consistency score is 50% -- this floor masks real data problems. The formula `1 - (patternScore * 0.5)` is arbitrary and not based on any data quality standard.

**Fix:** Remove the 0.5 floor. Use a proper entropy-based consistency measure: `1 - (distinct_count / row_count)` for categorical columns, and coefficient of variation for numeric columns. Or mark as `computed: false` if the approach can't reliably measure consistency.

### Issue 6: Evidence Hash Uses Weak Non-Crypto Hash (Lines 230-242 of `eval-data-quality`)

**Location:** `supabase/functions/eval-data-quality/index.ts` lines 230-242

**Problem:** `generateEvidenceHash` uses a simple bitwise hash (djb2-style), not SHA-256. The comment says "in production, use crypto.subtle.digest" but it's still using the weak hash. This violates the project's cryptographic integrity requirements.

**Fix:** Replace with `crypto.subtle.digest('SHA-256', data)` which is available in Deno.

### Issue 7: Streaming Dashboard `nullRate` and `duplicateRate` Always Show 0 (Lines 279-282 of `DQStreamingDashboard`)

**Location:** `src/components/engines/DQStreamingDashboard.tsx` lines 279-282

**Problem:** The execution summary from the backend never includes `null_rate` or `duplicate_rate` fields, so these always display `0`. The `?? 0` fallback hides the fact that this data doesn't exist.

**Fix:** Compute null rate from completeness dimension metrics and duplicate rate from uniqueness dimension metrics in the dashboard component itself, since the raw data IS available in the execution metrics.

### Issue 8: Hotspot Score Always 0 (Line 305 of `DQStreamingDashboard`)

**Location:** `src/components/engines/DQStreamingDashboard.tsx` line 305

**Problem:** `score: 0 // Hotspot score should come from actual data or be omitted` -- this is the comment but the value is hardcoded to 0.

**Fix:** Remove the `score` field from hotspots entirely since incidents don't have scores, or derive it from the related rule's `success_rate` by looking up the incident's `rule_id` in the execution metrics.

### Issue 9: Profiling Completeness/Uniqueness Are in PERCENTAGE Space But Stored Ambiguously

**Location:** `supabase/functions/dq-profile-dataset/index.ts` lines 292-293, 330-343

**Problem:** Column-level `completeness` and `uniqueness` are computed as percentages (0-100) at lines 292-293, then divided by 100 to convert to ratio (0-1) at lines 330-343 for dimension scores. However, the column_profiles themselves store the PERCENTAGE values. The `DQProfilingReport` component displays these as `(col.completeness * 100).toFixed(1)%` -- but they're ALREADY percentages! This means 95% completeness displays as **9500%**.

Wait -- checking `DQProfilingReport.tsx` line 186: `{(col.completeness * 100).toFixed(1)}%` -- if `col.completeness` is already a percentage (e.g., 95), this displays as `9500.0%`. This is a critical display bug.

**Fix:** Either:
- Store column-level completeness/uniqueness as ratios (0-1) in the profiler, OR
- Fix the display to not multiply by 100

After rechecking: The profiler stores completeness as a percentage (0-100 range). The `DQProfilingReportTabular` component likely handles this differently than `DQProfilingReport`. Need to verify which component is actually rendered.

Actually, looking at `DataQualityEngine.tsx` line 677, it uses `DQProfilingReportTabular`, not `DQProfilingReport`. Let me note this needs verification during implementation.

---

## Fix Plan

### Fix A: Rewrite Validity Dimension -- Real Computation

**File: `supabase/functions/dq-profile-dataset/index.ts`**

Replace the hardcoded validity scores with actual data validation:
- Numeric columns: iterate ALL values, count how many are within `mean +/- 3*stdDev`
- Datetime columns: iterate ALL values, count how many successfully parse to valid dates
- String columns: count non-empty, non-whitespace-only values as valid

### Fix B: Mark Accuracy as Non-Computable

**File: `supabase/functions/dq-profile-dataset/index.ts`**

Change accuracy to:
```
{
  dimension: "accuracy",
  score: null,
  computed: false,
  reason: "Requires ground-truth reference data for comparison",
  weight: 0,
  details: {}
}
```

### Fix C: Fix Timeliness When No Date Columns

**File: `supabase/functions/dq-profile-dataset/index.ts`**

- No date columns: `score: null, computed: false, reason: "No datetime columns in dataset"`
- Date parse failure: skip column from average instead of defaulting to 0.8

### Fix D: Fix Consistency Floor

**File: `supabase/functions/dq-profile-dataset/index.ts`**

Remove `Math.max(0.5, ...)` floor. Use proper formula:
- Categorical columns: `1 - (distinct_count / row_count)` (higher = more consistent)
- Clamp between 0 and 1, no artificial floor

### Fix E: Replace Weak Hash with SHA-256

**File: `supabase/functions/eval-data-quality/index.ts`**

Replace `generateEvidenceHash` with:
```typescript
async function generateEvidenceHash(metrics, timestamp) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify({ metrics, timestamp }));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```
Also make the calling function `async` if not already.

### Fix F: Compute nullRate/duplicateRate from Real Metrics

**File: `src/components/engines/DQStreamingDashboard.tsx`**

Replace the `?? 0` fallbacks with actual computation from the execution metrics array:
- `nullRate`: average `(1 - success_rate)` of all completeness-dimension rules
- `duplicateRate`: average `(1 - success_rate)` of all uniqueness-dimension rules

### Fix G: Fix or Remove Hotspot Score

**File: `src/components/engines/DQStreamingDashboard.tsx`**

Remove `score` property from hotspots entirely since incidents don't carry a numeric score, or compute from the linked rule's success_rate if `rule_id` is available on the incident.

### Fix H: Fix Profiling Report Display Units

**File: `src/components/engines/DQProfilingReportTabular.tsx`** (verify)

Ensure completeness/uniqueness values from the profiler (which are 0-100 percentages) are displayed correctly without double-multiplication. If the tabular report already handles this, no change needed. If it uses `* 100`, fix it.

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `supabase/functions/dq-profile-dataset/index.ts` | Fix validity (real computation), accuracy (non-computable), timeliness (no date columns), consistency (remove floor) |
| `supabase/functions/eval-data-quality/index.ts` | Replace weak hash with SHA-256 |
| `src/components/engines/DQStreamingDashboard.tsx` | Compute nullRate/duplicateRate from real metrics; fix hotspot scores |
| `src/components/engines/DQProfilingReportTabular.tsx` | Verify and fix unit display if needed |

---

## Technical Notes

- Accuracy dimension becomes `computed: false` -- this is the HONEST approach. Accuracy requires external ground-truth data (e.g., "this address is the correct address") which the DQ engine does not have access to. Fabricating it from validity+completeness is misleading.
- Timeliness becomes `computed: false` when datasets have no datetime columns. A dataset of product SKUs has no temporal dimension -- saying it's "100% timely" is wrong.
- The consistency floor of 0.5 means the lowest possible consistency score was 50%. Real data with high cardinality in categorical columns could genuinely have low consistency. Removing the floor exposes the truth.
- SHA-256 via `crypto.subtle.digest` is available natively in Deno -- no library needed.
- The Streaming Dashboard `nullRate` and `duplicateRate` were previously cleaned of `Math.random()` but replaced with `?? 0` which always resolves to 0 since the backend never sends those fields. Computing from dimension metrics is the correct approach.
