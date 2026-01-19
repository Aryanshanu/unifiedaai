-- Fix 5 ERROR-level security issues identified in security scan
-- =====================================================

-- =====================================================
-- 1. regulatory_reports - Restrict to system owners and governance roles
-- =====================================================

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read regulatory_reports" ON public.regulatory_reports;
DROP POLICY IF EXISTS "Public can view regulatory_reports" ON public.regulatory_reports;
DROP POLICY IF EXISTS "Authenticated users can view regulatory_reports" ON public.regulatory_reports;

-- Create restricted SELECT policy - only system owners and governance roles
CREATE POLICY "Restricted access to regulatory_reports"
  ON public.regulatory_reports FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role, 'reviewer'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.systems s
      WHERE s.id = regulatory_reports.system_id
      AND s.owner_id = auth.uid()
    )
    OR generated_by = auth.uid()
    OR approved_by = auth.uid()
  );

-- =====================================================
-- 2. risk_metrics - Drop any remaining permissive policies
-- (Previous migration may have added policies, let's ensure they're correct)
-- =====================================================

-- Drop any lingering permissive policies
DROP POLICY IF EXISTS "Anyone can read risk_metrics" ON public.risk_metrics;
DROP POLICY IF EXISTS "Public can view risk_metrics" ON public.risk_metrics;
DROP POLICY IF EXISTS "Authenticated users can view risk_metrics" ON public.risk_metrics;
DROP POLICY IF EXISTS "Authenticated users can read risk_metrics" ON public.risk_metrics;

-- Ensure proper SELECT policy exists (recreate if needed)
DROP POLICY IF EXISTS "Restricted access to risk_metrics" ON public.risk_metrics;
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

-- =====================================================
-- 3. risk_policy_bindings - Restrict to admins only
-- This contains security architecture that could be reverse-engineered
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.risk_policy_bindings ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Anyone can read risk_policy_bindings" ON public.risk_policy_bindings;
DROP POLICY IF EXISTS "Public can view risk_policy_bindings" ON public.risk_policy_bindings;
DROP POLICY IF EXISTS "Authenticated users can view risk_policy_bindings" ON public.risk_policy_bindings;
DROP POLICY IF EXISTS "Authenticated users can read risk_policy_bindings" ON public.risk_policy_bindings;

-- Create admin-only SELECT policy
CREATE POLICY "Admins can view risk_policy_bindings"
  ON public.risk_policy_bindings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create admin-only INSERT/UPDATE/DELETE policies
CREATE POLICY "Admins can insert risk_policy_bindings"
  ON public.risk_policy_bindings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update risk_policy_bindings"
  ON public.risk_policy_bindings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete risk_policy_bindings"
  ON public.risk_policy_bindings FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 4. dq_data (bronze_data) - Add RLS policies
-- This table stores raw ingested data that could contain PII
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.dq_data ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can read dq_data" ON public.dq_data;
DROP POLICY IF EXISTS "Public can view dq_data" ON public.dq_data;
DROP POLICY IF EXISTS "Authenticated users can view dq_data" ON public.dq_data;

-- Create SELECT policy - only data owners (via upload) and governance roles
CREATE POLICY "Data owners and admins can view dq_data"
  ON public.dq_data FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.data_uploads du
      WHERE du.id = dq_data.upload_id
      AND du.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.datasets ds
      WHERE ds.id = dq_data.dataset_id
      AND ds.owner_id = auth.uid()
    )
  );

-- Create INSERT policy - only data owners and system actors
CREATE POLICY "Data owners and system can insert dq_data"
  ON public.dq_data FOR INSERT
  WITH CHECK (
    public.is_system_actor()
    OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.data_uploads du
      WHERE du.id = dq_data.upload_id
      AND du.user_id = auth.uid()
    )
  );

-- Create UPDATE policy - only data owners and governance
CREATE POLICY "Data owners and admins can update dq_data"
  ON public.dq_data FOR UPDATE
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.data_uploads du
      WHERE du.id = dq_data.upload_id
      AND du.user_id = auth.uid()
    )
  );

-- Create DELETE policy - only admins
CREATE POLICY "Admins can delete dq_data"
  ON public.dq_data FOR DELETE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role]));

-- =====================================================
-- 5. request_logs - Fix overly permissive USING(true) policies
-- This stores sensitive API traffic data
-- =====================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can view logs for their systems" ON public.request_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.request_logs;

-- Create restricted SELECT policy - only system/project owners and governance
CREATE POLICY "Users can view logs for their systems"
  ON public.request_logs FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.systems s
      WHERE s.id = request_logs.system_id
      AND s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = request_logs.project_id
      AND p.owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Create restricted INSERT policy - only service role (system actors)
CREATE POLICY "System can insert logs"
  ON public.request_logs FOR INSERT
  WITH CHECK (public.is_system_actor());