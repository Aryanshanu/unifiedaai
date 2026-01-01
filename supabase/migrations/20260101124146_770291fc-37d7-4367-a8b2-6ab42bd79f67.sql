-- Secure admin_audit_log: Restrict SELECT to admins only, prevent UPDATE/DELETE

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "audit_log_read_all" ON public.admin_audit_log;
DROP POLICY IF EXISTS "audit_log_read_authenticated" ON public.admin_audit_log;

-- Create admin-only SELECT policy
CREATE POLICY "audit_log_admin_only_read" 
ON public.admin_audit_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Explicitly deny UPDATE (immutability)
CREATE POLICY "audit_log_no_update" 
ON public.admin_audit_log 
FOR UPDATE 
USING (false);

-- Explicitly deny DELETE (immutability)  
CREATE POLICY "audit_log_no_delete" 
ON public.admin_audit_log 
FOR DELETE 
USING (false);