-- Fix 1: Restrict models table SELECT to owners and admins only (prevents API token exposure)
DROP POLICY IF EXISTS "Authenticated users can view models" ON public.models;

CREATE POLICY "Users can view their own models or admins can view all"
ON public.models
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
);

-- Fix 2: Restrict systems table SELECT to owners and admins only (prevents encrypted token exposure)
DROP POLICY IF EXISTS "Users can view all systems" ON public.systems;

CREATE POLICY "Users can view their own systems or admins can view all"
ON public.systems
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
);