

# Remove All Models, Keep Only Gemini 3 Flash Preview

## What Will Happen

All 6 existing models and their linked systems will be deleted from the database, and a single new model will be created using the Lovable AI Gateway with `google/gemini-3-flash-preview`.

### Models Being Removed

| Model | Provider |
|-------|----------|
| Llama 3.3 70B | OpenRouter |
| Qwen3 Next 80B | OpenRouter |
| Mistral Small 3.1 24B | OpenRouter |
| openai/gpt-oss-120b:free | Custom |
| Gemma | Custom |
| deepseek/deepseek-r1-0528:free | OpenRouter |

### Model Being Created

| Field | Value |
|-------|-------|
| Name | Gemini 3 Flash Preview |
| Provider | Lovable |
| Model ID | google/gemini-3-flash-preview |
| Endpoint | https://ai.gateway.lovable.dev/v1/chat/completions |
| Auth | LOVABLE_API_KEY (pre-configured, no user input needed) |

## Steps

1. **Delete all 6 model records** from the `models` table
2. **Delete all 6 linked system records** from the `systems` table
3. **Create 1 new system** pointing to the Lovable AI Gateway
4. **Create 1 new model** linked to that system, under the AI project (`954496e7-9525-4891-aabb-2ba8cb4c27aa`)

## Technical Details

- No edge function changes needed -- they were already refactored to always call Lovable AI Gateway regardless of what's stored in the database
- The model/system records are used for display, audit, and selection in the UI
- Foreign key cascades or manual deletion order: models first, then systems
- The new model will have `status: 'active'` and `deployment_status: 'active'` so it's immediately usable

