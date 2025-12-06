
-- Create enum for environment types
CREATE TYPE public.environment_type AS ENUM ('development', 'staging', 'production');

-- Create enum for sensitivity levels
CREATE TYPE public.sensitivity_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for system types
CREATE TYPE public.system_type AS ENUM ('model', 'agent', 'provider', 'pipeline');

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  organization TEXT,
  business_sensitivity public.sensitivity_level NOT NULL DEFAULT 'medium',
  data_sensitivity public.sensitivity_level NOT NULL DEFAULT 'medium',
  criticality INTEGER NOT NULL DEFAULT 5 CHECK (criticality >= 1 AND criticality <= 10),
  environment public.environment_type NOT NULL DEFAULT 'development',
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create systems table
CREATE TABLE public.systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_type public.system_type NOT NULL DEFAULT 'model',
  provider TEXT NOT NULL,
  model_name TEXT,
  endpoint TEXT,
  api_headers JSONB DEFAULT '{}'::jsonb,
  api_token_encrypted TEXT,
  use_case TEXT,
  status public.model_status NOT NULL DEFAULT 'draft',
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view all projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their projects" ON public.projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their projects" ON public.projects
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies for systems
CREATE POLICY "Users can view all systems" ON public.systems
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create systems" ON public.systems
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their systems" ON public.systems
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their systems" ON public.systems
  FOR DELETE USING (auth.uid() = owner_id);

-- Add triggers for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_systems_updated_at
  BEFORE UPDATE ON public.systems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_systems_project ON public.systems(project_id);
CREATE INDEX idx_systems_owner ON public.systems(owner_id);
