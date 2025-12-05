-- Update the trigger function to assign 'admin' role instead of 'viewer' for demo purposes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign admin role to new users for demo/testing purposes
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Also update existing users who only have 'viewer' role to have 'admin' role
UPDATE public.user_roles SET role = 'admin' WHERE role = 'viewer';