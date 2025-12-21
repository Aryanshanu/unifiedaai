-- ============================================
-- FRACTAL RAI-OS: SECURITY HARDENING MIGRATION
-- Fixed function call order: has_role(uuid, app_role)
-- ============================================

-- 1. Harden admin_audit_log INSERT policy
DROP POLICY IF EXISTS "audit_log_insert_only" ON public.admin_audit_log;

CREATE POLICY "audit_log_trigger_only_insert" 
ON public.admin_audit_log 
FOR INSERT 
WITH CHECK (
  current_setting('role') = 'service_role' OR
  current_setting('role') = 'authenticated'
);

-- 2. Add hash chain columns
ALTER TABLE public.admin_audit_log 
ADD COLUMN IF NOT EXISTS previous_hash TEXT,
ADD COLUMN IF NOT EXISTS record_hash TEXT;

-- 3. Create hash chain function
CREATE OR REPLACE FUNCTION compute_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
  last_hash TEXT;
  content_to_hash TEXT;
BEGIN
  SELECT record_hash INTO last_hash 
  FROM admin_audit_log 
  ORDER BY performed_at DESC 
  LIMIT 1;
  
  NEW.previous_hash := COALESCE(last_hash, 'GENESIS');
  
  content_to_hash := COALESCE(NEW.action_type, '') || 
                     COALESCE(NEW.table_name, '') || 
                     COALESCE(NEW.record_id::text, '') ||
                     COALESCE(NEW.previous_hash, '') ||
                     COALESCE(to_char(NEW.performed_at, 'YYYY-MM-DD HH24:MI:SS.US'), '');
  
  NEW.record_hash := encode(sha256(content_to_hash::bytea), 'hex');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_hash_chain_trigger ON admin_audit_log;
CREATE TRIGGER audit_hash_chain_trigger
BEFORE INSERT ON admin_audit_log
FOR EACH ROW
EXECUTE FUNCTION compute_audit_hash();

-- 4. Fix RLS on request_logs
DROP POLICY IF EXISTS "Users can view logs for their systems" ON public.request_logs;

CREATE POLICY "Admin and analysts can view all request logs"
ON public.request_logs
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
);

CREATE POLICY "System owners can view their own logs"
ON public.request_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM systems s 
    WHERE s.id = request_logs.system_id 
    AND s.owner_id = auth.uid()
  )
);

-- 5. Fix RLS on red_team_tests
DROP POLICY IF EXISTS "Authenticated users can view red team tests" ON public.red_team_tests;

CREATE POLICY "Privileged users can view red team tests"
ON public.red_team_tests
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
);

-- 6. Harden risk_assessments
DROP POLICY IF EXISTS "Users can view all risk assessments" ON public.risk_assessments;

CREATE POLICY "Users can view related risk assessments"
ON public.risk_assessments
FOR SELECT
USING (
  created_by = auth.uid() OR
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role]) OR
  EXISTS (
    SELECT 1 FROM systems s
    WHERE s.id = risk_assessments.system_id
    AND s.owner_id = auth.uid()
  )
);

-- 7. Harden impact_assessments
DROP POLICY IF EXISTS "Users can view all impact assessments" ON public.impact_assessments;

CREATE POLICY "Users can view related impact assessments"
ON public.impact_assessments
FOR SELECT
USING (
  created_by = auth.uid() OR
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role]) OR
  EXISTS (
    SELECT 1 FROM systems s
    WHERE s.id = impact_assessments.system_id
    AND s.owner_id = auth.uid()
  )
);

-- 8. Create gateway_config table
CREATE TABLE IF NOT EXISTS public.gateway_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.gateway_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gateway config"
ON public.gateway_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view gateway config"
ON public.gateway_config
FOR SELECT
USING (auth.uid() IS NOT NULL);

INSERT INTO public.gateway_config (config_key, config_value, description)
VALUES 
  ('evaluation_enforcement', '{"enabled": true, "min_score": 70, "required_engines": ["fairness", "toxicity", "privacy"]}', 'Enforce minimum evaluation scores'),
  ('rate_limiting', '{"enabled": true, "requests_per_minute": 100, "burst_limit": 150}', 'Rate limiting configuration'),
  ('fail_closed', '{"enabled": true, "on_evaluation_error": "block", "on_external_api_failure": "block"}', 'Fail-closed behavior')
ON CONFLICT (config_key) DO NOTHING;

-- 9. Create evaluation_requirements table
CREATE TABLE IF NOT EXISTS public.evaluation_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  engine_type TEXT NOT NULL,
  min_score INTEGER NOT NULL DEFAULT 70,
  is_blocking BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(system_id, engine_type)
);

ALTER TABLE public.evaluation_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System owners can manage eval requirements"
ON public.evaluation_requirements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM systems s 
    WHERE s.id = evaluation_requirements.system_id 
    AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can view eval requirements"
ON public.evaluation_requirements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM systems s 
    WHERE s.id = evaluation_requirements.system_id 
    AND (s.owner_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role]))
  )
);

-- 10. Add indexes
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_model_status 
ON evaluation_runs(model_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evaluation_runs_engine_type 
ON evaluation_runs(model_id, engine_type, status);

-- 11. Add fail-closed columns
ALTER TABLE public.evaluation_runs
ADD COLUMN IF NOT EXISTS failed_reason TEXT,
ADD COLUMN IF NOT EXISTS fail_closed BOOLEAN DEFAULT false;