-- =====================================================
-- PHASE 1: DATA QUALITY GOVERNANCE SCHEMA
-- Fractal Unified Governance OS - Data Layer
-- =====================================================

-- 1. Dataset Quality Runs (governance-grade DQ evaluations)
CREATE TABLE public.dataset_quality_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL CHECK (run_type IN ('scheduled', 'on_demand', 'pre_training', 'contract_check')),
  completeness_score NUMERIC(5,4) CHECK (completeness_score >= 0 AND completeness_score <= 1),
  validity_score NUMERIC(5,4) CHECK (validity_score >= 0 AND validity_score <= 1),
  uniqueness_score NUMERIC(5,4) CHECK (uniqueness_score >= 0 AND uniqueness_score <= 1),
  freshness_score NUMERIC(5,4) CHECK (freshness_score >= 0 AND freshness_score <= 1),
  distribution_skew JSONB DEFAULT '{}',
  sensitive_attribute_balance JSONB DEFAULT '{}',
  overall_score NUMERIC(5,4) CHECK (overall_score >= 0 AND overall_score <= 1),
  verdict TEXT NOT NULL CHECK (verdict IN ('PASS', 'FAIL', 'WARN')),
  metric_details JSONB DEFAULT '{}',
  evidence_hash TEXT,
  previous_hash TEXT,
  record_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Data Contracts (expectations as law)
CREATE TABLE public.data_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  schema_expectations JSONB NOT NULL DEFAULT '{}',
  freshness_sla_hours INTEGER,
  quality_thresholds JSONB DEFAULT '{"completeness": 0.95, "validity": 0.99, "uniqueness": 0.95}',
  distribution_expectations JSONB DEFAULT '{}',
  pii_guarantees JSONB DEFAULT '{"allowed_pii": [], "redaction_required": false}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'violated', 'draft')),
  enforcement_mode TEXT NOT NULL DEFAULT 'warn' CHECK (enforcement_mode IN ('warn', 'block', 'audit_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(dataset_id, version)
);

-- 3. Data Contract Violations (automatic incident creation)
CREATE TABLE public.data_contract_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.data_contracts(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  quality_run_id UUID REFERENCES public.dataset_quality_runs(id),
  violation_type TEXT NOT NULL CHECK (violation_type IN ('schema', 'freshness', 'quality', 'distribution', 'pii', 'custom')),
  violation_details JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  auto_actions_taken JSONB DEFAULT '{}',
  impacted_models UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Data Drift Events (schema + statistical drift)
CREATE TABLE public.data_drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  drift_type TEXT NOT NULL CHECK (drift_type IN ('schema', 'statistical', 'distribution', 'volume')),
  feature TEXT NOT NULL,
  baseline_value JSONB NOT NULL,
  current_value JSONB NOT NULL,
  drift_metric TEXT NOT NULL,
  drift_score NUMERIC(7,6) CHECK (drift_score >= 0),
  threshold NUMERIC(7,6),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  impacted_models UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

-- 5. Dataset Lineage Edges (hash-based versioning)
CREATE TABLE public.dataset_lineage_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  target_entity_type TEXT NOT NULL CHECK (target_entity_type IN ('feature', 'model', 'decision', 'dataset', 'system')),
  target_entity_id UUID NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('feeds', 'derives', 'trains', 'validates', 'transforms')),
  version INTEGER NOT NULL DEFAULT 1,
  dataset_hash TEXT NOT NULL,
  transformation_hash TEXT,
  properties JSONB DEFAULT '{}',
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_dataset_quality_runs_dataset ON public.dataset_quality_runs(dataset_id);
CREATE INDEX idx_dataset_quality_runs_verdict ON public.dataset_quality_runs(verdict);
CREATE INDEX idx_dataset_quality_runs_created ON public.dataset_quality_runs(created_at DESC);

CREATE INDEX idx_data_contracts_dataset ON public.data_contracts(dataset_id);
CREATE INDEX idx_data_contracts_status ON public.data_contracts(status);

CREATE INDEX idx_data_contract_violations_contract ON public.data_contract_violations(contract_id);
CREATE INDEX idx_data_contract_violations_dataset ON public.data_contract_violations(dataset_id);
CREATE INDEX idx_data_contract_violations_severity ON public.data_contract_violations(severity);
CREATE INDEX idx_data_contract_violations_status ON public.data_contract_violations(status);

CREATE INDEX idx_data_drift_events_dataset ON public.data_drift_events(dataset_id);
CREATE INDEX idx_data_drift_events_severity ON public.data_drift_events(severity);
CREATE INDEX idx_data_drift_events_status ON public.data_drift_events(status);
CREATE INDEX idx_data_drift_events_detected ON public.data_drift_events(detected_at DESC);

CREATE INDEX idx_dataset_lineage_source ON public.dataset_lineage_edges(source_dataset_id);
CREATE INDEX idx_dataset_lineage_target ON public.dataset_lineage_edges(target_entity_type, target_entity_id);
CREATE INDEX idx_dataset_lineage_valid ON public.dataset_lineage_edges(valid_from, valid_to);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.dataset_quality_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_contract_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_drift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_lineage_edges ENABLE ROW LEVEL SECURITY;

-- Dataset Quality Runs Policies
CREATE POLICY "Authenticated users can view quality runs"
  ON public.dataset_quality_runs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create quality runs"
  ON public.dataset_quality_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- Data Contracts Policies
CREATE POLICY "Authenticated users can view contracts"
  ON public.data_contracts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create contracts"
  ON public.data_contracts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Contract creators can update their contracts"
  ON public.data_contracts FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Data Contract Violations Policies
CREATE POLICY "Authenticated users can view violations"
  ON public.data_contract_violations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create violations"
  ON public.data_contract_violations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update violations"
  ON public.data_contract_violations FOR UPDATE
  TO authenticated
  USING (true);

-- Data Drift Events Policies
CREATE POLICY "Authenticated users can view drift events"
  ON public.data_drift_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create drift events"
  ON public.data_drift_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update drift events"
  ON public.data_drift_events FOR UPDATE
  TO authenticated
  USING (true);

-- Dataset Lineage Edges Policies
CREATE POLICY "Authenticated users can view lineage"
  ON public.dataset_lineage_edges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create lineage"
  ON public.dataset_lineage_edges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- =====================================================
-- TRIGGERS FOR HASH CHAIN & AUTOMATION
-- =====================================================

-- Function to compute quality run hash chain
CREATE OR REPLACE FUNCTION public.compute_quality_run_hash()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash TEXT;
  hash_input TEXT;
BEGIN
  -- Get previous hash for this dataset
  SELECT record_hash INTO prev_hash
  FROM public.dataset_quality_runs
  WHERE dataset_id = NEW.dataset_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  NEW.previous_hash := prev_hash;
  
  -- Compute record hash
  hash_input := COALESCE(NEW.dataset_id::text, '') || 
                COALESCE(NEW.verdict, '') || 
                COALESCE(NEW.overall_score::text, '') ||
                COALESCE(NEW.previous_hash, 'GENESIS') ||
                COALESCE(NEW.created_at::text, '');
  
  NEW.record_hash := encode(sha256(hash_input::bytea), 'hex');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER compute_quality_run_hash_trigger
  BEFORE INSERT ON public.dataset_quality_runs
  FOR EACH ROW EXECUTE FUNCTION public.compute_quality_run_hash();

-- Function to auto-update contract status on violation
CREATE OR REPLACE FUNCTION public.update_contract_on_violation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity IN ('high', 'critical') THEN
    UPDATE public.data_contracts
    SET status = 'violated', updated_at = now()
    WHERE id = NEW.contract_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_contract_on_violation_trigger
  AFTER INSERT ON public.data_contract_violations
  FOR EACH ROW EXECUTE FUNCTION public.update_contract_on_violation();

-- Function to update data_contracts updated_at
CREATE OR REPLACE FUNCTION public.update_data_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_data_contracts_updated_at_trigger
  BEFORE UPDATE ON public.data_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_data_contracts_updated_at();

-- =====================================================
-- KNOWLEDGE GRAPH SYNC FUNCTION
-- =====================================================

-- Function to sync data governance entities to KG
CREATE OR REPLACE FUNCTION public.sync_data_governance_to_kg()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert/update KG node for quality run
  INSERT INTO public.kg_nodes (entity_id, entity_type, label, properties, source, status)
  VALUES (
    NEW.id::text,
    'quality_run',
    'Quality Run: ' || NEW.verdict,
    jsonb_build_object(
      'dataset_id', NEW.dataset_id,
      'overall_score', NEW.overall_score,
      'verdict', NEW.verdict,
      'run_type', NEW.run_type
    ),
    'data_governance',
    CASE WHEN NEW.verdict = 'PASS' THEN 'active' ELSE 'flagged' END
  )
  ON CONFLICT (entity_id, entity_type) DO UPDATE
  SET properties = EXCLUDED.properties,
      status = EXCLUDED.status;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_quality_run_to_kg_trigger
  AFTER INSERT ON public.dataset_quality_runs
  FOR EACH ROW EXECUTE FUNCTION public.sync_data_governance_to_kg();