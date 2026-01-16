-- =====================================================
-- SECURITY FIX: Error-level RLS Policy Corrections
-- =====================================================

-- ISSUE 1: profiles_rls_overpermissive
-- Drop the overpermissive "Users can view all profiles" policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Ensure proper policy exists (may already exist, so use IF NOT EXISTS pattern)
DO $$
BEGIN
  -- Check if the correct policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile or admin'
  ) THEN
    -- Create the correct policy
    EXECUTE 'CREATE POLICY "Users can view own profile or admin" ON public.profiles 
      FOR SELECT TO authenticated 
      USING (auth.uid() = user_id OR public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- ISSUE 2: insert_policies_no_auth
-- Fix telemetry_logs INSERT policy
DROP POLICY IF EXISTS "System can insert telemetry" ON public.telemetry_logs;

-- Create proper telemetry INSERT policy using existing helper functions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'telemetry_logs' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "System can insert telemetry" ON public.telemetry_logs 
      FOR INSERT TO authenticated 
      WITH CHECK (
        public.is_system_actor() OR 
        public.can_manage_governance() OR
        auth.uid() IS NOT NULL
      )';
  END IF;
END $$;

-- Fix policy_violations INSERT policy  
DROP POLICY IF EXISTS "System can insert policy violations" ON public.policy_violations;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'policy_violations' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "System can insert policy violations" ON public.policy_violations 
      FOR INSERT TO authenticated 
      WITH CHECK (
        public.is_system_actor() OR 
        public.can_manage_governance()
      )';
  END IF;
END $$;

-- Fix rate_limits policies - restrict to admins and system actors only
DROP POLICY IF EXISTS "rate_limits_select" ON public.rate_limits;
DROP POLICY IF EXISTS "rate_limits_insert" ON public.rate_limits;
DROP POLICY IF EXISTS "rate_limits_update" ON public.rate_limits;
DROP POLICY IF EXISTS "rate_limits_delete" ON public.rate_limits;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits' AND table_schema = 'public') THEN
    -- Only admins and system actors can read rate limits
    EXECUTE 'CREATE POLICY "rate_limits_select" ON public.rate_limits 
      FOR SELECT TO authenticated 
      USING (
        public.is_system_actor() OR 
        public.has_role(auth.uid(), ''admin'')
      )';
    
    -- Only system actors can insert rate limits
    EXECUTE 'CREATE POLICY "rate_limits_insert" ON public.rate_limits 
      FOR INSERT TO authenticated 
      WITH CHECK (
        public.is_system_actor()
      )';
    
    -- Only system actors can update rate limits
    EXECUTE 'CREATE POLICY "rate_limits_update" ON public.rate_limits 
      FOR UPDATE TO authenticated 
      USING (public.is_system_actor())
      WITH CHECK (public.is_system_actor())';
    
    -- Only admins can delete rate limits
    EXECUTE 'CREATE POLICY "rate_limits_delete" ON public.rate_limits 
      FOR DELETE TO authenticated 
      USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;