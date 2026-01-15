-- ============================================
-- DATA QUALITY CONTROL PLANE SCHEMA
-- 5-Step Deterministic Pipeline Tables
-- ============================================

-- Task 1: Data Profiling Results
CREATE TABLE public.dq_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  dataset_version TEXT,
  row_count INTEGER NOT NULL,
  column_profiles JSONB NOT NULL DEFAULT '{}',
  profile_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  execution_time_ms INTEGER,
  record_hash TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task 2: Auto-Calibrated Rules
CREATE TABLE public.dq_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES dq_profiles(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  dimension TEXT NOT NULL CHECK (dimension IN ('completeness', 'validity', 'accuracy', 'uniqueness', 'timeliness', 'consistency')),
  rule_name TEXT NOT NULL,
  logic_type TEXT NOT NULL,
  logic_code TEXT NOT NULL,
  column_name TEXT,
  threshold NUMERIC(5,4) NOT NULL CHECK (threshold >= 0 AND threshold <= 1),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  confidence NUMERIC(5,4) CHECK (confidence >= 0 AND confidence <= 1),
  business_impact TEXT,
  is_active BOOLEAN DEFAULT true,
  calibration_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Task 3: Rule Execution Results
CREATE TABLE public.dq_rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES dq_profiles(id) ON DELETE SET NULL,
  rules_version INTEGER NOT NULL,
  execution_mode TEXT NOT NULL CHECK (execution_mode IN ('FULL', 'INCREMENTAL')),
  metrics JSONB NOT NULL DEFAULT '[]',
  summary JSONB NOT NULL DEFAULT '{}',
  circuit_breaker_tripped BOOLEAN DEFAULT false,
  execution_ts TIMESTAMPTZ DEFAULT now(),
  execution_time_ms INTEGER,
  record_hash TEXT,
  previous_hash TEXT,
  created_by UUID
);

-- Task 4: Dashboard SQL Assets
CREATE TABLE public.dq_dashboard_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES dq_rule_executions(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  summary_sql TEXT NOT NULL,
  hotspots_sql TEXT NOT NULL,
  dimension_breakdown_sql TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- Task 5: DQ Incidents (with deduplication)
CREATE TABLE public.dq_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES dq_rules(id) ON DELETE SET NULL,
  execution_id UUID REFERENCES dq_rule_executions(id) ON DELETE SET NULL,
  dimension TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('P0', 'P1', 'P2')),
  action TEXT NOT NULL,
  example_failed_rows JSONB,
  profiling_reference UUID REFERENCES dq_profiles(id) ON DELETE SET NULL,
  failure_signature TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  UNIQUE (dataset_id, rule_id, failure_signature)
);

-- Enable RLS on all tables
ALTER TABLE public.dq_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dq_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dq_rule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dq_dashboard_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dq_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dq_profiles
CREATE POLICY "Authenticated users can view dq_profiles"
  ON public.dq_profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert dq_profiles"
  ON public.dq_profiles FOR INSERT
  TO authenticated WITH CHECK (true);

-- RLS Policies for dq_rules
CREATE POLICY "Authenticated users can view dq_rules"
  ON public.dq_rules FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert dq_rules"
  ON public.dq_rules FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update dq_rules"
  ON public.dq_rules FOR UPDATE
  TO authenticated USING (true);

-- RLS Policies for dq_rule_executions
CREATE POLICY "Authenticated users can view dq_rule_executions"
  ON public.dq_rule_executions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert dq_rule_executions"
  ON public.dq_rule_executions FOR INSERT
  TO authenticated WITH CHECK (true);

-- RLS Policies for dq_dashboard_assets
CREATE POLICY "Authenticated users can view dq_dashboard_assets"
  ON public.dq_dashboard_assets FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert dq_dashboard_assets"
  ON public.dq_dashboard_assets FOR INSERT
  TO authenticated WITH CHECK (true);

-- RLS Policies for dq_incidents
CREATE POLICY "Authenticated users can view dq_incidents"
  ON public.dq_incidents FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert dq_incidents"
  ON public.dq_incidents FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update dq_incidents"
  ON public.dq_incidents FOR UPDATE
  TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX idx_dq_profiles_dataset_id ON public.dq_profiles(dataset_id);
CREATE INDEX idx_dq_rules_dataset_id ON public.dq_rules(dataset_id);
CREATE INDEX idx_dq_rules_profile_id ON public.dq_rules(profile_id);
CREATE INDEX idx_dq_rule_executions_dataset_id ON public.dq_rule_executions(dataset_id);
CREATE INDEX idx_dq_dashboard_assets_execution_id ON public.dq_dashboard_assets(execution_id);
CREATE INDEX idx_dq_incidents_dataset_id ON public.dq_incidents(dataset_id);
CREATE INDEX idx_dq_incidents_status ON public.dq_incidents(status);

-- Hash chain trigger for audit trail
CREATE OR REPLACE FUNCTION public.compute_dq_execution_hash()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash TEXT;
BEGIN
  SELECT record_hash INTO prev_hash
  FROM public.dq_rule_executions
  WHERE dataset_id = NEW.dataset_id
  ORDER BY execution_ts DESC
  LIMIT 1;
  
  NEW.previous_hash := prev_hash;
  NEW.record_hash := encode(
    sha256(
      (COALESCE(prev_hash, '') || NEW.id::text || NEW.dataset_id::text || NEW.execution_ts::text || NEW.metrics::text)::bytea
    ),
    'hex'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_dq_execution_hash
BEFORE INSERT ON public.dq_rule_executions
FOR EACH ROW
EXECUTE FUNCTION public.compute_dq_execution_hash();

-- Enable realtime for live pipeline updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.dq_rule_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dq_incidents;