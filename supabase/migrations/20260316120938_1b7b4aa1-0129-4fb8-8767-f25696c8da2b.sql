
CREATE OR REPLACE FUNCTION public.assign_own_role(p_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete any existing roles for this user
  DELETE FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Insert the new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), p_role);
END;
$$;
