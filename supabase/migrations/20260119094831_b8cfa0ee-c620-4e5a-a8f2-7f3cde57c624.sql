-- Fix warn-level security issues:
-- 1. Add admin check to verify_audit_chain() function
-- 2. Fix overly permissive RLS policies with USING (true) or WITH CHECK (true)

-- ==============================================
-- 1. Fix verify_audit_chain() - Add admin role check
-- ==============================================
CREATE OR REPLACE FUNCTION public.verify_audit_chain()
RETURNS TABLE(is_valid boolean, broken_at uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  expected_hash TEXT;
  prev_hash TEXT := 'GENESIS';
BEGIN
  -- SECURITY FIX: Require admin role to verify audit chain
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required to verify audit chain';
  END IF;

  FOR rec IN 
    SELECT * FROM admin_audit_log 
    ORDER BY performed_at ASC
  LOOP
    -- Compute expected hash
    expected_hash := encode(sha256(
      (COALESCE(rec.action_type, '') || 
       COALESCE(rec.table_name, '') || 
       COALESCE(rec.record_id::text, '') ||
       COALESCE(rec.previous_hash, '') ||
       COALESCE(to_char(rec.performed_at, 'YYYY-MM-DD HH24:MI:SS.US'), ''))::bytea
    ), 'hex');
    
    -- Check if previous_hash matches
    IF rec.previous_hash != prev_hash THEN
      RETURN QUERY SELECT false, rec.id, 'Previous hash mismatch at record ' || rec.id::text;
      RETURN;
    END IF;
    
    -- Check if record_hash is correct
    IF rec.record_hash != expected_hash THEN
      RETURN QUERY SELECT false, rec.id, 'Record hash mismatch at record ' || rec.id::text;
      RETURN;
    END IF;
    
    prev_hash := rec.record_hash;
  END LOOP;
  
  RETURN QUERY SELECT true, NULL::uuid, 'Audit chain verified successfully';
END;
$$;

-- ==============================================
-- 2. Fix overly permissive RLS policies
-- ==============================================

-- 2.1 Fix admin_audit_log INSERT policy (system/trigger only)
DROP POLICY IF EXISTS "audit_log_insert_via_trigger_only" ON public.admin_audit_log;
CREATE POLICY "audit_log_insert_via_trigger_only" 
  ON public.admin_audit_log 
  FOR INSERT 
  WITH CHECK (
    public.is_system_actor()
  );

-- 2.2 Fix app_errors INSERT policy (authenticated users only)
DROP POLICY IF EXISTS "Anyone can insert app errors" ON public.app_errors;
CREATE POLICY "Authenticated users can insert app errors" 
  ON public.app_errors 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

-- 2.3 Fix audit_report_ledger INSERT policy (system/admin only)
DROP POLICY IF EXISTS "System can insert audit reports" ON public.audit_report_ledger;
CREATE POLICY "System or admin can insert audit reports" 
  ON public.audit_report_ledger 
  FOR INSERT 
  WITH CHECK (
    public.is_system_actor() OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 2.4 Fix dq_dashboard_assets INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert dq_dashboard_assets" ON public.dq_dashboard_assets;
CREATE POLICY "Users can insert dq_dashboard_assets for their datasets" 
  ON public.dq_dashboard_assets 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    public.is_system_actor() OR
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dq_dashboard_assets.dataset_id
      AND (d.owner_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]))
    )
  );

-- 2.5 Fix dq_incidents INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert dq_incidents" ON public.dq_incidents;
CREATE POLICY "Users can insert dq_incidents for their datasets" 
  ON public.dq_incidents 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    public.is_system_actor() OR
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dq_incidents.dataset_id
      AND (d.owner_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]))
    )
  );

-- 2.6 Fix dq_incidents UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update dq_incidents" ON public.dq_incidents;
CREATE POLICY "Users can update dq_incidents for their datasets" 
  ON public.dq_incidents 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dq_incidents.dataset_id
      AND (d.owner_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]))
    )
  );

-- 2.7 Fix dq_profiles INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert dq_profiles" ON public.dq_profiles;
CREATE POLICY "Users can insert dq_profiles for their datasets" 
  ON public.dq_profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    public.is_system_actor() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dq_profiles.dataset_id
      AND (d.owner_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]))
    )
  );

-- 2.8 Fix dq_rule_executions INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert dq_rule_executions" ON public.dq_rule_executions;
CREATE POLICY "Users can insert dq_rule_executions for their datasets" 
  ON public.dq_rule_executions 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    public.is_system_actor() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dq_rule_executions.dataset_id
      AND (d.owner_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]))
    )
  );

-- 2.9 Fix dq_rules INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert dq_rules" ON public.dq_rules;
CREATE POLICY "Users can insert dq_rules for their datasets" 
  ON public.dq_rules 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    public.is_system_actor() OR
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dq_rules.dataset_id
      AND (d.owner_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]))
    )
  );

-- 2.10 Fix dq_rules UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update dq_rules" ON public.dq_rules;
CREATE POLICY "Users can update dq_rules for their datasets" 
  ON public.dq_rules 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dq_rules.dataset_id
      AND (d.owner_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]))
    )
  );

-- 2.11 Fix gold_quality_metrics INSERT policy
DROP POLICY IF EXISTS "System can insert gold metrics" ON public.gold_quality_metrics;
CREATE POLICY "System or owner can insert gold metrics" 
  ON public.gold_quality_metrics 
  FOR INSERT 
  WITH CHECK (
    public.is_system_actor() OR
    user_id = auth.uid() OR
    public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[])
  );

-- 2.12 Fix notification_history INSERT policy (no user_id column - use channel ownership)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notification_history;
CREATE POLICY "System or channel owner can insert notifications" 
  ON public.notification_history 
  FOR INSERT 
  WITH CHECK (
    public.is_system_actor() OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.notification_channels nc
      WHERE nc.id = notification_history.channel_id
      AND nc.user_id = auth.uid()
    )
  );

-- 2.13 Fix quality_issues INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert issues" ON public.quality_issues;
CREATE POLICY "Users can insert quality issues for their uploads" 
  ON public.quality_issues 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    public.is_system_actor() OR
    EXISTS (
      SELECT 1 FROM public.data_uploads u
      WHERE u.id = quality_issues.upload_id
      AND (u.user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]))
    )
  );

-- 2.14 Fix rai_composite_scores INSERT policy
DROP POLICY IF EXISTS "System can insert composite scores" ON public.rai_composite_scores;
CREATE POLICY "System or admin can insert composite scores" 
  ON public.rai_composite_scores 
  FOR INSERT 
  WITH CHECK (
    public.is_system_actor() OR
    public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[])
  );

-- 2.15 Fix risk_metrics INSERT policy
DROP POLICY IF EXISTS "System can insert risk metrics" ON public.risk_metrics;
CREATE POLICY "System or admin can insert risk metrics" 
  ON public.risk_metrics 
  FOR INSERT 
  WITH CHECK (
    public.is_system_actor() OR
    public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[])
  );