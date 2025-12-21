-- ============================================
-- PHASE 1: GOVERNANCE FOUNDATION
-- Separation of Duties, Immutable Audit Log, Terminal LOCKED State
-- ============================================

-- 1. SEPARATION OF DUTIES (SoD) ENFORCEMENT
-- Constraint: Requester cannot be their own approver
ALTER TABLE system_approvals 
ADD CONSTRAINT sod_requester_not_approver 
CHECK (requested_by IS DISTINCT FROM approver_id);

-- 2. IMMUTABLE ADMIN AUDIT LOG
-- Append-only table for all administrative actions
CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOCK', 'UNLOCK')),
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  session_id text,
  change_summary text
);

-- Make it IMMUTABLE: Only INSERT and SELECT allowed, no UPDATE or DELETE
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_insert_only" ON admin_audit_log
FOR INSERT WITH CHECK (true);

CREATE POLICY "audit_log_read_all" ON admin_audit_log
FOR SELECT USING (true);

-- Index for efficient querying
CREATE INDEX idx_audit_log_table_record ON admin_audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_performed_at ON admin_audit_log(performed_at DESC);
CREATE INDEX idx_audit_log_performed_by ON admin_audit_log(performed_by);

-- 3. TRIGGER FUNCTION FOR AUTOMATIC AUDIT LOGGING
CREATE OR REPLACE FUNCTION log_governance_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_summary_text text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    change_summary_text := 'Created new record';
  ELSIF TG_OP = 'DELETE' THEN
    change_summary_text := 'Deleted record';
  ELSIF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'systems' THEN
      IF OLD.deployment_status IS DISTINCT FROM NEW.deployment_status THEN
        change_summary_text := format('Deployment status: %s → %s', OLD.deployment_status, NEW.deployment_status);
      ELSIF OLD.registry_locked IS DISTINCT FROM NEW.registry_locked THEN
        change_summary_text := format('Registry locked: %s → %s', OLD.registry_locked, NEW.registry_locked);
      ELSE
        change_summary_text := 'System configuration updated';
      END IF;
    ELSIF TG_TABLE_NAME = 'system_approvals' THEN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        change_summary_text := format('Approval status: %s → %s', OLD.status, NEW.status);
      ELSE
        change_summary_text := 'Approval record updated';
      END IF;
    ELSIF TG_TABLE_NAME = 'models' THEN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        change_summary_text := format('Model status: %s → %s', OLD.status, NEW.status);
      ELSE
        change_summary_text := 'Model configuration updated';
      END IF;
    ELSE
      change_summary_text := 'Record updated';
    END IF;
  END IF;

  INSERT INTO admin_audit_log (
    action_type, 
    table_name, 
    record_id, 
    old_values, 
    new_values, 
    performed_by,
    change_summary
  ) VALUES (
    TG_OP, 
    TG_TABLE_NAME, 
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid(),
    change_summary_text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. TERMINAL LOCKED STATE
-- Add registry_locked flag for permanent lockout (Point of No Return)
ALTER TABLE systems ADD COLUMN registry_locked boolean NOT NULL DEFAULT false;
ALTER TABLE systems ADD COLUMN locked_at timestamptz;
ALTER TABLE systems ADD COLUMN locked_by uuid;
ALTER TABLE systems ADD COLUMN lock_reason text;

-- RLS: Locked systems cannot be updated except by admin for unlock
CREATE POLICY "locked_systems_immutable" ON systems
FOR UPDATE USING (
  NOT registry_locked 
  OR has_role(auth.uid(), 'admin')
);

-- 5. ATTACH AUDIT TRIGGERS TO CRITICAL GOVERNANCE TABLES
CREATE TRIGGER audit_systems_changes
AFTER INSERT OR UPDATE OR DELETE ON systems
FOR EACH ROW EXECUTE FUNCTION log_governance_changes();

CREATE TRIGGER audit_system_approvals_changes
AFTER INSERT OR UPDATE ON system_approvals
FOR EACH ROW EXECUTE FUNCTION log_governance_changes();

CREATE TRIGGER audit_models_changes
AFTER INSERT OR UPDATE OR DELETE ON models
FOR EACH ROW EXECUTE FUNCTION log_governance_changes();

CREATE TRIGGER audit_risk_assessments_changes
AFTER INSERT OR UPDATE OR DELETE ON risk_assessments
FOR EACH ROW EXECUTE FUNCTION log_governance_changes();

CREATE TRIGGER audit_evaluation_runs_changes
AFTER INSERT OR UPDATE ON evaluation_runs
FOR EACH ROW EXECUTE FUNCTION log_governance_changes();

-- 6. HELPER FUNCTIONS FOR LOCK/UNLOCK
CREATE OR REPLACE FUNCTION lock_system(
  p_system_id uuid,
  p_reason text DEFAULT 'Locked by governance policy'
)
RETURNS void AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION unlock_system(
  p_system_id uuid,
  p_justification text
)
RETURNS void AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can unlock systems';
  END IF;
  
  IF p_justification IS NULL OR length(p_justification) < 20 THEN
    RAISE EXCEPTION 'Justification must be at least 20 characters';
  END IF;
  
  UPDATE systems 
  SET 
    registry_locked = false,
    deployment_status = 'draft'
  WHERE id = p_system_id;
  
  INSERT INTO admin_audit_log (action_type, table_name, record_id, performed_by, change_summary)
  VALUES ('UNLOCK', 'systems', p_system_id, auth.uid(), 'ADMIN UNLOCK: ' || p_justification);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;