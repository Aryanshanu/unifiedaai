-- =====================================================
-- ATTACH AUDIT LOG TRIGGERS TO GOVERNANCE TABLES
-- Ensures admin_audit_log is populated with governance changes
-- =====================================================

-- Trigger for systems table (already has function, just needs trigger)
DROP TRIGGER IF EXISTS audit_systems_changes ON public.systems;
CREATE TRIGGER audit_systems_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.systems
  FOR EACH ROW EXECUTE FUNCTION public.log_governance_changes();

-- Trigger for models table
DROP TRIGGER IF EXISTS audit_models_changes ON public.models;
CREATE TRIGGER audit_models_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.models
  FOR EACH ROW EXECUTE FUNCTION public.log_governance_changes();

-- Trigger for system_approvals table
DROP TRIGGER IF EXISTS audit_system_approvals_changes ON public.system_approvals;
CREATE TRIGGER audit_system_approvals_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.system_approvals
  FOR EACH ROW EXECUTE FUNCTION public.log_governance_changes();

-- Trigger for evaluation_runs table
DROP TRIGGER IF EXISTS audit_evaluation_runs_changes ON public.evaluation_runs;
CREATE TRIGGER audit_evaluation_runs_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.evaluation_runs
  FOR EACH ROW EXECUTE FUNCTION public.log_governance_changes();

-- Trigger for policy_packs table
DROP TRIGGER IF EXISTS audit_policy_packs_changes ON public.policy_packs;
CREATE TRIGGER audit_policy_packs_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.policy_packs
  FOR EACH ROW EXECUTE FUNCTION public.log_governance_changes();

-- Trigger for risk_assessments table
DROP TRIGGER IF EXISTS audit_risk_assessments_changes ON public.risk_assessments;
CREATE TRIGGER audit_risk_assessments_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.log_governance_changes();

-- Trigger for impact_assessments table
DROP TRIGGER IF EXISTS audit_impact_assessments_changes ON public.impact_assessments;
CREATE TRIGGER audit_impact_assessments_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.impact_assessments
  FOR EACH ROW EXECUTE FUNCTION public.log_governance_changes();

-- Trigger for incidents table
DROP TRIGGER IF EXISTS audit_incidents_changes ON public.incidents;
CREATE TRIGGER audit_incidents_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.log_governance_changes();