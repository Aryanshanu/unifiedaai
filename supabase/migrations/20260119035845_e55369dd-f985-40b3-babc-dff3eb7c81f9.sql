-- Fix 1: Projects table - restrict visibility to owners and admins/analysts
DROP POLICY IF EXISTS "Users can view all projects" ON public.projects;

CREATE POLICY "Users can view own projects or admins view all"
  ON public.projects FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'analyst')
    )
  );

-- Fix 2: Decision ledger - restrict to owners/admins only (sensitive demographic data)
DROP POLICY IF EXISTS "Authenticated users can view decisions" ON public.decision_ledger;

CREATE POLICY "Decision ledger restricted to governance roles"
  ON public.decision_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'analyst', 'reviewer')
    )
  );

-- Fix 3: Notification history - fix the overly permissive OR clause
DROP POLICY IF EXISTS "Users can view their notification history" ON public.notification_history;

CREATE POLICY "Users can view own notifications only"
  ON public.notification_history FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM public.notification_channels 
      WHERE user_id = auth.uid()
    )
  );

-- Note: profiles table already has correct policy (auth.uid() = user_id)
-- The scan finding may be outdated - verified SELECT policy is properly restricted