-- PHASE 1: Fix Profiles RLS Policy (CRITICAL)
-- Drop the overly permissive policy that allows ANY user to view ALL profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restricted policy: users can only view their own profile OR admins can view all
CREATE POLICY "Users can view own profile or admin can view all" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- PHASE 2: Fix Request Logs RLS Policy
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view request logs" ON public.request_logs;

-- Create restricted policy: only system owners or admins can view request logs
CREATE POLICY "System owners or admins can view request logs" ON public.request_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.systems s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = request_logs.system_id
      AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- PHASE 3: Ensure cleanup function exists and is properly defined
-- This function was created in previous migration, just ensure it's complete
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete request_logs older than 90 days
  DELETE FROM public.request_logs WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete telemetry_logs older than 90 days
  DELETE FROM public.telemetry_logs WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Delete app_errors older than 90 days
  DELETE FROM public.app_errors WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Archive resolved incidents older than 180 days
  UPDATE public.incidents 
  SET archived_at = NOW()
  WHERE created_at < NOW() - INTERVAL '180 days' 
  AND status = 'resolved'
  AND archived_at IS NULL;
END;
$$;