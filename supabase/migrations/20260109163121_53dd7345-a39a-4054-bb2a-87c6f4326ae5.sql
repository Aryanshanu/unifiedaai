-- =====================================================
-- PHASE 3: MLOPS GOVERNANCE SCHEMA
-- Attestations, deployment provenance, and event logging
-- =====================================================

-- 1. Deployment Attestations (SLSA/in-toto compatible)
CREATE TABLE public.deployment_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE RESTRICT,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE RESTRICT,
  deployment_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  artifact_hash TEXT NOT NULL,
  approved_artifact_hash TEXT,
  slsa_level INTEGER CHECK (slsa_level >= 0 AND slsa_level <= 4),
  attestation_bundle JSONB DEFAULT '{}'::jsonb,
  signature TEXT,
  verified_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'bypassed')),
  bypass_reason TEXT,
  bypass_authorized_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add generated column for hash match (SLSA compliance)
ALTER TABLE public.deployment_attestations 
ADD COLUMN hash_match BOOLEAN GENERATED ALWAYS AS (artifact_hash = approved_artifact_hash) STORED;

-- 2. MLOps Governance Events (audit trail)
CREATE TABLE public.mlops_governance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'deployment_requested', 'deployment_approved', 'deployment_blocked',
    'attestation_verified', 'attestation_failed', 'bypass_requested', 'bypass_granted',
    'rollback_initiated', 'rollback_completed', 'drift_detected', 'model_retired'
  )),
  system_id UUID REFERENCES public.systems(id),
  model_id UUID REFERENCES public.models(id),
  event_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  governance_decision TEXT NOT NULL CHECK (governance_decision IN ('ALLOW', 'BLOCK', 'ESCALATE', 'INFO')),
  violations TEXT[],
  actor_id UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Harm Taxonomy (reference data for Phase 4)
CREATE TABLE public.harm_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  description TEXT,
  severity_levels JSONB NOT NULL DEFAULT '{}'::jsonb,
  regulatory_references TEXT[],
  remediation_guidelines TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Population Impact Metrics (longitudinal fairness)
CREATE TABLE public.population_impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  protected_attribute TEXT NOT NULL,
  group_value TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'demographic_parity', 'equalized_odds', 'equal_opportunity',
    'predictive_parity', 'calibration', 'disparate_impact'
  )),
  metric_value NUMERIC(7,6),
  sample_size INTEGER,
  measurement_period_start TIMESTAMPTZ NOT NULL,
  measurement_period_end TIMESTAMPTZ NOT NULL,
  is_compliant BOOLEAN,
  threshold NUMERIC(7,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Regulatory Reports (EU AI Act, Model Cards, etc.)
CREATE TABLE public.regulatory_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN (
    'eu_ai_act_conformity', 'model_card', 'data_card', 
    'impact_assessment', 'bias_audit', 'transparency_report'
  )),
  system_id UUID REFERENCES public.systems(id),
  model_id UUID REFERENCES public.models(id),
  report_version INTEGER NOT NULL DEFAULT 1,
  report_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  document_hash TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'archived'))
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_attestations_system ON public.deployment_attestations(system_id);
CREATE INDEX idx_attestations_model ON public.deployment_attestations(model_id);
CREATE INDEX idx_attestations_status ON public.deployment_attestations(verification_status);
CREATE INDEX idx_mlops_events_system ON public.mlops_governance_events(system_id);
CREATE INDEX idx_mlops_events_type ON public.mlops_governance_events(event_type);
CREATE INDEX idx_mlops_events_time ON public.mlops_governance_events(recorded_at DESC);
CREATE INDEX idx_population_metrics_model ON public.population_impact_metrics(model_id);
CREATE INDEX idx_population_metrics_period ON public.population_impact_metrics(measurement_period_start, measurement_period_end);
CREATE INDEX idx_regulatory_reports_type ON public.regulatory_reports(report_type);
CREATE INDEX idx_regulatory_reports_status ON public.regulatory_reports(status);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.deployment_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlops_governance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harm_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.population_impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - DEPLOYMENT ATTESTATIONS
-- =====================================================
CREATE POLICY "System can insert attestations"
  ON public.deployment_attestations FOR INSERT
  WITH CHECK (public.is_system_actor() OR public.can_manage_governance());

CREATE POLICY "Authenticated users can view attestations"
  ON public.deployment_attestations FOR SELECT
  USING (true);

CREATE POLICY "Governance managers can update attestations"
  ON public.deployment_attestations FOR UPDATE
  USING (public.can_manage_governance());

-- =====================================================
-- RLS POLICIES - MLOPS EVENTS
-- =====================================================
CREATE POLICY "System can insert mlops events"
  ON public.mlops_governance_events FOR INSERT
  WITH CHECK (public.is_system_actor() OR public.can_manage_governance());

CREATE POLICY "Authenticated users can view mlops events"
  ON public.mlops_governance_events FOR SELECT
  USING (true);

-- =====================================================
-- RLS POLICIES - HARM TAXONOMY
-- =====================================================
CREATE POLICY "Admins can manage harm taxonomy"
  ON public.harm_taxonomy FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view harm taxonomy"
  ON public.harm_taxonomy FOR SELECT
  USING (true);

-- =====================================================
-- RLS POLICIES - POPULATION IMPACT METRICS
-- =====================================================
CREATE POLICY "System can insert population metrics"
  ON public.population_impact_metrics FOR INSERT
  WITH CHECK (public.is_system_actor() OR public.can_manage_governance());

CREATE POLICY "Authenticated users can view population metrics"
  ON public.population_impact_metrics FOR SELECT
  USING (true);

-- =====================================================
-- RLS POLICIES - REGULATORY REPORTS
-- =====================================================
CREATE POLICY "Governance managers can manage reports"
  ON public.regulatory_reports FOR ALL
  USING (public.can_manage_governance());

CREATE POLICY "Authenticated users can view approved reports"
  ON public.regulatory_reports FOR SELECT
  USING (status IN ('approved', 'published') OR public.can_manage_governance());

-- =====================================================
-- SYNC ATTESTATION TO KNOWLEDGE GRAPH
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_attestation_to_kg()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attest_node_id UUID;
  system_node_id UUID;
BEGIN
  -- Create attestation node
  INSERT INTO public.kg_nodes (entity_type, entity_id, label, source, properties)
  VALUES (
    'attestation',
    NEW.id,
    'Attestation: ' || NEW.verification_status,
    'auto_sync',
    jsonb_build_object(
      'commit_sha', NEW.commit_sha,
      'slsa_level', NEW.slsa_level,
      'hash_match', NEW.hash_match,
      'verification_status', NEW.verification_status
    )
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO attest_node_id;

  -- Get system node
  SELECT id INTO system_node_id
  FROM public.kg_nodes
  WHERE entity_type = 'deployment' AND entity_id = NEW.system_id;

  -- Create edge: system -> attested_by -> attestation
  IF attest_node_id IS NOT NULL AND system_node_id IS NOT NULL THEN
    INSERT INTO public.kg_edges (source_node_id, target_node_id, relationship_type, properties)
    VALUES (
      system_node_id,
      attest_node_id,
      'attested_by',
      jsonb_build_object('slsa_level', NEW.slsa_level)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_attestation_to_kg
  AFTER INSERT ON public.deployment_attestations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_attestation_to_kg();

-- =====================================================
-- LOG MLOPS EVENTS TO KNOWLEDGE GRAPH
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_mlops_event_to_kg()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_node_id UUID;
BEGIN
  -- Create event node
  INSERT INTO public.kg_nodes (entity_type, entity_id, label, source, properties, status)
  VALUES (
    'mlops_event',
    NEW.id,
    'MLOps: ' || NEW.event_type,
    'auto_sync',
    jsonb_build_object(
      'event_type', NEW.event_type,
      'governance_decision', NEW.governance_decision,
      'violations', NEW.violations
    ),
    CASE NEW.governance_decision
      WHEN 'BLOCK' THEN 'flagged'
      WHEN 'ESCALATE' THEN 'pending'
      ELSE 'active'
    END
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_mlops_event_to_kg
  AFTER INSERT ON public.mlops_governance_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_mlops_event_to_kg();

-- =====================================================
-- INSERT DEFAULT HARM TAXONOMY
-- =====================================================
INSERT INTO public.harm_taxonomy (category, description, severity_levels, regulatory_references, remediation_guidelines) VALUES
('financial', 'Financial harm including monetary loss, credit impact', 
 '{"none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}'::jsonb,
 ARRAY['ECOA', 'FCRA', 'GDPR Art. 22'],
 'Review decision factors, provide appeal process, consider compensation'),
('legal', 'Legal exposure including compliance violations, liability',
 '{"none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}'::jsonb,
 ARRAY['EU AI Act', 'GDPR', 'CCPA'],
 'Document incident, engage legal counsel, report to regulators if required'),
('reputational', 'Reputational damage to individuals or organization',
 '{"none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}'::jsonb,
 ARRAY['EU AI Act Art. 52'],
 'Public disclosure if required, remediation communication'),
('safety', 'Physical safety or health risks',
 '{"none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}'::jsonb,
 ARRAY['EU AI Act Annex I (High-Risk)'],
 'Immediate system halt, incident investigation, safety review'),
('discrimination', 'Discriminatory outcomes based on protected characteristics',
 '{"none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}'::jsonb,
 ARRAY['EU AI Act Art. 10', 'Title VII', 'ECOA'],
 'Bias audit, model retraining, affected population notification'),
('privacy', 'Privacy violations including data exposure or misuse',
 '{"none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}'::jsonb,
 ARRAY['GDPR Art. 32-34', 'CCPA', 'HIPAA'],
 'Data breach protocol, affected party notification, DPA reporting')
ON CONFLICT (category) DO NOTHING;

-- Updated at trigger for harm taxonomy
CREATE TRIGGER trigger_update_harm_taxonomy_timestamp
  BEFORE UPDATE ON public.harm_taxonomy
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();