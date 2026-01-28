-- Stage 1: Enhanced data ingestion
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS schema_hash TEXT;
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS malware_scanned BOOLEAN DEFAULT false;

-- Stage 2: CDE and business impact (safely add columns if not exists)
ALTER TABLE dq_rules ADD COLUMN IF NOT EXISTS is_critical_element BOOLEAN DEFAULT false;
ALTER TABLE dq_rules ADD COLUMN IF NOT EXISTS business_impact TEXT;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS freshness_threshold_days INTEGER DEFAULT 30;

-- Stage 3: Lineage tracking table
CREATE TABLE IF NOT EXISTS data_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
  target_dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
  transformation_type TEXT NOT NULL,
  transformation_details JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stage 3: Bias reports persistence table
CREATE TABLE IF NOT EXISTS dataset_bias_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  overall_bias_score NUMERIC CHECK (overall_bias_score >= 0 AND overall_bias_score <= 100),
  demographic_skew JSONB DEFAULT '[]'::jsonb,
  class_imbalance JSONB DEFAULT '[]'::jsonb,
  missing_patterns JSONB DEFAULT '[]'::jsonb,
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  scan_timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stage 3: Dataset snapshots for versioning
CREATE TABLE IF NOT EXISTS dataset_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  quality_score NUMERIC,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_lineage_source ON data_lineage(source_dataset_id);
CREATE INDEX IF NOT EXISTS idx_data_lineage_target ON data_lineage(target_dataset_id);
CREATE INDEX IF NOT EXISTS idx_bias_reports_dataset ON dataset_bias_reports(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_snapshots_dataset ON dataset_snapshots(dataset_id);

-- Enable RLS on new tables
ALTER TABLE data_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_bias_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for data_lineage
CREATE POLICY "Allow authenticated read on data_lineage" ON data_lineage FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert on data_lineage" ON data_lineage FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow creator update on data_lineage" ON data_lineage FOR UPDATE USING (auth.uid() = created_by);

-- RLS policies for dataset_bias_reports
CREATE POLICY "Allow authenticated read on dataset_bias_reports" ON dataset_bias_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert on dataset_bias_reports" ON dataset_bias_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS policies for dataset_snapshots
CREATE POLICY "Allow authenticated read on dataset_snapshots" ON dataset_snapshots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert on dataset_snapshots" ON dataset_snapshots FOR INSERT WITH CHECK (auth.role() = 'authenticated');