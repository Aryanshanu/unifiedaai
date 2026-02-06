-- Phase 1: Add freshness tracking to datasets
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS last_data_update TIMESTAMPTZ;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS staleness_status TEXT DEFAULT 'fresh';

-- Phase 2: Dataset anomalies table
CREATE TABLE IF NOT EXISTS dataset_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('outlier', 'distribution_shift', 'null_spike', 'pattern_break', 'schema_change')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  detected_value JSONB,
  expected_range JSONB,
  description TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: Data transformations lineage table
CREATE TABLE IF NOT EXISTS data_transformations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
  target_dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
  transformation_type TEXT NOT NULL CHECK (transformation_type IN ('filter', 'aggregate', 'join', 'derive', 'clean', 'sample', 'normalize', 'encode')),
  transformation_name TEXT,
  transformation_logic TEXT,
  columns_affected TEXT[],
  row_count_before INTEGER,
  row_count_after INTEGER,
  quality_score_before NUMERIC,
  quality_score_after NUMERIC,
  executed_at TIMESTAMPTZ DEFAULT now(),
  executed_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 4: Data drift alerts table
CREATE TABLE IF NOT EXISTS data_drift_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  drift_type TEXT NOT NULL CHECK (drift_type IN ('psi', 'kl_divergence', 'mean_shift', 'variance_shift', 'distribution_change')),
  baseline_profile_id UUID,
  current_profile_id UUID,
  baseline_value JSONB,
  current_value JSONB,
  drift_value NUMERIC,
  threshold NUMERIC DEFAULT 0.25,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  incident_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE dataset_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_drift_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for dataset_anomalies
CREATE POLICY "Users can view dataset anomalies" ON dataset_anomalies
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert anomalies" ON dataset_anomalies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update anomalies" ON dataset_anomalies
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS policies for data_transformations
CREATE POLICY "Users can view transformations" ON data_transformations
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert transformations" ON data_transformations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update transformations" ON data_transformations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS policies for data_drift_alerts
CREATE POLICY "Users can view drift alerts" ON data_drift_alerts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert drift alerts" ON data_drift_alerts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update drift alerts" ON data_drift_alerts
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dataset_anomalies_dataset_id ON dataset_anomalies(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_anomalies_status ON dataset_anomalies(status);
CREATE INDEX IF NOT EXISTS idx_data_transformations_source ON data_transformations(source_dataset_id);
CREATE INDEX IF NOT EXISTS idx_data_transformations_target ON data_transformations(target_dataset_id);
CREATE INDEX IF NOT EXISTS idx_data_drift_alerts_dataset_id ON data_drift_alerts(dataset_id);
CREATE INDEX IF NOT EXISTS idx_data_drift_alerts_status ON data_drift_alerts(status);

-- Function to auto-update staleness status
CREATE OR REPLACE FUNCTION update_dataset_staleness()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_data_update IS NOT NULL AND NEW.freshness_threshold_days IS NOT NULL THEN
    IF NEW.last_data_update < now() - (NEW.freshness_threshold_days || ' days')::interval THEN
      NEW.staleness_status := 'stale';
    ELSIF NEW.last_data_update < now() - ((NEW.freshness_threshold_days * 0.5) || ' days')::interval THEN
      NEW.staleness_status := 'warning';
    ELSE
      NEW.staleness_status := 'fresh';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for staleness auto-update
DROP TRIGGER IF EXISTS trigger_update_staleness ON datasets;
CREATE TRIGGER trigger_update_staleness
  BEFORE INSERT OR UPDATE OF last_data_update, freshness_threshold_days
  ON datasets
  FOR EACH ROW
  EXECUTE FUNCTION update_dataset_staleness();

-- Sync data transformations to knowledge graph
CREATE OR REPLACE FUNCTION sync_transformation_to_kg()
RETURNS TRIGGER AS $$
DECLARE
  source_node_id UUID;
  target_node_id UUID;
BEGIN
  -- Get source dataset node
  SELECT id INTO source_node_id FROM kg_nodes 
  WHERE entity_type = 'dataset' AND entity_id = NEW.source_dataset_id::text;
  
  -- Get target dataset node  
  SELECT id INTO target_node_id FROM kg_nodes
  WHERE entity_type = 'dataset' AND entity_id = NEW.target_dataset_id::text;
  
  -- Create edge if both nodes exist
  IF source_node_id IS NOT NULL AND target_node_id IS NOT NULL THEN
    INSERT INTO kg_edges (source_node_id, target_node_id, relationship_type, properties)
    VALUES (
      target_node_id, 
      source_node_id, 
      'derived_from', 
      jsonb_build_object(
        'transformation_type', NEW.transformation_type,
        'transformation_id', NEW.id,
        'executed_at', NEW.executed_at
      )
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_transformation_to_kg ON data_transformations;
CREATE TRIGGER trigger_sync_transformation_to_kg
  AFTER INSERT ON data_transformations
  FOR EACH ROW
  EXECUTE FUNCTION sync_transformation_to_kg();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE dataset_anomalies;
ALTER PUBLICATION supabase_realtime ADD TABLE data_drift_alerts;