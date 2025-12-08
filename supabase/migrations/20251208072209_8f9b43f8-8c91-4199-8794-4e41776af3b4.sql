-- Create enum for entity types
DO $$ BEGIN
  CREATE TYPE kg_entity_type AS ENUM (
    'model', 'dataset', 'feature', 'evaluation', 
    'control', 'risk', 'incident', 'decision', 'deployment', 'outcome'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for relationship types
DO $$ BEGIN
  CREATE TYPE kg_relationship AS ENUM (
    'uses', 'derived_from', 'violates', 'satisfies',
    'monitored_by', 'approved_by', 'feeds_into', 'trains', 
    'evaluated_by', 'governed_by', 'deployed_to', 'triggers'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to kg_nodes for full provenance tracking
ALTER TABLE public.kg_nodes 
ADD COLUMN IF NOT EXISTS hash text,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add new columns to kg_edges for relationship tracking
ALTER TABLE public.kg_edges 
ADD COLUMN IF NOT EXISTS hash text,
ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS evidence jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS valid_from timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS valid_to timestamp with time zone;

-- Create indexes for efficient graph traversal
CREATE INDEX IF NOT EXISTS idx_kg_nodes_entity_type ON public.kg_nodes(entity_type);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_entity_id ON public.kg_nodes(entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_status ON public.kg_nodes(status);
CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON public.kg_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON public.kg_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_relationship ON public.kg_edges(relationship_type);

-- Function to auto-generate hash for nodes
CREATE OR REPLACE FUNCTION public.generate_kg_node_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.hash := encode(sha256((NEW.entity_type || ':' || NEW.entity_id::text || ':' || NEW.version::text || ':' || NEW.label)::bytea), 'hex');
  RETURN NEW;
END;
$$;

-- Function to auto-generate hash for edges
CREATE OR REPLACE FUNCTION public.generate_kg_edge_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.hash := encode(sha256((NEW.source_node_id::text || ':' || NEW.relationship_type || ':' || NEW.target_node_id::text)::bytea), 'hex');
  RETURN NEW;
END;
$$;

-- Create triggers for hash generation
DROP TRIGGER IF EXISTS kg_node_hash_trigger ON public.kg_nodes;
CREATE TRIGGER kg_node_hash_trigger
BEFORE INSERT OR UPDATE ON public.kg_nodes
FOR EACH ROW
EXECUTE FUNCTION public.generate_kg_node_hash();

DROP TRIGGER IF EXISTS kg_edge_hash_trigger ON public.kg_edges;
CREATE TRIGGER kg_edge_hash_trigger
BEFORE INSERT OR UPDATE ON public.kg_edges
FOR EACH ROW
EXECUTE FUNCTION public.generate_kg_edge_hash();

-- Function to auto-sync model creation to KG
CREATE OR REPLACE FUNCTION public.sync_model_to_kg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  node_id uuid;
  system_node_id uuid;
  project_node_id uuid;
BEGIN
  -- Create model node
  INSERT INTO public.kg_nodes (entity_type, entity_id, label, source, properties)
  VALUES ('model', NEW.id, NEW.name, 'auto_sync', jsonb_build_object(
    'model_type', NEW.model_type,
    'version', NEW.version,
    'status', NEW.status,
    'provider', NEW.provider
  ))
  ON CONFLICT DO NOTHING
  RETURNING id INTO node_id;

  -- Get or create system node
  SELECT id INTO system_node_id FROM public.kg_nodes 
  WHERE entity_type = 'deployment' AND entity_id = NEW.system_id;
  
  IF system_node_id IS NULL AND NEW.system_id IS NOT NULL THEN
    INSERT INTO public.kg_nodes (entity_type, entity_id, label, source, properties)
    SELECT 'deployment', s.id, s.name, 'auto_sync', jsonb_build_object(
      'environment', s.deployment_status,
      'provider', s.provider
    )
    FROM public.systems s WHERE s.id = NEW.system_id
    ON CONFLICT DO NOTHING
    RETURNING id INTO system_node_id;
  END IF;

  -- Create edge: model -> deployed_to -> system
  IF node_id IS NOT NULL AND system_node_id IS NOT NULL THEN
    INSERT INTO public.kg_edges (source_node_id, target_node_id, relationship_type, properties)
    VALUES (node_id, system_node_id, 'deployed_to', jsonb_build_object('version', NEW.version))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to auto-sync evaluation runs to KG
CREATE OR REPLACE FUNCTION public.sync_evaluation_to_kg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  eval_node_id uuid;
  model_node_id uuid;
BEGIN
  -- Create evaluation node
  INSERT INTO public.kg_nodes (entity_type, entity_id, label, source, properties)
  VALUES ('evaluation', NEW.id, COALESCE(NEW.engine_type, 'evaluation') || ' run', 'auto_sync', jsonb_build_object(
    'engine_type', NEW.engine_type,
    'status', NEW.status,
    'overall_score', NEW.overall_score
  ))
  ON CONFLICT DO NOTHING
  RETURNING id INTO eval_node_id;

  -- Get model node
  SELECT id INTO model_node_id FROM public.kg_nodes 
  WHERE entity_type = 'model' AND entity_id = NEW.model_id;

  -- Create edge: model -> evaluated_by -> evaluation
  IF eval_node_id IS NOT NULL AND model_node_id IS NOT NULL THEN
    INSERT INTO public.kg_edges (source_node_id, target_node_id, relationship_type, properties)
    VALUES (model_node_id, eval_node_id, 'evaluated_by', jsonb_build_object(
      'score', NEW.overall_score,
      'engine', NEW.engine_type
    ))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to auto-sync risk assessments to KG
CREATE OR REPLACE FUNCTION public.sync_risk_to_kg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  risk_node_id uuid;
  system_node_id uuid;
BEGIN
  -- Create risk node
  INSERT INTO public.kg_nodes (entity_type, entity_id, label, source, properties)
  VALUES ('risk', NEW.id, 'Risk: ' || NEW.risk_tier, 'auto_sync', jsonb_build_object(
    'risk_tier', NEW.risk_tier,
    'uri_score', NEW.uri_score,
    'static_score', NEW.static_risk_score,
    'runtime_score', NEW.runtime_risk_score
  ))
  ON CONFLICT DO NOTHING
  RETURNING id INTO risk_node_id;

  -- Get system node
  SELECT id INTO system_node_id FROM public.kg_nodes 
  WHERE entity_type = 'deployment' AND entity_id = NEW.system_id;

  -- Create edge: system -> monitored_by -> risk
  IF risk_node_id IS NOT NULL AND system_node_id IS NOT NULL THEN
    INSERT INTO public.kg_edges (source_node_id, target_node_id, relationship_type, properties)
    VALUES (system_node_id, risk_node_id, 'monitored_by', jsonb_build_object(
      'tier', NEW.risk_tier,
      'score', NEW.uri_score
    ))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to auto-sync incidents to KG
CREATE OR REPLACE FUNCTION public.sync_incident_to_kg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  incident_node_id uuid;
  model_node_id uuid;
BEGIN
  -- Create incident node
  INSERT INTO public.kg_nodes (entity_type, entity_id, label, source, properties)
  VALUES ('incident', NEW.id, NEW.title, 'auto_sync', jsonb_build_object(
    'severity', NEW.severity,
    'status', NEW.status,
    'incident_type', NEW.incident_type
  ))
  ON CONFLICT DO NOTHING
  RETURNING id INTO incident_node_id;

  -- Get model node if model_id exists
  IF NEW.model_id IS NOT NULL THEN
    SELECT id INTO model_node_id FROM public.kg_nodes 
    WHERE entity_type = 'model' AND entity_id = NEW.model_id;

    -- Create edge: incident -> triggers -> model
    IF incident_node_id IS NOT NULL AND model_node_id IS NOT NULL THEN
      INSERT INTO public.kg_edges (source_node_id, target_node_id, relationship_type, properties)
      VALUES (incident_node_id, model_node_id, 'triggers', jsonb_build_object(
        'severity', NEW.severity
      ))
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to auto-sync approvals/decisions to KG
CREATE OR REPLACE FUNCTION public.sync_approval_to_kg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  decision_node_id uuid;
  system_node_id uuid;
BEGIN
  -- Create decision node
  INSERT INTO public.kg_nodes (entity_type, entity_id, label, source, properties)
  VALUES ('decision', NEW.id, 'Approval: ' || NEW.status, 'auto_sync', jsonb_build_object(
    'status', NEW.status,
    'reason', NEW.reason
  ))
  ON CONFLICT DO NOTHING
  RETURNING id INTO decision_node_id;

  -- Get system node
  SELECT id INTO system_node_id FROM public.kg_nodes 
  WHERE entity_type = 'deployment' AND entity_id = NEW.system_id;

  -- Create edge: system -> approved_by -> decision
  IF decision_node_id IS NOT NULL AND system_node_id IS NOT NULL THEN
    INSERT INTO public.kg_edges (source_node_id, target_node_id, relationship_type, properties)
    VALUES (system_node_id, decision_node_id, 'approved_by', jsonb_build_object(
      'status', NEW.status
    ))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers for auto-sync
DROP TRIGGER IF EXISTS sync_model_kg_trigger ON public.models;
CREATE TRIGGER sync_model_kg_trigger
AFTER INSERT ON public.models
FOR EACH ROW
EXECUTE FUNCTION public.sync_model_to_kg();

DROP TRIGGER IF EXISTS sync_evaluation_kg_trigger ON public.evaluation_runs;
CREATE TRIGGER sync_evaluation_kg_trigger
AFTER INSERT OR UPDATE ON public.evaluation_runs
FOR EACH ROW
EXECUTE FUNCTION public.sync_evaluation_to_kg();

DROP TRIGGER IF EXISTS sync_risk_kg_trigger ON public.risk_assessments;
CREATE TRIGGER sync_risk_kg_trigger
AFTER INSERT OR UPDATE ON public.risk_assessments
FOR EACH ROW
EXECUTE FUNCTION public.sync_risk_to_kg();

DROP TRIGGER IF EXISTS sync_incident_kg_trigger ON public.incidents;
CREATE TRIGGER sync_incident_kg_trigger
AFTER INSERT ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.sync_incident_to_kg();

DROP TRIGGER IF EXISTS sync_approval_kg_trigger ON public.system_approvals;
CREATE TRIGGER sync_approval_kg_trigger
AFTER INSERT OR UPDATE ON public.system_approvals
FOR EACH ROW
EXECUTE FUNCTION public.sync_approval_to_kg();