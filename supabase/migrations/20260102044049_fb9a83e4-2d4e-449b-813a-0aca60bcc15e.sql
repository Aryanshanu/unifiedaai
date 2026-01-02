-- Fix SECURITY DEFINER function: lock_system needs explicit admin role check
-- Currently unlock_system has admin check but lock_system does not

CREATE OR REPLACE FUNCTION public.lock_system(p_system_id uuid, p_reason text DEFAULT 'Locked by governance policy'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY FIX: Add explicit admin role check
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can lock systems';
  END IF;
  
  UPDATE systems 
  SET 
    registry_locked = true,
    locked_at = now(),
    locked_by = auth.uid(),
    lock_reason = p_reason,
    deployment_status = 'blocked'
  WHERE id = p_system_id;
  
  INSERT INTO admin_audit_log (action_type, table_name, record_id, performed_by, change_summary)
  VALUES ('LOCK', 'systems', p_system_id, auth.uid(), p_reason);
END;
$$;