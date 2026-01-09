-- Phase 1 Fixes: Security Functions and RLS Policies
-- =====================================================

-- 1. Create security definer function to check system-level access
CREATE OR REPLACE FUNCTION public.is_system_actor()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role has full access (edge functions use this)
  RETURN current_setting('role', true) = 'service_role';
END;
$$;

-- 2. Create function to check governance management permissions
CREATE OR REPLACE FUNCTION public.can_manage_governance()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyst');
$$;

-- 3. Fix RLS policies for data_contract_violations
-- Drop existing permissive policies
DROP POLICY IF EXISTS "System can create violations" ON public.data_contract_violations;
DROP POLICY IF EXISTS "Authenticated users can update violations" ON public.data_contract_violations;

-- Create secure policies
CREATE POLICY "System or admin can create violations"
  ON public.data_contract_violations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_system_actor() OR 
    public.can_manage_governance()
  );

CREATE POLICY "Admin or analyst can update violations"
  ON public.data_contract_violations FOR UPDATE
  TO authenticated
  USING (public.can_manage_governance());

-- 4. Fix RLS policies for data_drift_events
-- Drop existing permissive policies  
DROP POLICY IF EXISTS "System can create drift events" ON public.data_drift_events;
DROP POLICY IF EXISTS "Authenticated users can update drift events" ON public.data_drift_events;

-- Create secure policies
CREATE POLICY "System or admin can create drift events"
  ON public.data_drift_events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_system_actor() OR 
    public.can_manage_governance()
  );

CREATE POLICY "Admin or analyst can update drift events"
  ON public.data_drift_events FOR UPDATE
  TO authenticated
  USING (public.can_manage_governance());

-- 5. Strengthen hash chain trigger with metric fingerprint
CREATE OR REPLACE FUNCTION public.compute_quality_run_hash()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash TEXT;
  hash_input TEXT;
BEGIN
  -- Get previous hash for this dataset (append-only chain)
  SELECT record_hash INTO prev_hash
  FROM public.dataset_quality_runs
  WHERE dataset_id = NEW.dataset_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  NEW.previous_hash := prev_hash;
  
  -- Enhanced hash input with metric fingerprint (audit-grade)
  -- Includes: dataset_id, run_type, all metric details, evidence_hash, previous_hash, timestamp
  hash_input := COALESCE(NEW.dataset_id::text, '') || 
                COALESCE(NEW.run_type, '') ||
                COALESCE(NEW.completeness_score::text, '') ||
                COALESCE(NEW.validity_score::text, '') ||
                COALESCE(NEW.uniqueness_score::text, '') ||
                COALESCE(NEW.freshness_score::text, '') ||
                COALESCE(NEW.metric_details::text, '') ||
                COALESCE(NEW.evidence_hash, '') ||
                COALESCE(NEW.previous_hash, 'GENESIS') ||
                COALESCE(NEW.created_at::text, '');
  
  NEW.record_hash := encode(sha256(hash_input::bytea), 'hex');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;