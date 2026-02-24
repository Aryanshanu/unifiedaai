
-- Part 1: New tables

-- Semantic Definition Versions (immutable version history)
CREATE TABLE public.semantic_definition_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.semantic_definitions(id) ON DELETE CASCADE,
  version integer NOT NULL,
  definition_yaml text NOT NULL,
  definition_hash text,
  change_summary text,
  promoted_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Semantic Query Log
CREATE TABLE public.semantic_query_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid REFERENCES public.semantic_definitions(id) ON DELETE SET NULL,
  metric_name text NOT NULL,
  consumer_type text NOT NULL DEFAULT 'manual',
  query_latency_ms integer,
  row_count integer,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  queried_by uuid,
  queried_at timestamptz NOT NULL DEFAULT now()
);

-- Semantic Drift Alerts
CREATE TABLE public.semantic_drift_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.semantic_definitions(id) ON DELETE CASCADE,
  drift_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Part 2: Alter existing semantic_definitions
ALTER TABLE public.semantic_definitions
  ADD COLUMN IF NOT EXISTS upstream_dependencies jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS test_suite jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deployment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_queried_at timestamptz,
  ADD COLUMN IF NOT EXISTS query_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Part 3: RLS policies

ALTER TABLE public.semantic_definition_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_drift_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read versions" ON public.semantic_definition_versions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert versions" ON public.semantic_definition_versions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read query log" ON public.semantic_query_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert query log" ON public.semantic_query_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read drift alerts" ON public.semantic_drift_alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert drift alerts" ON public.semantic_drift_alerts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update drift alerts" ON public.semantic_drift_alerts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Service role policies for edge functions
CREATE POLICY "Service role full access versions" ON public.semantic_definition_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access query log" ON public.semantic_query_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access drift alerts" ON public.semantic_drift_alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Part 4: Triggers

-- Auto-snapshot version when definition_yaml changes
CREATE OR REPLACE FUNCTION public.snapshot_semantic_definition_version()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.definition_yaml IS DISTINCT FROM NEW.definition_yaml THEN
    NEW.version := OLD.version + 1;
    INSERT INTO public.semantic_definition_versions (
      definition_id, version, definition_yaml, definition_hash, change_summary, created_by
    ) VALUES (
      NEW.id, NEW.version, NEW.definition_yaml,
      encode(sha256(NEW.definition_yaml::bytea), 'hex'),
      'YAML updated',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_semantic_version
  BEFORE UPDATE ON public.semantic_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_semantic_definition_version();

-- Compute hash on version insert
CREATE OR REPLACE FUNCTION public.compute_version_hash()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.definition_hash := encode(sha256(NEW.definition_yaml::bytea), 'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_version_hash
  BEFORE INSERT ON public.semantic_definition_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_version_hash();

-- Match semantic definitions by embedding (for semantic search)
CREATE OR REPLACE FUNCTION public.match_semantic_definitions(
  query_embedding vector(768),
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  name text,
  display_name text,
  description text,
  sql_logic text,
  grain text,
  synonyms text[],
  ai_context text,
  status text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sd.id,
    sd.name,
    sd.display_name,
    sd.description,
    sd.sql_logic,
    sd.grain,
    sd.synonyms,
    sd.ai_context,
    sd.status,
    1 - (sd.embedding <=> query_embedding) as similarity
  FROM semantic_definitions sd
  WHERE sd.embedding IS NOT NULL
    AND sd.status = 'active'
    AND 1 - (sd.embedding <=> query_embedding) > match_threshold
  ORDER BY sd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
