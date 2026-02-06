
# Core Security Fix Plan
## Fixing All 4 Broken Security Modules

---

## Root Cause Analysis

### Issue 1: Pentesting - "All 30 tests indeterminate, 0% coverage"
**Root Cause:** The Gemma system (id: `d999464b`) is misconfigured. It has `provider: Custom` and `endpoint: https://openrouter.ai/google/gemma-3n-e4b-it` with `model_name: Gemma`. The `target-executor` auto-detects OpenRouter from the URL, but then uses `model_name = "Gemma"` (not a valid OpenRouter model ID). OpenRouter returns: `"Gemma is not a valid model ID"`. Every test fails at the target call, producing 30 indeterminate results.

**Fix:** The `target-executor` must handle this case - when a system has `provider: Custom` but an OpenRouter URL, and `model_name` is not a valid OpenRouter model ID (doesn't contain `/`), it should extract the model from the URL instead. The URL `https://openrouter.ai/google/gemma-3n-e4b-it` contains the valid model `google/gemma-3n-e4b-it`.

### Issue 2: Jailbreak Lab - Running but no results
**Root Cause:** Two sub-issues:
1. With Gemma target: Same OpenRouter model ID error as Pentesting.
2. With DeepSeek target: The `target-executor` returns `success: true` but `response length: 0` (empty string). DeepSeek R1 is a "thinking" model that takes 120+ seconds to respond, and the edge function times out. The jailbreaker gets empty responses, can't judge them, and produces no results (the `continue` statement at line 576-578 skips failed targets silently).
3. The jailbreaker also fails silently when targets return empty responses - it should mark these as indeterminate instead of skipping.

### Issue 3: Threat Modeling - "No threat vectors found"
**Root Cause:** No logs found for `agent-threat-modeler`, meaning either:
1. The edge function was never deployed, OR
2. The function crashes before logging anything.

The code at line 97 references `system.endpoint_url` but the actual column is `endpoint`. However, since `system` is fetched with `select('*')`, it would get `endpoint` not `endpoint_url`. The AI prompt uses `system.endpoint_url` which would be `undefined` - this wouldn't crash but would pass `"internal"` to the AI. The real issue is likely the function isn't deployed.

### Issue 4: Attack Library - Not covering 100% OWASP categories
**Root Cause:** All 50 attacks only map to 4 OWASP categories:
- `jailbreak` + `prompt_injection` -> `LLM01` (20 attacks)
- `harmful_content` + `toxicity` -> `LLM02` (15 attacks)
- `pii_extraction` -> `LLM06` (8 attacks)
- `policy_bypass` -> `LLM07` (7 attacks)

Missing OWASP categories: LLM03 (Training Data Poisoning), LLM04 (Model DoS), LLM05 (Supply Chain), LLM08 (Excessive Agency), LLM09 (Overreliance), LLM10 (Model Theft). That means only 4/10 OWASP categories are covered (40%).

Additionally, there is only **1 active automated test case** for the `jailbreak` module vs 36 for `pentesting`.

---

## Fix Plan

### Fix 1: target-executor Model ID Resolution

**File:** `supabase/functions/target-executor/index.ts`

Update `extractModelFromOpenRouterUrl` to detect when `model_name` is not a valid OpenRouter model ID (doesn't contain `/`) and fall back to URL extraction:

```typescript
function extractModelFromOpenRouterUrl(endpoint: string, modelName: string | null): string {
  // If model_name looks like a valid OpenRouter model ID (contains /), use it
  if (modelName && modelName.trim() && modelName.includes('/')) {
    return modelName;
  }
  
  // Try to extract model from URL path
  const urlMatch = endpoint.match(/openrouter\.ai\/([^/]+\/[^/?\s]+)/);
  if (urlMatch) {
    const extractedModel = urlMatch[1];
    console.log(`[target-executor] Extracted model from URL: ${extractedModel}`);
    return extractedModel;
  }
  
  // Default fallback
  return 'openai/gpt-4o-mini';
}
```

This fixes both Pentesting and Jailbreak for the Gemma target - `model_name: "Gemma"` doesn't contain `/`, so it extracts `google/gemma-3n-e4b-it` from the URL.

### Fix 2: agent-jailbreaker Empty Response Handling

**File:** `supabase/functions/agent-jailbreaker/index.ts`

In the automated suite (line 575-578), when target returns empty response, mark as indeterminate instead of silently skipping:

```typescript
if (!targetResult.success) {
  // Don't skip - record as indeterminate
  results.push({
    attackId: attack.id,
    attackName: attack.name,
    attackCategory: attack.category,
    verdict: 'indeterminate',
    blocked: false,
    confidence: 0,
    response: '',
    targetResponse: '',
    reasoning: `Target error: ${targetResult.error || 'Empty response'}`,
    riskScore: 0,
    severity: 'info',
    latencyMs: targetResult.latencyMs,
    decisionTrace: { parseSuccess: false, signalsTriggered: 0, hasContradiction: false, confidenceBreakdown: { parseSuccessScore: 0, signalConsistencyScore: 0, explanationQualityScore: 0, noErrorsScore: 0 }, rawConfidence: 0, rulesEvaluated: [] },
  });
  indeterminateCount++;
  continue;
}

// Also check for empty responses from successful calls
if (!targetResult.response || targetResult.response.trim() === '') {
  results.push({...same indeterminate structure...});
  indeterminateCount++;
  continue;
}
```

### Fix 3: Deploy agent-threat-modeler & Fix Field Reference

**File:** `supabase/functions/agent-threat-modeler/index.ts`

Fix line 97: Change `system.endpoint_url` to `system.endpoint`:

```typescript
// Line 97: Before
- Endpoint: ${system.endpoint_url || 'internal'}
// After  
- Endpoint: ${system.endpoint || 'internal'}
```

Then deploy the function.

### Fix 4: Seed Missing OWASP Attack Categories

Add attacks for the 6 missing OWASP categories via database migration. Each category gets 5-8 attacks:

| OWASP | Category | New Attacks |
|-------|----------|-------------|
| LLM03 | Training Data Poisoning | 5 attacks (data injection, poisoning probes) |
| LLM04 | Model Denial of Service | 5 attacks (resource exhaustion, recursive prompts) |
| LLM05 | Supply Chain | 5 attacks (plugin exploitation, dependency attacks) |
| LLM08 | Excessive Agency | 6 attacks (unauthorized actions, tool misuse) |
| LLM09 | Overreliance | 5 attacks (hallucination exploitation, false authority) |
| LLM10 | Model Theft | 5 attacks (model extraction, parameter probing) |

### Fix 5: Add Jailbreak Automated Test Cases

Currently only 1 automated test case for `jailbreak` module. Add 15+ test cases covering all 6 attack categories to enable proper automated scanning in the Jailbreak Lab.

---

## Technical Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/target-executor/index.ts` | Fix model ID validation in `extractModelFromOpenRouterUrl` |
| `supabase/functions/agent-jailbreaker/index.ts` | Handle empty/failed target responses as indeterminate instead of silent skip |
| `supabase/functions/agent-threat-modeler/index.ts` | Fix `endpoint_url` -> `endpoint` field reference |
| Database migration | Seed 31 new attacks for LLM03/04/05/08/09/10 categories |
| Database migration | Seed 15+ jailbreak automated test cases |

## Expected Results After Fix

- **Pentesting with Gemma:** Model correctly resolved to `google/gemma-3n-e4b-it`, tests execute and return real verdicts
- **Jailbreak Lab:** Empty responses shown as indeterminate with error details (not silently dropped)
- **Threat Modeling:** Function deploys and generates vectors successfully
- **Attack Library:** Full OWASP LLM Top 10 coverage (10/10 categories, 80+ total attacks)
