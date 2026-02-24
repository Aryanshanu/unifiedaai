
-- KG sync trigger for semantic definitions
CREATE OR REPLACE FUNCTION public.sync_semantic_definition_to_kg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  node_id uuid;
BEGIN
  -- Upsert semantic_definition node
  INSERT INTO public.kg_nodes (entity_type, entity_id, label, source, properties, status)
  VALUES (
    'semantic_definition',
    NEW.id::text,
    COALESCE(NEW.display_name, NEW.name),
    'auto_sync',
    jsonb_build_object(
      'name', NEW.name,
      'status', NEW.status,
      'version', NEW.version,
      'grain', NEW.grain,
      'owner_email', NEW.owner_email,
      'query_count', NEW.query_count
    ),
    CASE NEW.status
      WHEN 'active' THEN 'active'
      WHEN 'deprecated' THEN 'archived'
      ELSE 'pending'
    END
  )
  ON CONFLICT (entity_id, entity_type) DO UPDATE
  SET label = EXCLUDED.label,
      properties = EXCLUDED.properties,
      status = EXCLUDED.status,
      version = kg_nodes.version + 1
  RETURNING id INTO node_id;

  -- Create edges for upstream_dependencies (if any)
  IF NEW.upstream_dependencies IS NOT NULL AND jsonb_array_length(NEW.upstream_dependencies) > 0 THEN
    -- For each upstream dependency, try to link to a dataset node
    DECLARE
      dep_name text;
      target_node_id uuid;
    BEGIN
      FOR dep_name IN SELECT jsonb_array_elements_text(NEW.upstream_dependencies)
      LOOP
        -- Find matching dataset node by label
        SELECT id INTO target_node_id
        FROM public.kg_nodes
        WHERE entity_type = 'dataset' AND (label ILIKE dep_name OR entity_id = dep_name)
        LIMIT 1;

        IF target_node_id IS NOT NULL AND node_id IS NOT NULL THEN
          INSERT INTO public.kg_edges (source_node_id, target_node_id, relationship_type, properties)
          VALUES (node_id, target_node_id, 'depends_on', jsonb_build_object('dependency', dep_name))
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_sync_semantic_definition_to_kg ON public.semantic_definitions;
CREATE TRIGGER trg_sync_semantic_definition_to_kg
  AFTER INSERT OR UPDATE ON public.semantic_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_semantic_definition_to_kg();

-- Enable realtime for semantic_drift_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.semantic_drift_alerts;
