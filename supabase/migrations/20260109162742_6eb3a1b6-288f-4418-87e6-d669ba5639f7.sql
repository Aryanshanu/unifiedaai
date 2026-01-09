-- =====================================================
-- PHASE 2: DECISION GOVERNANCE SCHEMA
-- Complete decision lifecycle tracking with immutability
-- =====================================================

-- 1. Decision Ledger (immutable, hash-chained)
CREATE TABLE public.decision_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_ref TEXT NOT NULL UNIQUE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE RESTRICT,
  model_version TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  confidence NUMERIC(5,4) CHECK (confidence >= 0 AND confidence <= 1),
  decision_value TEXT NOT NULL,
  decision_timestamp TIMESTAMPTZ NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  previous_hash TEXT,
  record_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Decision Explanations (instance-level explainability)
CREATE TABLE public.decision_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decision_ledger(id) ON DELETE CASCADE,
  explanation_type TEXT NOT NULL CHECK (explanation_type IN ('shap', 'lime', 'counterfactual', 'natural_language', 'feature_importance')),
  feature_influences JSONB DEFAULT '{}'::jsonb,
  counterfactual JSONB,
  natural_language TEXT,
  generation_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Decision Appeals (regulatory compliance - EU AI Act Art. 22 GDPR)
CREATE TABLE public.decision_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decision_ledger(id) ON DELETE RESTRICT,
  appellant_reference TEXT NOT NULL,
  appeal_reason TEXT NOT NULL,
  appeal_category TEXT NOT NULL CHECK (appeal_category IN ('accuracy', 'fairness', 'privacy', 'transparency', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'upheld', 'overturned', 'escalated', 'withdrawn')),
  assigned_to UUID,
  review_notes TEXT,
  final_decision TEXT,
  sla_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 4. Decision Overrides (human corrections with full accountability)
CREATE TABLE public.decision_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decision_ledger(id) ON DELETE RESTRICT,
  appeal_id UUID REFERENCES public.decision_appeals(id),
  original_decision TEXT NOT NULL,
  new_decision TEXT NOT NULL,
  override_reason TEXT NOT NULL,
  authorized_by UUID NOT NULL,
  authorization_level TEXT NOT NULL CHECK (authorization_level IN ('operator', 'supervisor', 'governance_lead', 'executive')),
  evidence_hash TEXT,
  previous_hash TEXT,
  record_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Decision Outcomes (harm tracking and feedback loop)
CREATE TABLE public.decision_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decision_ledger(id) ON DELETE RESTRICT,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('correct', 'incorrect', 'harmful', 'reversed', 'unknown', 'pending_verification')),
  harm_category TEXT CHECK (harm_category IN ('financial', 'legal', 'reputational', 'safety', 'discrimination', 'privacy', 'none')),
  harm_severity TEXT CHECK (harm_severity IN ('none', 'low', 'medium', 'high', 'critical')),
  outcome_details JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ,
  verified_by UUID,
  remediation_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_decision_ledger_model ON public.decision_ledger(model_id);
CREATE INDEX idx_decision_ledger_timestamp ON public.decision_ledger(decision_timestamp DESC);
CREATE INDEX idx_decision_ledger_ref ON public.decision_ledger(decision_ref);
CREATE INDEX idx_decision_explanations_decision ON public.decision_explanations(decision_id);
CREATE INDEX idx_decision_appeals_status ON public.decision_appeals(status);
CREATE INDEX idx_decision_appeals_deadline ON public.decision_appeals(sla_deadline) WHERE status IN ('pending', 'under_review');
CREATE INDEX idx_decision_outcomes_type ON public.decision_outcomes(outcome_type);
CREATE INDEX idx_decision_outcomes_harm ON public.decision_outcomes(harm_category) WHERE harm_category IS NOT NULL;

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.decision_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_outcomes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - DECISION LEDGER (Append-only, immutable)
-- =====================================================
CREATE POLICY "System can insert decisions"
  ON public.decision_ledger FOR INSERT
  WITH CHECK (public.is_system_actor() OR public.can_manage_governance());

CREATE POLICY "Authenticated users can view decisions"
  ON public.decision_ledger FOR SELECT
  USING (true);

-- No UPDATE or DELETE policies - decisions are immutable

-- =====================================================
-- RLS POLICIES - DECISION EXPLANATIONS
-- =====================================================
CREATE POLICY "System can insert explanations"
  ON public.decision_explanations FOR INSERT
  WITH CHECK (public.is_system_actor() OR public.can_manage_governance());

CREATE POLICY "Authenticated users can view explanations"
  ON public.decision_explanations FOR SELECT
  USING (true);

-- =====================================================
-- RLS POLICIES - DECISION APPEALS
-- =====================================================
CREATE POLICY "Authenticated users can create appeals"
  ON public.decision_appeals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view appeals"
  ON public.decision_appeals FOR SELECT
  USING (true);

CREATE POLICY "Assigned reviewers or admins can update appeals"
  ON public.decision_appeals FOR UPDATE
  USING (
    assigned_to = auth.uid() OR 
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'reviewer'::app_role])
  );

-- =====================================================
-- RLS POLICIES - DECISION OVERRIDES (High accountability)
-- =====================================================
CREATE POLICY "Governance managers can create overrides"
  ON public.decision_overrides FOR INSERT
  WITH CHECK (public.can_manage_governance());

CREATE POLICY "Authenticated users can view overrides"
  ON public.decision_overrides FOR SELECT
  USING (true);

-- No UPDATE or DELETE - overrides are immutable audit trail

-- =====================================================
-- RLS POLICIES - DECISION OUTCOMES
-- =====================================================
CREATE POLICY "System or governance can insert outcomes"
  ON public.decision_outcomes FOR INSERT
  WITH CHECK (public.is_system_actor() OR public.can_manage_governance());

CREATE POLICY "Authenticated users can view outcomes"
  ON public.decision_outcomes FOR SELECT
  USING (true);

CREATE POLICY "Governance can update outcomes"
  ON public.decision_outcomes FOR UPDATE
  USING (public.can_manage_governance());

-- =====================================================
-- HASH CHAIN TRIGGER FOR DECISION LEDGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.compute_decision_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_hash TEXT;
  hash_input TEXT;
BEGIN
  -- Get previous hash for this model (append-only chain per model)
  SELECT record_hash INTO prev_hash
  FROM public.decision_ledger
  WHERE model_id = NEW.model_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  NEW.previous_hash := COALESCE(prev_hash, 'GENESIS');
  
  -- Compute hash from immutable decision data
  hash_input := COALESCE(NEW.decision_ref, '') ||
                COALESCE(NEW.model_id::text, '') ||
                COALESCE(NEW.model_version, '') ||
                COALESCE(NEW.input_hash, '') ||
                COALESCE(NEW.output_hash, '') ||
                COALESCE(NEW.decision_value, '') ||
                COALESCE(NEW.decision_timestamp::text, '') ||
                COALESCE(NEW.previous_hash, 'GENESIS');
  
  NEW.record_hash := encode(sha256(hash_input::bytea), 'hex');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_compute_decision_hash
  BEFORE INSERT ON public.decision_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_decision_hash();

-- =====================================================
-- HASH CHAIN TRIGGER FOR DECISION OVERRIDES
-- =====================================================
CREATE OR REPLACE FUNCTION public.compute_override_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_hash TEXT;
  hash_input TEXT;
BEGIN
  -- Get previous hash for this decision
  SELECT record_hash INTO prev_hash
  FROM public.decision_overrides
  WHERE decision_id = NEW.decision_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  NEW.previous_hash := COALESCE(prev_hash, 'GENESIS');
  
  hash_input := COALESCE(NEW.decision_id::text, '') ||
                COALESCE(NEW.original_decision, '') ||
                COALESCE(NEW.new_decision, '') ||
                COALESCE(NEW.authorized_by::text, '') ||
                COALESCE(NEW.previous_hash, 'GENESIS') ||
                COALESCE(NEW.created_at::text, '');
  
  NEW.record_hash := encode(sha256(hash_input::bytea), 'hex');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_compute_override_hash
  BEFORE INSERT ON public.decision_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_override_hash();

-- =====================================================
-- AUTO-ESCALATE HARMFUL OUTCOMES TO INCIDENTS
-- =====================================================
CREATE OR REPLACE FUNCTION public.escalate_harmful_outcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_model_id UUID;
  v_severity severity_level;
BEGIN
  -- Only escalate actual harm
  IF NEW.outcome_type = 'harmful' AND NEW.harm_severity IN ('high', 'critical') THEN
    -- Get model_id from decision
    SELECT model_id INTO v_model_id
    FROM public.decision_ledger
    WHERE id = NEW.decision_id;
    
    -- Map harm severity to incident severity
    v_severity := CASE NEW.harm_severity
      WHEN 'critical' THEN 'critical'::severity_level
      WHEN 'high' THEN 'high'::severity_level
      ELSE 'medium'::severity_level
    END;
    
    -- Create incident
    INSERT INTO public.incidents (
      model_id,
      incident_type,
      title,
      description,
      severity,
      status
    ) VALUES (
      v_model_id,
      'harmful_decision',
      'Harmful Decision Outcome Detected',
      format('Decision %s resulted in %s harm (%s category). Details: %s',
        NEW.decision_id,
        NEW.harm_severity,
        COALESCE(NEW.harm_category, 'unspecified'),
        COALESCE(NEW.outcome_details::text, 'No details provided')
      ),
      v_severity,
      'open'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_escalate_harmful_outcome
  AFTER INSERT ON public.decision_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.escalate_harmful_outcome();

-- =====================================================
-- SYNC DECISIONS TO KNOWLEDGE GRAPH
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_decision_to_kg()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decision_node_id UUID;
  model_node_id UUID;
BEGIN
  -- Create decision node
  INSERT INTO public.kg_nodes (entity_type, entity_id, label, source, properties)
  VALUES (
    'decision',
    NEW.id,
    'Decision: ' || LEFT(NEW.decision_ref, 30),
    'auto_sync',
    jsonb_build_object(
      'decision_value', NEW.decision_value,
      'confidence', NEW.confidence,
      'model_version', NEW.model_version,
      'timestamp', NEW.decision_timestamp
    )
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO decision_node_id;

  -- Get model node
  SELECT id INTO model_node_id
  FROM public.kg_nodes
  WHERE entity_type = 'model' AND entity_id = NEW.model_id;

  -- Create edge: model -> produces -> decision
  IF decision_node_id IS NOT NULL AND model_node_id IS NOT NULL THEN
    INSERT INTO public.kg_edges (source_node_id, target_node_id, relationship_type, properties)
    VALUES (
      model_node_id,
      decision_node_id,
      'produces',
      jsonb_build_object('version', NEW.model_version)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_decision_to_kg
  AFTER INSERT ON public.decision_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_decision_to_kg();

-- =====================================================
-- UPDATED_AT TRIGGER FOR APPEALS
-- =====================================================
CREATE TRIGGER trigger_update_appeals_timestamp
  BEFORE UPDATE ON public.decision_appeals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();