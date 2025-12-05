-- Add Hugging Face specific columns to models table
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS huggingface_model_id TEXT;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS huggingface_endpoint TEXT;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS huggingface_api_token TEXT;

-- Add engine-specific columns to evaluation_runs
ALTER TABLE public.evaluation_runs ADD COLUMN IF NOT EXISTS engine_type TEXT;
ALTER TABLE public.evaluation_runs ADD COLUMN IF NOT EXISTS metric_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluation_runs ADD COLUMN IF NOT EXISTS explanations JSONB DEFAULT '{}'::jsonb;