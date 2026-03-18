
-- Implementation 2: Settings tables

-- 1. Security config table
CREATE TABLE public.security_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  session_timeout_minutes INTEGER NOT NULL DEFAULT 60,
  password_min_length INTEGER NOT NULL DEFAULT 12,
  require_special_chars BOOLEAN NOT NULL DEFAULT true,
  audit_retention_days INTEGER NOT NULL DEFAULT 2555,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.security_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own security config" ON public.security_config
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. API keys table
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_preview TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  rate_limit INTEGER NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own api keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Add columns to organization_settings
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS data_residency TEXT DEFAULT 'eu-west-1',
  ADD COLUMN IF NOT EXISTS compliance_frameworks JSONB DEFAULT '["eu-ai-act"]'::jsonb,
  ADD COLUMN IF NOT EXISTS gdpr_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ccpa_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS audit_retention_years INTEGER DEFAULT 7;

-- Implementation 3: Environment Management columns
ALTER TABLE public.deployment_environments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'us-east-1',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS auto_destroy_at TIMESTAMPTZ;

-- Implementation 4: Evaluation schedule runs
CREATE TABLE public.evaluation_schedule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  results JSONB,
  error_message TEXT,
  engines_run TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluation_schedule_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read schedule runs" ON public.evaluation_schedule_runs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert schedule runs" ON public.evaluation_schedule_runs
  FOR INSERT WITH CHECK (true);

-- Implementation 5: Governance policies and enforcements
CREATE TABLE public.governance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'global',
  condition_type TEXT NOT NULL,
  condition_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL DEFAULT 'warn',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.governance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read governance policies" ON public.governance_policies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage governance policies" ON public.governance_policies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.governance_enforcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.governance_policies(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  attempted_action TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  overridden_by UUID REFERENCES auth.users(id),
  override_justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.governance_enforcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read enforcements" ON public.governance_enforcements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert enforcements" ON public.governance_enforcements
  FOR INSERT WITH CHECK (true);
