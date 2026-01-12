-- =====================================================
-- DATA QUALITY ENGINE UPGRADE: Trust Engine Migration
-- =====================================================

-- 1. Add contract linking and gatekeeper status to data_uploads
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS 
  contract_id UUID REFERENCES data_contracts(id);

ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS 
  contract_check_status TEXT DEFAULT 'skipped';
  -- Values: skipped, pending, passed, failed

ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS 
  contract_violations JSONB;

-- 2. Create processing queue for async pipeline
CREATE TABLE IF NOT EXISTS processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES data_uploads(id) NOT NULL,
  stage TEXT NOT NULL, -- 'profile', 'analyze', 'semantic', 'summarize'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime for processing queue
ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;

-- 3. Create weight profiles for dynamic scoring
CREATE TABLE IF NOT EXISTS weight_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  weights JSONB NOT NULL, -- {completeness: 0.25, validity: 0.30, ...}
  column_importance JSONB, -- {email: 0.9, notes: 0.3, ...}
  use_case TEXT, -- 'mailing_list', 'analytics', 'ml_training', 'general'
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default weight profiles
INSERT INTO weight_profiles (name, description, weights, use_case, is_default) VALUES
('Default', 'Balanced weights for general-purpose data quality', 
 '{"completeness":0.25,"validity":0.30,"uniqueness":0.20,"freshness":0.25}'::jsonb, 
 'general', true),
('Mailing List', 'Emphasizes email validity and uniqueness', 
 '{"completeness":0.20,"validity":0.45,"uniqueness":0.30,"freshness":0.05}'::jsonb, 
 'mailing_list', false),
('ML Training', 'Emphasizes completeness and uniqueness for model training', 
 '{"completeness":0.35,"validity":0.25,"uniqueness":0.30,"freshness":0.10}'::jsonb, 
 'ml_training', false),
('Analytics', 'Emphasizes freshness for reporting data', 
 '{"completeness":0.25,"validity":0.25,"uniqueness":0.15,"freshness":0.35}'::jsonb, 
 'analytics', false),
('Compliance', 'Emphasizes validity for regulatory requirements', 
 '{"completeness":0.30,"validity":0.40,"uniqueness":0.15,"freshness":0.15}'::jsonb, 
 'compliance', false)
ON CONFLICT DO NOTHING;

-- 4. Create remediation actions for one-click fixes
CREATE TABLE IF NOT EXISTS remediation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES data_uploads(id) NOT NULL,
  issue_id UUID REFERENCES quality_issues(id),
  action_type TEXT NOT NULL, 
  -- Types: DELETE_ROWS, IMPUTE_MEAN, IMPUTE_MODE, NORMALIZE_FORMAT, 
  --        DEDUPLICATE, TRIM_WHITESPACE, FIX_ENCODING, CAST_TYPE
  description TEXT,
  sql_preview TEXT,
  python_script TEXT,
  affected_rows INT,
  affected_columns TEXT[],
  safety_score INT CHECK (safety_score >= 0 AND safety_score <= 100),
  reversible BOOLEAN DEFAULT true,
  estimated_impact JSONB, -- {before_score: 65, after_score: 82}
  status TEXT DEFAULT 'pending', -- pending, approved, executed, failed, reverted
  executed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES auth.users(id),
  execution_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Medallion Architecture: Bronze layer (immutable raw data)
CREATE TABLE IF NOT EXISTS bronze_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES data_uploads(id) NOT NULL,
  row_index INT NOT NULL,
  raw_data JSONB NOT NULL, -- Original row exactly as uploaded
  record_hash TEXT, -- SHA-256 of row for dedup detection
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bronze_upload ON bronze_data(upload_id);
CREATE INDEX IF NOT EXISTS idx_bronze_hash ON bronze_data(record_hash);

-- 6. Medallion Architecture: Silver layer (cleaned data)
CREATE TABLE IF NOT EXISTS silver_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bronze_id UUID REFERENCES bronze_data(id) NOT NULL,
  upload_id UUID REFERENCES data_uploads(id) NOT NULL,
  clean_data JSONB NOT NULL, -- After type casting, null handling
  transformations_applied TEXT[], -- ['trim_whitespace', 'cast_age_to_int']
  remediation_ids UUID[], -- Which remediation actions were applied
  validation_passed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_silver_upload ON silver_data(upload_id);

-- 7. Medallion Architecture: Gold layer (aggregated metrics over time)
CREATE TABLE IF NOT EXISTS gold_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES data_uploads(id),
  user_id UUID REFERENCES auth.users(id),
  metric_date DATE NOT NULL,
  completeness_score NUMERIC(5,4),
  validity_score NUMERIC(5,4),
  uniqueness_score NUMERIC(5,4),
  freshness_score NUMERIC(5,4),
  bias_score NUMERIC(5,4), -- New metric: distribution skew detection
  overall_score NUMERIC(5,4),
  trust_grade CHAR(1), -- A, B, C, D, F
  issue_count INT DEFAULT 0,
  remediation_count INT DEFAULT 0,
  files_processed INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gold_metrics_date ON gold_quality_metrics(user_id, metric_date);

-- 8. Test scenarios for golden dataset validation
CREATE TABLE IF NOT EXISTS test_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'format', 'completeness', 'uniqueness', 'semantic', 'integration'
  input_payload JSONB NOT NULL, -- The test data
  expected_score_min INT NOT NULL CHECK (expected_score_min >= 0 AND expected_score_min <= 100),
  expected_score_max INT NOT NULL CHECK (expected_score_max >= 0 AND expected_score_max <= 100),
  expected_issues TEXT[], -- Issue types that MUST be detected
  forbidden_issues TEXT[], -- Issue types that should NOT appear
  is_active BOOLEAN DEFAULT true,
  difficulty TEXT DEFAULT 'medium', -- easy, medium, hard, expert
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_score_range CHECK (expected_score_max >= expected_score_min)
);

-- 9. Test run results
CREATE TABLE IF NOT EXISTS test_run_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES test_scenarios(id) NOT NULL,
  actual_score INT,
  detected_issues TEXT[],
  passed BOOLEAN NOT NULL,
  failure_reasons TEXT[],
  execution_time_ms INT,
  run_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert sample test scenarios (the complex dataset from PDR)
INSERT INTO test_scenarios (name, description, category, input_payload, expected_score_min, expected_score_max, expected_issues, difficulty) VALUES
('Dirty Customer Data', 
 'Complex errors including invalid TLD, stale dates, duplicates, type mismatches, and outliers', 
 'integration',
 '[
   {"id":"USR-001","name":"Alice Chen","email":"alice@enterprise.com","role":"Admin","last_login":"2025-01-10T08:30:00Z","risk_score":0.1,"notes":"Valid record"},
   {"id":"USR-002","name":"Bob Smith","email":"bob.smith@gmail.c","role":"User","last_login":"2023-01-01T00:00:00Z","risk_score":99.0,"notes":"Fail: Invalid TLD + Stale Date + Outlier"},
   {"id":"USR-003","name":"Charlie","email":"charlie@enterprise.com","role":"SuperAdmin","last_login":"2026-02-20T10:00:00Z","risk_score":0.5,"notes":"Fail: Future Date"},
   {"id":"USR-001","name":"Alice Chen (Duplicate)","email":"alice@enterprise.com","role":"Admin","last_login":"2025-01-10T08:30:00Z","risk_score":0.1,"notes":"Fail: Duplicate ID"},
   {"id":"USR-005","name":null,"email":"dave@company.io","role":"Guest","last_login":"2025-01-12","risk_score":"High","notes":"Fail: Type Mismatch + Null Name"}
 ]'::jsonb,
 30, 65,
 ARRAY['format_violation', 'duplicate_id', 'type_mismatch', 'null_value', 'stale_data'],
 'hard')
ON CONFLICT DO NOTHING;

-- 10. RLS Policies
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bronze_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE silver_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_run_results ENABLE ROW LEVEL SECURITY;

-- Processing Queue policies
CREATE POLICY "Users can view their processing queue" ON processing_queue
  FOR SELECT USING (
    upload_id IN (SELECT id FROM data_uploads WHERE user_id = auth.uid())
  );

-- Weight Profiles policies (everyone can read defaults, owners can manage theirs)
CREATE POLICY "Everyone can read weight profiles" ON weight_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own profiles" ON weight_profiles
  FOR INSERT WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can update their own profiles" ON weight_profiles
  FOR UPDATE USING (auth.uid() = created_by);

-- Remediation Actions policies
CREATE POLICY "Users can view their remediation actions" ON remediation_actions
  FOR SELECT USING (
    upload_id IN (SELECT id FROM data_uploads WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage their remediation actions" ON remediation_actions
  FOR ALL USING (
    upload_id IN (SELECT id FROM data_uploads WHERE user_id = auth.uid())
  );

-- Bronze/Silver Data policies
CREATE POLICY "Users can view their bronze data" ON bronze_data
  FOR SELECT USING (
    upload_id IN (SELECT id FROM data_uploads WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their silver data" ON silver_data
  FOR SELECT USING (
    upload_id IN (SELECT id FROM data_uploads WHERE user_id = auth.uid())
  );

-- Gold Metrics policies
CREATE POLICY "Users can view their gold metrics" ON gold_quality_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert gold metrics" ON gold_quality_metrics
  FOR INSERT WITH CHECK (true);

-- Test Scenarios policies (public read, authenticated create)
CREATE POLICY "Everyone can view active test scenarios" ON test_scenarios
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create scenarios" ON test_scenarios
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Test Run Results policies
CREATE POLICY "Users can view their test runs" ON test_run_results
  FOR SELECT USING (auth.uid() = run_by);

CREATE POLICY "Authenticated users can create test runs" ON test_run_results
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);