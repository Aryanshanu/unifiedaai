-- GAP 1: AI Vendors registry
CREATE TABLE public.ai_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vendor_type text NOT NULL DEFAULT 'third_party',
  website text,
  contact_email text,
  risk_tier text DEFAULT 'unassessed',
  contract_status text DEFAULT 'active',
  data_processing_location text,
  compliance_certifications text[] DEFAULT '{}',
  ai_services jsonb DEFAULT '{}',
  last_assessment_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.ai_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view vendors" ON public.ai_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert vendors" ON public.ai_vendors FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update vendors" ON public.ai_vendors FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- GAP 1+4: AI Agents registry
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  agent_type text NOT NULL DEFAULT 'autonomous',
  description text,
  status text DEFAULT 'active',
  risk_tier text DEFAULT 'unassessed',
  model_id uuid REFERENCES public.models(id) ON DELETE SET NULL,
  system_id uuid REFERENCES public.systems(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.ai_vendors(id) ON DELETE SET NULL,
  capabilities text[] DEFAULT '{}',
  permissions text[] DEFAULT '{}',
  max_autonomy_level text DEFAULT 'supervised',
  environment text DEFAULT 'development',
  last_activity_at timestamptz,
  trace_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view agents" ON public.ai_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert agents" ON public.ai_agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update agents" ON public.ai_agents FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- GAP 4: Agent traces
CREATE TABLE public.agent_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE CASCADE NOT NULL,
  trace_type text NOT NULL DEFAULT 'execution',
  input_data jsonb,
  output_data jsonb,
  duration_ms integer,
  status text DEFAULT 'success',
  policy_violations text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  parent_trace_id uuid REFERENCES public.agent_traces(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view traces" ON public.agent_traces FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert traces" ON public.agent_traces FOR INSERT TO authenticated WITH CHECK (true);

-- GAP 1: Shadow AI discovery log
CREATE TABLE public.shadow_ai_discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_method text NOT NULL DEFAULT 'manual',
  ai_system_name text NOT NULL,
  ai_system_type text NOT NULL DEFAULT 'unknown',
  department text,
  discovered_by uuid REFERENCES auth.users(id),
  risk_assessment text DEFAULT 'pending',
  status text DEFAULT 'discovered',
  evidence jsonb DEFAULT '{}',
  remediation_notes text,
  registered_as_system_id uuid REFERENCES public.systems(id),
  registered_as_agent_id uuid REFERENCES public.ai_agents(id),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.shadow_ai_discoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view discoveries" ON public.shadow_ai_discoveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert discoveries" ON public.shadow_ai_discoveries FOR INSERT TO authenticated WITH CHECK (auth.uid() = discovered_by);
CREATE POLICY "Users can update discoveries" ON public.shadow_ai_discoveries FOR UPDATE TO authenticated USING (true);

-- GAP 3: Scheduled evaluations
CREATE TABLE public.evaluation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model_id uuid REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  engine_types text[] NOT NULL DEFAULT '{fairness,toxicity,privacy,hallucination,explainability}',
  cron_expression text NOT NULL DEFAULT '0 0 * * *',
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  run_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  notification_emails text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.evaluation_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view schedules" ON public.evaluation_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage schedules" ON public.evaluation_schedules FOR ALL TO authenticated USING (auth.uid() = created_by);

-- GAP 5: Environment management
CREATE TABLE public.deployment_environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_production boolean DEFAULT false,
  approval_required boolean DEFAULT false,
  max_risk_tier text DEFAULT 'high',
  auto_monitoring boolean DEFAULT true,
  notification_channels jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.deployment_environments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view environments" ON public.deployment_environments FOR SELECT TO authenticated USING (true);

-- Seed default environments
INSERT INTO public.deployment_environments (name, display_name, description, is_production, approval_required) VALUES
  ('development', 'Development', 'Local development and experimentation', false, false),
  ('staging', 'Staging', 'Pre-production testing and validation', false, true),
  ('production', 'Production', 'Live production environment', true, true);

-- Enable realtime for agent traces
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_traces;