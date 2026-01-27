-- Phase 2: Data Sources table for ingestion management
CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('database', 'file', 's3', 'gcs', 'api', 'manual')),
  connection_config JSONB DEFAULT '{}',
  auth_type TEXT CHECK (auth_type IN ('none', 'api_key', 'oauth', 'basic')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'syncing')),
  last_sync_at TIMESTAMPTZ,
  row_count BIGINT DEFAULT 0,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies for data_sources
CREATE POLICY "Users can view their own data sources"
  ON public.data_sources FOR SELECT
  USING (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can create data sources"
  ON public.data_sources FOR INSERT
  WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can update their own data sources"
  ON public.data_sources FOR UPDATE
  USING (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can delete their own data sources"
  ON public.data_sources FOR DELETE
  USING (auth.uid() = owner_id OR owner_id IS NULL);

-- Phase 3: Dataset AI Approval fields
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS ai_approval_status TEXT DEFAULT 'draft' 
  CHECK (ai_approval_status IN ('draft', 'pending', 'approved', 'rejected'));
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS ai_approved_at TIMESTAMPTZ;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS ai_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0';
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES data_sources(id);

-- Phase 4: Model traceability fields
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS training_dataset_id UUID REFERENCES datasets(id);
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS limitations TEXT;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS intended_use TEXT;

-- Phase 5: Risk classification fields
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS risk_classification TEXT 
  CHECK (risk_classification IN ('minimal', 'limited', 'high', 'unacceptable'));
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS risk_classification_reason TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_data_sources_owner ON public.data_sources(owner_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_status ON public.data_sources(status);
CREATE INDEX IF NOT EXISTS idx_datasets_ai_approval ON public.datasets(ai_approval_status);
CREATE INDEX IF NOT EXISTS idx_models_training_dataset ON public.models(training_dataset_id);
CREATE INDEX IF NOT EXISTS idx_models_risk_classification ON public.models(risk_classification);