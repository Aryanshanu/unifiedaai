-- Link bronze_data rows to a dataset for dataset-scoped profiling/execution
ALTER TABLE public.bronze_data
ADD COLUMN IF NOT EXISTS dataset_id uuid;

-- Performance index for dataset-scoped reads
CREATE INDEX IF NOT EXISTS idx_bronze_data_dataset_id
ON public.bronze_data (dataset_id);

COMMENT ON COLUMN public.bronze_data.dataset_id
IS 'Owning dataset (public.datasets.id) for dataset-scoped DQ profiling/execution.';