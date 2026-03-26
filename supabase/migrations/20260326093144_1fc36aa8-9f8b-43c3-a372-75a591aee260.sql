-- Restore superadmin passthrough in role checks so hidden admin can access all governed data
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role = 'superadmin'::public.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = ANY(_roles) OR role = 'superadmin'::public.app_role)
  )
$$;

-- Fix policies that bypass the helper functions and directly inspect user_roles
DROP POLICY IF EXISTS "Users can view own projects or admins view all" ON public.projects;
CREATE POLICY "Users can view own projects or privileged users view all"
ON public.projects
FOR SELECT
TO public
USING (
  owner_id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'analyst'::public.app_role])
);

DROP POLICY IF EXISTS "Admins can view app errors" ON public.app_errors;
CREATE POLICY "Privileged users can view app errors"
ON public.app_errors
FOR SELECT
TO public
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Decision ledger restricted to governance roles" ON public.decision_ledger;
CREATE POLICY "Decision ledger restricted to governance roles"
ON public.decision_ledger
FOR SELECT
TO public
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'analyst'::public.app_role, 'reviewer'::public.app_role]));