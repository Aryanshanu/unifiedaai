-- ============================================
-- PHASE 2: RISK ENFORCEMENT
-- Risk Policy Bindings & Auto-Lock for Critical Risk
-- ============================================

-- 1. RISK POLICY BINDINGS TABLE
-- Links risk tiers to mandatory governance actions
CREATE TABLE risk_policy_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_tier text NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),
  required_action text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('hitl_mandatory', 'approval_required', 'executive_signoff', 'auto_lock', 're_evaluation', 'notification')),
  auto_enforce boolean NOT NULL DEFAULT true,
  enforcement_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE risk_policy_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_bindings_read_all" ON risk_policy_bindings
FOR SELECT USING (true);

CREATE POLICY "risk_bindings_admin_manage" ON risk_policy_bindings
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Insert default Fractal-grade bindings
INSERT INTO risk_policy_bindings (risk_tier, required_action, action_type, enforcement_description) VALUES
  ('low', 'Standard deployment workflow', 'approval_required', 'System can proceed with standard approval process'),
  ('medium', 'Enhanced review with compliance check', 'approval_required', 'Requires documented review and compliance verification'),
  ('medium', 'Periodic re-evaluation required', 're_evaluation', 'Must be re-evaluated every 30 days'),
  ('high', 'Human-in-the-loop mandatory', 'hitl_mandatory', 'All decisions require human review before execution'),
  ('high', 'Compliance signoff required', 'approval_required', 'Requires explicit approval from compliance officer'),
  ('high', 'Executive notification', 'notification', 'Executive team must be notified of deployment'),
  ('critical', 'Automatic registry lock', 'auto_lock', 'System is auto-locked pending executive review'),
  ('critical', 'Executive signoff mandatory', 'executive_signoff', 'Requires C-level or designated executive approval'),
  ('critical', 'Continuous monitoring required', 're_evaluation', 'Must be re-evaluated every 7 days while active');

-- Index for efficient lookup
CREATE INDEX idx_risk_bindings_tier ON risk_policy_bindings(risk_tier);

-- 2. Add trigger for updated_at
CREATE TRIGGER update_risk_policy_bindings_updated_at
BEFORE UPDATE ON risk_policy_bindings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. PHASE 4: DATASET GOVERNANCE TABLES (Adding early for lifecycle completeness)
CREATE TABLE datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source text NOT NULL,
  source_url text,
  consent_status text NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending', 'obtained', 'revoked', 'not_required')),
  retention_days integer,
  sensitivity_level text CHECK (sensitivity_level IN ('low', 'medium', 'high', 'critical')),
  jurisdiction text[],
  data_types text[],
  row_count bigint,
  description text,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  usage_type text NOT NULL CHECK (usage_type IN ('training', 'validation', 'testing', 'fine_tuning', 'evaluation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(model_id, dataset_id, usage_type)
);

-- Enable RLS on dataset tables
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "datasets_read_all" ON datasets FOR SELECT USING (true);
CREATE POLICY "datasets_owner_manage" ON datasets FOR ALL USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "model_datasets_read_all" ON model_datasets FOR SELECT USING (true);
CREATE POLICY "model_datasets_privileged_manage" ON model_datasets FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role]));

-- Indexes
CREATE INDEX idx_datasets_sensitivity ON datasets(sensitivity_level);
CREATE INDEX idx_model_datasets_model ON model_datasets(model_id);
CREATE INDEX idx_model_datasets_dataset ON model_datasets(dataset_id);

-- Trigger for updated_at
CREATE TRIGGER update_datasets_updated_at
BEFORE UPDATE ON datasets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger for datasets
CREATE TRIGGER audit_datasets_changes
AFTER INSERT OR UPDATE OR DELETE ON datasets
FOR EACH ROW EXECUTE FUNCTION log_governance_changes();