

# Fix: OpenRouter/OpenAI Model API Endpoint Issues

## Root Cause

When you register a model, the system stores two endpoints:
- `models.endpoint` (what you typed)
- `systems.endpoint` (copied from your input)

The problem is that `systems.endpoint` for your "openai/gpt-oss-120b:free" model is stored as `https://openrouter.ai/openai/gpt-oss-120b:free` -- this is a **model page URL**, not an API endpoint. When evaluation engines try to call this URL, they get an HTML page back instead of JSON, causing errors.

Additionally, the shared `call-user-model.ts` function (used by all 5 evaluation engines and security tests) lacks the smart URL normalization that `target-executor` already has.

## Database Fix

Update the broken system endpoints directly:

```sql
-- Fix the openai/gpt-oss-120b:free model's system endpoint
UPDATE systems 
SET endpoint = 'https://openrouter.ai/api/v1/chat/completions'
WHERE endpoint = 'https://openrouter.ai/openai/gpt-oss-120b:free';

-- Fix the Gemma model's system endpoint  
UPDATE systems 
SET endpoint = 'https://openrouter.ai/api/v1/chat/completions'
WHERE endpoint = 'https://openrouter.ai/google/gemma-3n-e4b-it';
```

## Code Fixes (3 files)

### 1. `supabase/functions/_shared/call-user-model.ts`

Add OpenRouter URL normalization and model extraction (same logic `target-executor` already uses):

- Detect when endpoint is an OpenRouter model page URL (e.g., `openrouter.ai/{org}/{model}` without `/api/v1/`)
- Extract the model ID from the URL path
- Replace endpoint with `https://openrouter.ai/api/v1/chat/completions`
- Use the extracted model ID in the request body
- Add proper `HTTP-Referer` and `X-Title` headers for OpenRouter

### 2. `src/hooks/useModels.ts` (useCreateModel)

Add endpoint normalization at registration time so bad URLs never get stored:

- Before inserting into `systems`, detect OpenRouter model page URLs
- Auto-correct to `https://openrouter.ai/api/v1/chat/completions`
- Extract model ID from the URL and store it as `model_name`
- Auto-detect provider as "openrouter" when URL contains `openrouter.ai`

### 3. `src/components/models/ModelRegistrationForm.tsx`

Improve the endpoint validation on the Configuration step:

- When the endpoint field loses focus, check if it's an OpenRouter model page URL
- Show a warning with auto-correct button (already partially built but needs the OpenRouter case)
- Pre-fill the provider as "OpenRouter" when an OpenRouter URL is detected

## Files Modified

| # | File | Change |
|---|------|--------|
| 1 | Database migration | Fix existing broken system endpoints |
| 2 | `supabase/functions/_shared/call-user-model.ts` | Add OpenRouter URL normalization + model extraction |
| 3 | `src/hooks/useModels.ts` | Normalize endpoint at registration time |
| 4 | `src/components/models/ModelRegistrationForm.tsx` | Better endpoint validation for OpenRouter URLs |

## What This Fixes

- Evaluation engines (Fairness, Toxicity, Privacy, Hallucination, Explainability) will correctly call OpenRouter API
- Security tests (Pentest, Jailbreak) will correctly call OpenRouter API
- Future model registrations with OpenRouter URLs will be auto-corrected
- The "HTML is not valid JSON" errors in edge function logs will be eliminated

