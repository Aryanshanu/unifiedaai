
CREATE TABLE public.role_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  icon text,
  default_route text NOT NULL DEFAULT '/',
  sidebar_sections jsonb NOT NULL DEFAULT '[]',
  dashboard_layout text NOT NULL DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read role_personas" ON public.role_personas
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.role_personas (role, display_name, description, icon, default_route, sidebar_sections, dashboard_layout) VALUES
('admin', 'Chief Data & AI Officer', 'Executive oversight of AI governance, risk posture, and compliance across the enterprise', 'crown', '/', '["all"]', 'executive'),
('reviewer', 'AI Steward', 'Governance and risk management, policy enforcement, HITL reviews, and incident response', 'shield-check', '/hitl', '["discover","monitor","govern","data-governance"]', 'governance'),
('analyst', 'Agent Engineer', 'Technical configuration, model evaluation, security testing, and data quality operations', 'wrench', '/projects', '["discover","monitor","core-rai","core-security","data-governance","configure"]', 'technical'),
('viewer', 'Compliance Auditor', 'Regulatory compliance, audit trails, evidence packages, and attestation management', 'file-check', '/decision-ledger', '["govern","data-governance","docs"]', 'compliance');
