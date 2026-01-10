-- Governance Activation State Table
-- Tracks the activation status of each governance capability
CREATE TABLE public.governance_activation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'piloting', 'enforced')),
  activated_at TIMESTAMPTZ,
  activated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert all governance capabilities as inactive
INSERT INTO public.governance_activation_state (capability, status, notes) VALUES
  ('data_quality', 'inactive', 'Data quality scoring and validation'),
  ('data_drift', 'inactive', 'Distribution drift detection'),
  ('data_contracts', 'inactive', 'Schema and quality contract enforcement'),
  ('model_evaluation', 'inactive', 'RAI evaluation engines'),
  ('deployment_gating', 'inactive', 'Approval-based deployment gates'),
  ('decision_logging', 'inactive', 'Immutable decision ledger'),
  ('decision_explanation', 'inactive', 'Automated explanation generation'),
  ('appeals', 'inactive', 'Decision appeal workflow'),
  ('outcome_tracking', 'inactive', 'Post-decision outcome monitoring'),
  ('harm_classification', 'inactive', 'Harm taxonomy classification'),
  ('mlops_attestation', 'inactive', 'Deployment attestation and hash verification');

-- Enable RLS
ALTER TABLE public.governance_activation_state ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read activation state
CREATE POLICY "Anyone can read activation state" ON public.governance_activation_state
  FOR SELECT TO authenticated USING (true);

-- Admins can update activation state
CREATE POLICY "Admins can update activation state" ON public.governance_activation_state
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_governance_activation_state_updated_at
  BEFORE UPDATE ON public.governance_activation_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for governance activation state
ALTER PUBLICATION supabase_realtime ADD TABLE public.governance_activation_state;