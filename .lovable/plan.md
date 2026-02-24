

# Replace All External Model Calls with Lovable AI Gateway

## The Problem

Every evaluation engine and the custom prompt test function currently calls external providers (OpenRouter, HuggingFace) which are unreliable -- rate limits, 404 errors, 429 errors, timeouts, privacy policy blocks. This has been causing constant failures across all core RAI features.

## The Solution

Replace ALL external model calls with the **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`), which:
- Uses the pre-configured `LOVABLE_API_KEY` (already available)
- No external API keys needed
- No rate limit issues from free-tier models
- Reliable, fast, production-grade

**Default model:** `google/gemini-3-flash-preview`

---

## Files to Modify

### 1. Edge Functions (6 files) -- Replace `callUserModel` / `callTargetModel`

Each of these functions has a `callUserModel` (or `callTargetModel`) function that routes to OpenRouter/HuggingFace/OpenAI based on endpoint URL. **All will be replaced** with a single unified call to Lovable AI Gateway.

| File | Current Behavior |
|------|-----------------|
| `supabase/functions/custom-prompt-test/index.ts` | Uses `callTargetModel` with OpenRouter/HF routing |
| `supabase/functions/eval-fairness/index.ts` | Uses `callUserModel` with OpenRouter/HF routing |
| `supabase/functions/eval-toxicity-hf/index.ts` | Uses `callUserModel` with OpenRouter/HF routing |
| `supabase/functions/eval-hallucination-hf/index.ts` | Uses `callUserModel` with OpenRouter/HF routing |
| `supabase/functions/eval-privacy-hf/index.ts` | Uses `callUserModel` with OpenRouter/HF routing |
| `supabase/functions/eval-explainability-hf/index.ts` | Uses `callUserModel` with OpenRouter/HF routing |

**New `callUserModel` pattern (same for all 6):**

```text
async function callUserModel(prompt, modelName?):
  1. Read LOVABLE_API_KEY from Deno.env
  2. POST to https://ai.gateway.lovable.dev/v1/chat/completions
     - model: "google/gemini-3-flash-preview"
     - messages: [{ role: "user", content: prompt }]
     - Authorization: Bearer LOVABLE_API_KEY
  3. Parse response.choices[0].message.content
  4. Handle 429 (rate limit) and 402 (payment required) errors
  5. Return output string
```

The function will **ignore** the model's stored endpoint/apiToken entirely -- it always goes through Lovable AI. The stored model metadata is still used for display/audit purposes, but the actual inference call goes to Lovable.

### 2. Database Update -- Register a Lovable AI Built-in System

Update the existing model system records to point to the Lovable AI gateway so the UI reflects the correct configuration:
- Endpoint: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Provider: `lovable`
- Model name: `google/gemini-3-flash-preview`

### 3. Frontend -- No Changes Needed

The frontend hooks (`useCustomPromptTest`, engine pages) already work correctly. They pass `modelId` to the edge functions, and the edge functions handle the rest. Since we're only changing the backend call target, no frontend changes are required.

---

## What Changes for Users

- All 5 evaluation engines (Fairness, Toxicity, Privacy, Hallucination, Explainability) will use Google Gemini via Lovable AI
- Custom prompt tests will use the same gateway
- No more 429, 404, 502 errors from free-tier OpenRouter models
- All existing evaluation math, scoring formulas, transparency components remain exactly the same
- Evaluation results will show "Lovable AI Gateway" as the endpoint in audit logs

## Edge Cases Handled

- **429 Too Many Requests**: Surface "Rate limited, try again" message
- **402 Payment Required**: Surface "Add credits to your workspace" message  
- **Timeout**: 55-second AbortController timeout preserved
- **HuggingFace toxicity classifier** (`analyzeWithHuggingFace` in eval-toxicity-hf): This secondary classifier for analyzing model output toxicity will be replaced with pattern-based analysis (already implemented in `custom-prompt-test`), removing the HuggingFace dependency entirely

