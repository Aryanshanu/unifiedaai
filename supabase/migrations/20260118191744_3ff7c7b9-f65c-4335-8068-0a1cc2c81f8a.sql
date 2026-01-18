-- =====================================================
-- SECURITY FIX: Address 3 error-level security issues
-- =====================================================

-- =====================================================
-- FIX 1: Security Definer View (bronze_data)
-- The bronze_data view bypasses RLS on dq_data table
-- Solution: Drop view and recreate with SECURITY INVOKER
-- =====================================================

-- Drop the existing view
DROP VIEW IF EXISTS public.bronze_data;

-- Recreate view with SECURITY INVOKER (default, enforces RLS of querying user)
CREATE VIEW public.bronze_data 
WITH (security_invoker = on)
AS 
SELECT 
    id,
    upload_id,
    row_index,
    raw_data,
    record_hash,
    created_at,
    dataset_id
FROM dq_data;

-- Grant appropriate permissions
GRANT SELECT ON public.bronze_data TO authenticated;
GRANT SELECT ON public.bronze_data TO service_role;

-- Revoke from anon (raw data should not be publicly accessible)
REVOKE ALL ON public.bronze_data FROM anon;

-- =====================================================
-- FIX 2: Profiles Table - Remove duplicate/overpermissive policies
-- Currently has 2 duplicate SELECT policies
-- =====================================================

-- Drop duplicate policies
DROP POLICY IF EXISTS "Users can view own profile or admin" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;

-- Create single strict policy - users can only see their own profile
-- Admins can view all profiles via has_role function
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FIX 3: Datasets Table - Restrict public read access
-- Currently datasets_read_all allows ANY authenticated user to see ALL datasets
-- Solution: Restrict to owner, assigned analysts, or admins only
-- =====================================================

-- Drop the overly permissive read policy
DROP POLICY IF EXISTS "datasets_read_all" ON public.datasets;

-- Create restrictive policy - only owners, admins, or analysts can view datasets
CREATE POLICY "datasets_read_restricted"
ON public.datasets
FOR SELECT
TO authenticated
USING (
  -- Owner can view their own datasets
  owner_id = auth.uid()
  -- Admins and analysts can view all datasets (governance requirement)
  OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
  -- Allow viewing datasets where owner_id is NULL (legacy/system datasets)
  -- but only for authenticated users with analyst or admin role
  OR (owner_id IS NULL AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role]))
);

-- =====================================================
-- COMMENT: Security improvements applied
-- =====================================================
COMMENT ON VIEW public.bronze_data IS 'View over dq_data with SECURITY INVOKER - enforces RLS of querying user';
COMMENT ON POLICY "profiles_select_own_or_admin" ON public.profiles IS 'Users can view only their own profile, admins can view all';
COMMENT ON POLICY "datasets_read_restricted" ON public.datasets IS 'Datasets visible to owners, admins, and analysts only - not all authenticated users';