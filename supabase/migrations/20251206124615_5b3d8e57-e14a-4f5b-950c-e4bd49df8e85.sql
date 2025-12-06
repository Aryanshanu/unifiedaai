
-- Create enum for impact quadrants
CREATE TYPE public.impact_quadrant AS ENUM (
  'low_low', 
  'low_medium', 
  'low_high', 
  'medium_low', 
  'medium_medium', 
  'medium_high', 
  'high_low', 
  'high_medium', 
  'high_high',
  'critical_critical'
);

-- Create enum for deployment status
CREATE TYPE public.deployment_status AS ENUM (
  'draft',
  'ready_for_review', 
  'pending_approval',
  'approved', 
  'blocked',
  'deployed'
);

-- Create enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create impact_assessments table
CREATE TABLE public.impact_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Dimension scores (1-5 scale)
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Computed score (0-100)
  overall_score NUMERIC NOT NULL DEFAULT 0,
  
  -- Risk × Impact quadrant
  quadrant public.impact_quadrant NOT NULL DEFAULT 'low_low',
  
  -- Questionnaire answers for audit trail
  questionnaire_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Summary and notes
  summary TEXT,
  notes TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extend systems table with governance fields
ALTER TABLE public.systems 
  ADD COLUMN deployment_status public.deployment_status NOT NULL DEFAULT 'draft',
  ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT false;

-- Create system_approvals table
CREATE TABLE public.system_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  approver_id UUID REFERENCES auth.users(id),
  status public.approval_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.impact_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies for impact_assessments
CREATE POLICY "Users can view all impact assessments" ON public.impact_assessments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create impact assessments" ON public.impact_assessments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their assessments" ON public.impact_assessments
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS policies for system_approvals
CREATE POLICY "Users can view all approvals" ON public.system_approvals
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create approval requests" ON public.system_approvals
  FOR INSERT WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Approvers can update approvals" ON public.system_approvals
  FOR UPDATE USING (auth.uid() = approver_id OR has_role(auth.uid(), 'admin'));

-- Triggers
CREATE TRIGGER update_impact_assessments_updated_at
  BEFORE UPDATE ON public.impact_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_impact_assessments_system ON public.impact_assessments(system_id);
CREATE INDEX idx_impact_assessments_project ON public.impact_assessments(project_id);
CREATE INDEX idx_system_approvals_system ON public.system_approvals(system_id);
CREATE INDEX idx_system_approvals_status ON public.system_approvals(status);
