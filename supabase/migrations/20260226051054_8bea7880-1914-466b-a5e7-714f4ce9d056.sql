
-- Feature Registry table
CREATE TABLE public.feature_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  data_type TEXT NOT NULL DEFAULT 'numeric',
  grain TEXT NOT NULL DEFAULT 'entity',
  source_system TEXT,
  computation_sql TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  owner TEXT,
  refresh_cadence TEXT DEFAULT 'daily',
  quality_score NUMERIC,
  definition_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Feature Values table
CREATE TABLE public.feature_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES public.feature_registry(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  value JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  source_hash TEXT
);

-- Indexes
CREATE INDEX idx_feature_values_feature_id ON public.feature_values(feature_id);
CREATE INDEX idx_feature_values_entity_id ON public.feature_values(entity_id);
CREATE INDEX idx_feature_registry_status ON public.feature_registry(status);
CREATE INDEX idx_feature_registry_name ON public.feature_registry(name);

-- Auto-compute definition_hash
CREATE OR REPLACE FUNCTION public.compute_feature_definition_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.definition_hash := encode(sha256(COALESCE(NEW.computation_sql, '')::bytea), 'hex');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_feature_hash
  BEFORE INSERT OR UPDATE ON public.feature_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_feature_definition_hash();

-- RLS
ALTER TABLE public.feature_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_values ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all features
CREATE POLICY "Authenticated users can read feature_registry"
  ON public.feature_registry FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage own features"
  ON public.feature_registry FOR ALL
  TO authenticated USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Service role full access feature_registry"
  ON public.feature_registry FOR ALL
  TO service_role USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read feature_values"
  ON public.feature_values FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage feature_values"
  ON public.feature_values FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.feature_registry fr WHERE fr.id = feature_id AND fr.created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.feature_registry fr WHERE fr.id = feature_id AND fr.created_by = auth.uid())
  );

CREATE POLICY "Service role full access feature_values"
  ON public.feature_values FOR ALL
  TO service_role USING (true)
  WITH CHECK (true);
