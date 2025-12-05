-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'reviewer', 'analyst', 'viewer');

-- Create enum for model status
CREATE TYPE public.model_status AS ENUM ('draft', 'active', 'deprecated', 'archived');

-- Create enum for evaluation status
CREATE TYPE public.evaluation_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Create enum for severity levels
CREATE TYPE public.severity_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for incident status
CREATE TYPE public.incident_status AS ENUM ('open', 'investigating', 'mitigating', 'resolved');

-- Create enum for review status
CREATE TYPE public.review_status AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'escalated');

-- Create enum for control status
CREATE TYPE public.control_status AS ENUM ('not_started', 'in_progress', 'compliant', 'non_compliant', 'not_applicable');

-- Create enum for policy status
CREATE TYPE public.policy_status AS ENUM ('draft', 'active', 'disabled');

-- Create enum for campaign status
CREATE TYPE public.campaign_status AS ENUM ('draft', 'running', 'completed', 'paused');

-- =====================
-- USER PROFILES & ROLES
-- =====================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- =====================
-- MODELS & REGISTRY
-- =====================

CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  model_type TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  status model_status NOT NULL DEFAULT 'draft',
  provider TEXT,
  use_case TEXT,
  endpoint TEXT,
  owner_id UUID REFERENCES auth.users(id),
  fairness_score NUMERIC(5,2),
  robustness_score NUMERIC(5,2),
  privacy_score NUMERIC(5,2),
  toxicity_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL,
  changelog TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- EVALUATIONS
-- =====================

CREATE TABLE public.evaluation_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  test_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  suite_id UUID REFERENCES public.evaluation_suites(id) ON DELETE SET NULL,
  status evaluation_status NOT NULL DEFAULT 'pending',
  fairness_score NUMERIC(5,2),
  robustness_score NUMERIC(5,2),
  privacy_score NUMERIC(5,2),
  toxicity_score NUMERIC(5,2),
  factuality_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  details JSONB DEFAULT '{}',
  triggered_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.evaluation_runs(id) ON DELETE CASCADE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(10,4) NOT NULL,
  threshold NUMERIC(10,4),
  passed BOOLEAN NOT NULL DEFAULT false,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- OBSERVABILITY & DRIFT
-- =====================

CREATE TABLE public.telemetry_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms NUMERIC(10,2),
  error_rate NUMERIC(5,4),
  p95_latency_ms NUMERIC(10,2),
  p99_latency_ms NUMERIC(10,2),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.drift_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL,
  drift_type TEXT NOT NULL,
  drift_value NUMERIC(10,4) NOT NULL,
  severity severity_level NOT NULL DEFAULT 'medium',
  status incident_status NOT NULL DEFAULT 'open',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity severity_level NOT NULL DEFAULT 'medium',
  status incident_status NOT NULL DEFAULT 'open',
  assignee_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- =====================
-- GOVERNANCE & COMPLIANCE
-- =====================

CREATE TABLE public.control_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  description TEXT,
  total_controls INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID REFERENCES public.control_frameworks(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity severity_level NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.control_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  control_id UUID REFERENCES public.controls(id) ON DELETE CASCADE NOT NULL,
  status control_status NOT NULL DEFAULT 'not_started',
  evidence TEXT,
  notes TEXT,
  assessed_by UUID REFERENCES auth.users(id),
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (model_id, control_id)
);

CREATE TABLE public.attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  framework_id UUID REFERENCES public.control_frameworks(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  status review_status NOT NULL DEFAULT 'pending',
  document_url TEXT,
  signed_by UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- HITL (HUMAN-IN-THE-LOOP)
-- =====================

CREATE TABLE public.review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_type TEXT NOT NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  context JSONB DEFAULT '{}',
  severity severity_level NOT NULL DEFAULT 'medium',
  status review_status NOT NULL DEFAULT 'pending',
  assignee_id UUID REFERENCES auth.users(id),
  sla_deadline TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.review_queue(id) ON DELETE CASCADE NOT NULL,
  decision TEXT NOT NULL,
  rationale TEXT,
  conditions TEXT,
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- POLICY & RED TEAM
-- =====================

CREATE TABLE public.policy_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB DEFAULT '[]',
  status policy_status NOT NULL DEFAULT 'draft',
  version TEXT NOT NULL DEFAULT '1.0',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.red_team_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  attack_types JSONB DEFAULT '[]',
  status campaign_status NOT NULL DEFAULT 'draft',
  coverage NUMERIC(5,2) DEFAULT 0,
  findings_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.policy_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  policy_id UUID REFERENCES public.policy_packs(id) ON DELETE SET NULL,
  violation_type TEXT NOT NULL,
  severity severity_level NOT NULL DEFAULT 'medium',
  details JSONB DEFAULT '{}',
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- KNOWLEDGE GRAPH
-- =====================

CREATE TABLE public.kg_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  label TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.kg_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id UUID REFERENCES public.kg_nodes(id) ON DELETE CASCADE NOT NULL,
  target_node_id UUID REFERENCES public.kg_nodes(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- ENABLE RLS ON ALL TABLES
-- =====================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_team_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_edges ENABLE ROW LEVEL SECURITY;

-- =====================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECKING
-- =====================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- =====================
-- RLS POLICIES
-- =====================

-- Profiles: Users can view all profiles, edit own
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User Roles: Only admins can manage roles, users can view own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Models: All authenticated users can view, admins/analysts can manage
CREATE POLICY "Authenticated users can view models" ON public.models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and analysts can manage models" ON public.models FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- Model Versions: Same as models
CREATE POLICY "Authenticated users can view model versions" ON public.model_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and analysts can manage model versions" ON public.model_versions FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- Evaluation Suites: All can view, admins/analysts can manage
CREATE POLICY "Authenticated users can view evaluation suites" ON public.evaluation_suites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and analysts can manage evaluation suites" ON public.evaluation_suites FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- Evaluation Runs: All can view, admins/analysts can manage
CREATE POLICY "Authenticated users can view evaluation runs" ON public.evaluation_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and analysts can manage evaluation runs" ON public.evaluation_runs FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- Evaluation Results: All can view
CREATE POLICY "Authenticated users can view evaluation results" ON public.evaluation_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and analysts can manage evaluation results" ON public.evaluation_results FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- Telemetry: All can view
CREATE POLICY "Authenticated users can view telemetry" ON public.telemetry_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert telemetry" ON public.telemetry_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Drift Alerts: All can view, admins/analysts can manage
CREATE POLICY "Authenticated users can view drift alerts" ON public.drift_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and analysts can manage drift alerts" ON public.drift_alerts FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- Incidents: All can view, admins/analysts can manage
CREATE POLICY "Authenticated users can view incidents" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and analysts can manage incidents" ON public.incidents FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- Control Frameworks: All can view, admins can manage
CREATE POLICY "Authenticated users can view control frameworks" ON public.control_frameworks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage control frameworks" ON public.control_frameworks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Controls: All can view, admins can manage
CREATE POLICY "Authenticated users can view controls" ON public.controls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage controls" ON public.controls FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Control Assessments: All can view, admins/analysts/reviewers can manage
CREATE POLICY "Authenticated users can view control assessments" ON public.control_assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Privileged users can manage control assessments" ON public.control_assessments FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst', 'reviewer']::app_role[]));

-- Attestations: All can view, admins can manage
CREATE POLICY "Authenticated users can view attestations" ON public.attestations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage attestations" ON public.attestations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Review Queue: All can view, admins/reviewers can manage
CREATE POLICY "Authenticated users can view review queue" ON public.review_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Privileged users can manage review queue" ON public.review_queue FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'reviewer']::app_role[]));

-- Decisions: All can view, reviewers can create
CREATE POLICY "Authenticated users can view decisions" ON public.decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reviewers can create decisions" ON public.decisions FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'reviewer']::app_role[]));

-- Policy Packs: All can view, admins can manage
CREATE POLICY "Authenticated users can view policy packs" ON public.policy_packs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage policy packs" ON public.policy_packs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Red Team Campaigns: All can view, admins/analysts can manage
CREATE POLICY "Authenticated users can view red team campaigns" ON public.red_team_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Privileged users can manage red team campaigns" ON public.red_team_campaigns FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- Policy Violations: All can view
CREATE POLICY "Authenticated users can view policy violations" ON public.policy_violations FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert policy violations" ON public.policy_violations FOR INSERT TO authenticated WITH CHECK (true);

-- Knowledge Graph Nodes: All can view, admins/analysts can manage
CREATE POLICY "Authenticated users can view kg nodes" ON public.kg_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Privileged users can manage kg nodes" ON public.kg_nodes FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- Knowledge Graph Edges: All can view, admins/analysts can manage
CREATE POLICY "Authenticated users can view kg edges" ON public.kg_edges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Privileged users can manage kg edges" ON public.kg_edges FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- =====================
-- TRIGGERS FOR AUTO-PROFILE CREATION
-- =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default viewer role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- UPDATED_AT TRIGGER
-- =====================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON public.models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_evaluation_suites_updated_at BEFORE UPDATE ON public.evaluation_suites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_control_frameworks_updated_at BEFORE UPDATE ON public.control_frameworks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_control_assessments_updated_at BEFORE UPDATE ON public.control_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_review_queue_updated_at BEFORE UPDATE ON public.review_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policy_packs_updated_at BEFORE UPDATE ON public.policy_packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- INDEXES FOR PERFORMANCE
-- =====================

CREATE INDEX idx_models_status ON public.models(status);
CREATE INDEX idx_models_owner ON public.models(owner_id);
CREATE INDEX idx_evaluation_runs_model ON public.evaluation_runs(model_id);
CREATE INDEX idx_evaluation_runs_status ON public.evaluation_runs(status);
CREATE INDEX idx_telemetry_model_timestamp ON public.telemetry_logs(model_id, timestamp DESC);
CREATE INDEX idx_drift_alerts_model ON public.drift_alerts(model_id);
CREATE INDEX idx_drift_alerts_status ON public.drift_alerts(status);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_severity ON public.incidents(severity);
CREATE INDEX idx_review_queue_status ON public.review_queue(status);
CREATE INDEX idx_review_queue_assignee ON public.review_queue(assignee_id);
CREATE INDEX idx_kg_nodes_entity ON public.kg_nodes(entity_type, entity_id);
CREATE INDEX idx_kg_edges_source ON public.kg_edges(source_node_id);
CREATE INDEX idx_kg_edges_target ON public.kg_edges(target_node_id);