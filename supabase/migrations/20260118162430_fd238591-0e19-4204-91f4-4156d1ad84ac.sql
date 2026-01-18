-- Step 1: Add ingested_row_count column to datasets table
ALTER TABLE public.datasets 
ADD COLUMN IF NOT EXISTS ingested_row_count integer NOT NULL DEFAULT 0;

-- Step 2: Rename bronze_data to dq_data
ALTER TABLE public.bronze_data RENAME TO dq_data;

-- Step 3: Create a compatibility view so any missed references don't break
CREATE OR REPLACE VIEW public.bronze_data AS SELECT * FROM public.dq_data;

-- Step 4: Update ingested_row_count for any existing datasets based on actual dq_data rows
UPDATE public.datasets d
SET ingested_row_count = (
  SELECT COUNT(*) FROM public.dq_data dd WHERE dd.dataset_id = d.id
);

-- Step 5: Add index for faster lookups on dataset_id in dq_data
CREATE INDEX IF NOT EXISTS idx_dq_data_dataset_id ON public.dq_data(dataset_id);