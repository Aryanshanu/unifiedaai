-- Fix PUBLIC_DATA_EXPOSURE security issues for 4 tables
-- These tables contain sensitive governance/security data that should only be accessible to authorized roles

-- =====================================================
-- 1. decision_appeals - Contains sensitive appeal information
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view appeals" ON public.decision_appeals;

-- Create restricted policy - only governance roles (admin, reviewer, analyst) can view appeals
CREATE POLICY "Governance roles can view appeals"
  ON public.decision_appeals FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'reviewer'::app_role, 'analyst'::app_role]));

-- =====================================================
-- 2. decision_outcomes - Contains sensitive harm information
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view outcomes" ON public.decision_outcomes;

-- Create restricted policy - only governance roles can view outcomes
CREATE POLICY "Governance roles can view outcomes"
  ON public.decision_outcomes FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'reviewer'::app_role, 'analyst'::app_role]));

-- =====================================================
-- 3. rate_limits - Contains system rate limiting information
-- =====================================================

-- Drop the overly permissive "Service role can manage rate limits" policy
-- This policy has USING (true) which is too broad for authenticated users
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- The existing rate_limits_select policy already restricts to is_system_actor() OR admin role
-- So just removing the broad "ALL" policy fixes this issue

-- =====================================================
-- 4. risk_metrics - Contains system vulnerability data
-- =====================================================

-- First, check if RLS is enabled and add proper policies
ALTER TABLE public.risk_metrics ENABLE ROW LEVEL SECURITY;

-- Drop any overly permissive policies
DROP POLICY IF EXISTS "Anyone can read risk_metrics" ON public.risk_metrics;
DROP POLICY IF EXISTS "Public can view risk_metrics" ON public.risk_metrics;
DROP POLICY IF EXISTS "Authenticated users can view risk_metrics" ON public.risk_metrics;

-- Create restricted SELECT policy - only system owners, admins, and analysts
CREATE POLICY "Restricted access to risk_metrics"
  ON public.risk_metrics FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.systems s
      WHERE s.id = risk_metrics.system_id
      AND s.owner_id = auth.uid()
    )
  );

-- Create INSERT policy for system actors and governance
CREATE POLICY "System or governance can insert risk_metrics"
  ON public.risk_metrics FOR INSERT
  WITH CHECK (
    public.is_system_actor()
    OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
  );

-- Create UPDATE policy for governance only
CREATE POLICY "Governance can update risk_metrics"
  ON public.risk_metrics FOR UPDATE
  USING (
    public.is_system_actor()
    OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
  );