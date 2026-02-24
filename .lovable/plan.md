

# Integrate 3 New OpenRouter Models into AI Project

## What Will Happen

Three new models will be registered in your "AI" project with the correct OpenRouter API endpoint and your provided API key:

| Model | ID |
|-------|-----|
| Mistral Small 3.1 24B | `mistralai/mistral-small-3.1-24b-instruct:free` |
| Qwen3 Next 80B | `qwen/qwen3-next-80b-a3b-instruct:free` |
| Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct:free` |

All three will use:
- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Provider:** OpenRouter
- **API Key:** Your provided key (stored in the systems table alongside each model)

## Steps

### 1. Database Inserts (3 systems + 3 models)

For each model, create a `systems` row with the correct endpoint, model_name, and API token, then a linked `models` row. This mirrors the existing pattern used by your `openai/gpt-oss-120b:free` and `deepseek/deepseek-r1-0528:free` models.

### 2. Verify Connectivity

After inserting, test one of the models using the `custom-prompt-test` edge function to confirm it responds correctly.

## Important Note

Your API key will be stored in the `systems.api_token_encrypted` column (same as your other OpenRouter models). Since these are `:free` models, make sure your OpenRouter privacy settings allow "Free model publication" at [openrouter.ai/settings/privacy](https://openrouter.ai/settings/privacy) -- otherwise you'll get the same 404 error as before.

## Technical Details

- **Project ID:** `954496e7-9525-4891-aabb-2ba8cb4c27aa`
- No code changes needed -- the existing registration flow, evaluation engines, and `custom-prompt-test` already support OpenRouter models with the normalization fixes applied earlier
- Each model gets `status: 'draft'` and `deployment_status: 'draft'` initially

