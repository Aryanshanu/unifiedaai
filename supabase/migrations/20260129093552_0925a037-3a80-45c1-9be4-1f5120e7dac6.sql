-- Phase 2: Auto-Approval Policies
CREATE TABLE IF NOT EXISTS auto_approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL,
  severity_filter TEXT[] CHECK (severity_filter <@ ARRAY['low', 'medium', 'high', 'critical']),
  review_type_filter TEXT[],
  max_risk_score NUMERIC DEFAULT 30,
  auto_action TEXT CHECK (auto_action IN ('approve', 'reject', 'escalate')) DEFAULT 'approve',
  enabled BOOLEAN DEFAULT false,
  requires_audit_log BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: RCA Templates
CREATE TABLE IF NOT EXISTS rca_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  template_content JSONB NOT NULL,
  required_fields TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RCA columns to incidents if not exist
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rca_template_id UUID REFERENCES rca_templates(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rca_completed_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- Phase 4: Platform Configuration
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('engine_weights', 'thresholds', 'slo', 'escalation', 'policy')),
  version INTEGER DEFAULT 1,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  description TEXT
);

CREATE TABLE IF NOT EXISTS platform_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES platform_config(id),
  previous_value JSONB,
  new_value JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 5: Demo Scenarios
CREATE TABLE IF NOT EXISTS demo_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  expected_outcomes JSONB,
  duration_seconds INTEGER DEFAULT 90,
  category TEXT CHECK (category IN ('sales', 'audit', 'investor', 'training')),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 6: Function Metrics
CREATE TABLE IF NOT EXISTS function_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  invocation_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  total_latency_ms BIGINT DEFAULT 0,
  cold_start_count INTEGER DEFAULT 0,
  measurement_window TIMESTAMPTZ DEFAULT now(),
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_function_metrics_name_time ON function_metrics(function_name, recorded_at DESC);

-- Phase 9: Predictive Governance
CREATE TABLE IF NOT EXISTS predictive_governance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT CHECK (entity_type IN ('model', 'system', 'dataset')),
  entity_id UUID NOT NULL,
  prediction_type TEXT CHECK (prediction_type IN ('drift_risk', 'compliance_risk', 'incident_probability')),
  risk_score NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL,
  predicted_timeframe_hours INTEGER,
  factors JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 10: Policy Versions
CREATE TABLE IF NOT EXISTS policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  validated BOOLEAN DEFAULT false,
  validation_errors JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(policy_id, version)
);

-- Enable RLS on all new tables
ALTER TABLE auto_approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rca_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_governance ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can read auto_approval_policies" ON auto_approval_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage auto_approval_policies" ON auto_approval_policies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read rca_templates" ON rca_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage rca_templates" ON rca_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read platform_config" ON platform_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage platform_config" ON platform_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read platform_config_history" ON platform_config_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read demo_scenarios" ON demo_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage demo_scenarios" ON demo_scenarios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read function_metrics" ON function_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert function_metrics" ON function_metrics FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read predictive_governance" ON predictive_governance FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can manage predictive_governance" ON predictive_governance FOR ALL TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read policy_versions" ON policy_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage policy_versions" ON policy_versions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default platform config
INSERT INTO platform_config (config_key, config_value, category, description) VALUES
  ('engine_weights', '{"fairness": 0.25, "hallucination": 0.25, "toxicity": 0.20, "privacy": 0.20, "explainability": 0.10}', 'engine_weights', 'RAI engine score weightings'),
  ('dq_thresholds', '{"completeness": 0.95, "validity": 0.90, "uniqueness": 0.99, "freshness": 0.85, "consistency": 0.90, "accuracy": 0.85}', 'thresholds', 'Data quality dimension thresholds'),
  ('fairness_thresholds', '{"demographic_parity": 0.1, "equalized_odds": 0.1, "equal_opportunity": 0.1}', 'thresholds', 'Fairness metric thresholds'),
  ('slo_targets', '{"mttd_critical_minutes": 5, "mttd_high_minutes": 15, "mttr_critical_minutes": 60, "mttr_high_minutes": 240}', 'slo', 'SLO target values'),
  ('escalation_rules', '{"critical_sla_minutes": 30, "high_sla_minutes": 120, "auto_escalate": true}', 'escalation', 'Escalation timing rules')
ON CONFLICT (config_key) DO NOTHING;

-- Seed RCA templates
INSERT INTO rca_templates (incident_type, template_content, required_fields) VALUES
  ('data_quality', '{"sections": ["root_cause", "impact_assessment", "immediate_actions", "long_term_fixes", "prevention_measures"]}', ARRAY['root_cause', 'impact_assessment']),
  ('model_drift', '{"sections": ["drift_type", "affected_features", "baseline_comparison", "retraining_plan"]}', ARRAY['drift_type', 'affected_features']),
  ('bias_detected', '{"sections": ["affected_groups", "disparity_metrics", "remediation_strategy", "monitoring_plan"]}', ARRAY['affected_groups', 'disparity_metrics']),
  ('security_breach', '{"sections": ["attack_vector", "compromised_data", "containment_actions", "forensic_evidence"]}', ARRAY['attack_vector', 'containment_actions']),
  ('compliance_violation', '{"sections": ["regulation_reference", "violation_details", "remediation_timeline", "audit_evidence"]}', ARRAY['regulation_reference', 'violation_details'])
ON CONFLICT DO NOTHING;

-- Seed demo scenarios
INSERT INTO demo_scenarios (scenario_name, description, steps, expected_outcomes, duration_seconds, category) VALUES
  ('Investor Demo', 'Condensed 60-second platform overview for investors', 
   '[{"step": 1, "action": "show_dashboard", "duration": 10}, {"step": 2, "action": "generate_traffic", "duration": 15}, {"step": 3, "action": "show_incident", "duration": 10}, {"step": 4, "action": "hitl_approval", "duration": 15}, {"step": 5, "action": "show_attestation", "duration": 10}]',
   '{"incidents_created": 5, "decisions_made": 1, "attestation_generated": true}', 60, 'investor'),
  ('Audit Demo', 'Comprehensive 5-minute audit trail demonstration',
   '[{"step": 1, "action": "show_lineage", "duration": 60}, {"step": 2, "action": "run_evaluation", "duration": 90}, {"step": 3, "action": "show_audit_chain", "duration": 60}, {"step": 4, "action": "generate_report", "duration": 90}]',
   '{"audit_chain_verified": true, "report_generated": true}', 300, 'audit'),
  ('Sales Demo', 'Full platform walkthrough for prospective customers',
   '[{"step": 1, "action": "show_architecture", "duration": 30}, {"step": 2, "action": "demo_all_engines", "duration": 120}, {"step": 3, "action": "show_governance", "duration": 60}, {"step": 4, "action": "show_security", "duration": 30}]',
   '{"engines_demonstrated": 5, "governance_shown": true}', 240, 'sales')
ON CONFLICT DO NOTHING;