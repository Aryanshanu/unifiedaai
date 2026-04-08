-- =============================================
-- FIX: Overly permissive RLS policies
-- Replace USING(true) write policies with role-based checks
-- =============================================

-- 1. governance_policies: restrict write to admin/analyst
DROP POLICY IF EXISTS "Authenticated users can manage governance policies" ON public.governance_policies;
CREATE POLICY "Admins and analysts can manage governance policies"
  ON public.governance_policies FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- 2. threat_models: restrict write to creator or admin
DROP POLICY IF EXISTS "Users can update threat models" ON public.threat_models;
CREATE POLICY "Owner or admin can update threat models"
  ON public.threat_models FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can delete threat models" ON public.threat_models;
CREATE POLICY "Owner or admin can delete threat models"
  ON public.threat_models FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can create threat models" ON public.threat_models;
CREATE POLICY "Admins and analysts can create threat models"
  ON public.threat_models FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- 3. threat_vectors: restrict write to admin/analyst
DROP POLICY IF EXISTS "Users can manage threat vectors" ON public.threat_vectors;
CREATE POLICY "Admins and analysts can manage threat vectors"
  ON public.threat_vectors FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- 4. security_findings: restrict write to admin/analyst
DROP POLICY IF EXISTS "Users can create security findings" ON public.security_findings;
CREATE POLICY "Admins and analysts can create security findings"
  ON public.security_findings FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

DROP POLICY IF EXISTS "Users can update security findings" ON public.security_findings;
CREATE POLICY "Admins and analysts can update security findings"
  ON public.security_findings FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- 5. security_test_runs: restrict write to admin/analyst
DROP POLICY IF EXISTS "Users can create security test runs" ON public.security_test_runs;
CREATE POLICY "Admins and analysts can create security test runs"
  ON public.security_test_runs FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

DROP POLICY IF EXISTS "Users can update security test runs" ON public.security_test_runs;
CREATE POLICY "Admins and analysts can update security test runs"
  ON public.security_test_runs FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- 6. deployment_environments: restrict write to admin only
DROP POLICY IF EXISTS "Authenticated users can create environments" ON public.deployment_environments;
CREATE POLICY "Admins can create environments"
  ON public.deployment_environments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can update environments" ON public.deployment_environments;
CREATE POLICY "Admins can update environments"
  ON public.deployment_environments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can delete non-production environments" ON public.deployment_environments;
CREATE POLICY "Admins can delete non-production environments"
  ON public.deployment_environments FOR DELETE TO authenticated
  USING (is_production = false AND public.has_role(auth.uid(), 'admin'::app_role));

-- 7. shadow_ai_discoveries: restrict update to discoverer or admin
DROP POLICY IF EXISTS "Users can update discoveries" ON public.shadow_ai_discoveries;
CREATE POLICY "Discoverer or admin can update discoveries"
  ON public.shadow_ai_discoveries FOR UPDATE TO authenticated
  USING (discovered_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 8. Fix oversight-evidence storage bucket: add path-based ownership
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read evidence" ON storage.objects;
CREATE POLICY "Users can read own evidence files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'oversight-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own evidence files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'oversight-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
