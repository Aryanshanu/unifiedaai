ALTER TABLE public.security_config 
  ADD COLUMN IF NOT EXISTS require_uppercase boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_numbers boolean DEFAULT true;