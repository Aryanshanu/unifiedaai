-- =====================================================
-- ATTACH AUDIT LOG TRIGGERS TO GOVERNANCE TABLES
-- =====================================================
-- The log_governance_changes() function exists but no triggers are attached.
-- This migration attaches triggers to all governance-related tables.

-- Drop existing triggers if they exist (to avoid duplicates)
DROP TRIGGER IF EXISTS audit_systems_changes ON systems;
DROP TRIGGER IF EXISTS audit_models_changes ON models;
DROP TRIGGER IF EXISTS audit_system_approvals_changes ON system_approvals;
DROP TRIGGER IF EXISTS audit_evaluation_runs_changes ON evaluation_runs;
DROP TRIGGER IF EXISTS audit_policy_packs_changes ON policy_packs;
DROP TRIGGER IF EXISTS audit_risk_assessments_changes ON risk_assessments;
DROP TRIGGER IF EXISTS audit_impact_assessments_changes ON impact_assessments;
DROP TRIGGER IF EXISTS audit_incidents_changes ON incidents;

-- Create triggers for systems table
CREATE TRIGGER audit_systems_changes
  AFTER INSERT OR UPDATE OR DELETE ON systems
  FOR EACH ROW
  EXECUTE FUNCTION log_governance_changes();

-- Create triggers for models table
CREATE TRIGGER audit_models_changes
  AFTER INSERT OR UPDATE OR DELETE ON models
  FOR EACH ROW
  EXECUTE FUNCTION log_governance_changes();

-- Create triggers for system_approvals table
CREATE TRIGGER audit_system_approvals_changes
  AFTER INSERT OR UPDATE OR DELETE ON system_approvals
  FOR EACH ROW
  EXECUTE FUNCTION log_governance_changes();

-- Create triggers for evaluation_runs table
CREATE TRIGGER audit_evaluation_runs_changes
  AFTER INSERT OR UPDATE OR DELETE ON evaluation_runs
  FOR EACH ROW
  EXECUTE FUNCTION log_governance_changes();

-- Create triggers for policy_packs table
CREATE TRIGGER audit_policy_packs_changes
  AFTER INSERT OR UPDATE OR DELETE ON policy_packs
  FOR EACH ROW
  EXECUTE FUNCTION log_governance_changes();

-- Create triggers for risk_assessments table
CREATE TRIGGER audit_risk_assessments_changes
  AFTER INSERT OR UPDATE OR DELETE ON risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION log_governance_changes();

-- Create triggers for impact_assessments table
CREATE TRIGGER audit_impact_assessments_changes
  AFTER INSERT OR UPDATE OR DELETE ON impact_assessments
  FOR EACH ROW
  EXECUTE FUNCTION log_governance_changes();

-- Create triggers for incidents table
CREATE TRIGGER audit_incidents_changes
  AFTER INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION log_governance_changes();