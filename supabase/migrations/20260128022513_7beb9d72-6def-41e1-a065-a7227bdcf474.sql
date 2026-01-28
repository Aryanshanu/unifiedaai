-- Core Security Module Tables

-- Security test execution runs (must be created first for FK reference)
CREATE TABLE public.security_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('pentesting', 'jailbreak', 'threat_model')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  tests_total INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_failed INTEGER DEFAULT 0,
  coverage_percentage NUMERIC,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  triggered_by UUID,
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security findings from pentesting/jailbreak scans
CREATE TABLE public.security_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID REFERENCES public.security_test_runs(id) ON DELETE SET NULL,
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  vulnerability_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'mitigated', 'false_positive')),
  mitigation TEXT,
  exploitability_score INTEGER,
  business_impact_score INTEGER,
  fractal_risk_index NUMERIC,
  evidence JSONB DEFAULT '{}',
  framework_mappings JSONB DEFAULT '{}',
  owasp_category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Attack pattern library
CREATE TABLE public.attack_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  owasp_category TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  attack_payload TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  success_rate NUMERIC DEFAULT 0,
  first_seen TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Automated security test cases
CREATE TABLE public.automated_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL CHECK (module IN ('pentesting', 'jailbreak')),
  code TEXT NOT NULL UNIQUE,
  owasp_category TEXT,
  objective TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  expected_secure_behavior TEXT NOT NULL,
  attack_objective TEXT[],
  conversation_script JSONB,
  detection_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Threat models
CREATE TABLE public.threat_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  framework TEXT CHECK (framework IN ('STRIDE', 'MAESTRO', 'ATLAS', 'OWASP')),
  architecture_graph JSONB DEFAULT '{}',
  risk_score NUMERIC,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Threat vectors within a model
CREATE TABLE public.threat_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_model_id UUID NOT NULL REFERENCES public.threat_models(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  atlas_tactic TEXT,
  owasp_category TEXT,
  maestro_layer TEXT,
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('high', 'medium', 'low')),
  is_accepted BOOLEAN DEFAULT false,
  mitigation_checklist JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pre-defined threat scenarios
CREATE TABLE public.threat_scenarios_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  default_framework TEXT DEFAULT 'STRIDE',
  risk_category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.security_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attack_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_scenarios_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_test_runs
CREATE POLICY "Users can view security test runs" ON public.security_test_runs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create security test runs" ON public.security_test_runs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update security test runs" ON public.security_test_runs
  FOR UPDATE TO authenticated USING (true);

-- RLS Policies for security_findings
CREATE POLICY "Users can view security findings" ON public.security_findings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create security findings" ON public.security_findings
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update security findings" ON public.security_findings
  FOR UPDATE TO authenticated USING (true);

-- RLS Policies for attack_library (read-only for most users)
CREATE POLICY "Users can view attack library" ON public.attack_library
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage attack library" ON public.attack_library
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for automated_test_cases
CREATE POLICY "Users can view test cases" ON public.automated_test_cases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage test cases" ON public.automated_test_cases
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for threat_models
CREATE POLICY "Users can view threat models" ON public.threat_models
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create threat models" ON public.threat_models
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update threat models" ON public.threat_models
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete threat models" ON public.threat_models
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for threat_vectors
CREATE POLICY "Users can view threat vectors" ON public.threat_vectors
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage threat vectors" ON public.threat_vectors
  FOR ALL TO authenticated USING (true);

-- RLS Policies for threat_scenarios_library
CREATE POLICY "Users can view threat scenarios" ON public.threat_scenarios_library
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage threat scenarios" ON public.threat_scenarios_library
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_security_findings_system ON public.security_findings(system_id);
CREATE INDEX idx_security_findings_severity ON public.security_findings(severity);
CREATE INDEX idx_security_test_runs_system ON public.security_test_runs(system_id);
CREATE INDEX idx_threat_models_system ON public.threat_models(system_id);
CREATE INDEX idx_threat_vectors_model ON public.threat_vectors(threat_model_id);
CREATE INDEX idx_attack_library_category ON public.attack_library(category);