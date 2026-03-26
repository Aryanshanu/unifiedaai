ALTER TABLE public.dq_incidents 
  ADD COLUMN IF NOT EXISTS rule_name TEXT,
  ADD COLUMN IF NOT EXISTS column_name TEXT,
  ADD COLUMN IF NOT EXISTS affected_records_count INTEGER,
  ADD COLUMN IF NOT EXISTS affected_records_percentage NUMERIC;