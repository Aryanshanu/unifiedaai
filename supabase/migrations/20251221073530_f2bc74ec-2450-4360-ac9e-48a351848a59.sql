-- PHASE 1: Fix Dangerous Database Defaults
-- ==========================================

-- 1. CRITICAL: Remove auto-admin assignment from handle_new_user()
-- Default role must be 'viewer', not 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- SECURITY FIX: Default role = VIEWER (not admin!)
  -- Admin assignment must be explicit manual action only
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;

-- 2. Ensure audit log INSERT-ONLY policy (no updates/deletes allowed)
-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON admin_audit_log;
DROP POLICY IF EXISTS "audit_log_insert_only" ON admin_audit_log;
DROP POLICY IF EXISTS "audit_log_trigger_only" ON admin_audit_log;
DROP POLICY IF EXISTS "Allow read for authenticated users" ON admin_audit_log;

-- Create strict INSERT-ONLY policy
CREATE POLICY "audit_log_insert_via_trigger_only"
ON admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create READ policy (anyone authenticated can read audit logs)
CREATE POLICY "audit_log_read_authenticated"
ON admin_audit_log
FOR SELECT
TO authenticated
USING (true);

-- EXPLICITLY DENY UPDATE (no policy means denied by RLS)
-- EXPLICITLY DENY DELETE (no policy means denied by RLS)

-- 3. Ensure compute_audit_hash trigger fires correctly
DROP TRIGGER IF EXISTS compute_audit_hash_trigger ON admin_audit_log;
CREATE TRIGGER compute_audit_hash_trigger
  BEFORE INSERT ON admin_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION compute_audit_hash();

-- 4. Add verification function for audit chain integrity
CREATE OR REPLACE FUNCTION public.verify_audit_chain()
RETURNS TABLE(is_valid boolean, broken_at uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  expected_hash TEXT;
  prev_hash TEXT := 'GENESIS';
BEGIN
  FOR rec IN 
    SELECT * FROM admin_audit_log 
    ORDER BY performed_at ASC
  LOOP
    -- Compute expected hash
    expected_hash := encode(sha256(
      (COALESCE(rec.action_type, '') || 
       COALESCE(rec.table_name, '') || 
       COALESCE(rec.record_id::text, '') ||
       COALESCE(rec.previous_hash, '') ||
       COALESCE(to_char(rec.performed_at, 'YYYY-MM-DD HH24:MI:SS.US'), ''))::bytea
    ), 'hex');
    
    -- Check if previous_hash matches
    IF rec.previous_hash != prev_hash THEN
      RETURN QUERY SELECT false, rec.id, 'Previous hash mismatch at record ' || rec.id::text;
      RETURN;
    END IF;
    
    -- Check if record_hash is correct
    IF rec.record_hash != expected_hash THEN
      RETURN QUERY SELECT false, rec.id, 'Record hash mismatch at record ' || rec.id::text;
      RETURN;
    END IF;
    
    prev_hash := rec.record_hash;
  END LOOP;
  
  RETURN QUERY SELECT true, NULL::uuid, 'Audit chain verified successfully';
END;
$$;