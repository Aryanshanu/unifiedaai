-- PHASE 1: CRITICAL SECURITY FIXES

-- 1.1 Fix Profiles Table RLS Policy (restrict to own profile or admin)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 1.2 Add archived columns to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID;

-- Create index for faster incident filtering
CREATE INDEX IF NOT EXISTS idx_incidents_status_severity 
ON public.incidents(status, severity);

CREATE INDEX IF NOT EXISTS idx_incidents_archived
ON public.incidents(archived_at) WHERE archived_at IS NOT NULL;

-- 1.3 Create log retention cleanup function (90-day GDPR compliance)
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

-- 1.4 Fix request_logs RLS to restrict to system owners or admins
DROP POLICY IF EXISTS "Users can view request logs" ON public.request_logs;
DROP POLICY IF EXISTS "Authenticated users can view request logs" ON public.request_logs;

CREATE POLICY "Users can view own system request logs" ON public.request_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.systems s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = request_logs.system_id
      AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );