
-- Create enum for risk tiers
CREATE TYPE public.risk_tier AS ENUM ('low', 'medium', 'high', 'critical');

-- Create risk_assessments table
CREATE TABLE public.risk_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Dimension scores (1-5 scale)
  dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Computed scores (0-100 scale)
  static_risk_score NUMERIC NOT NULL DEFAULT 0,
  runtime_risk_score NUMERIC NOT NULL DEFAULT 0,
  uri_score NUMERIC NOT NULL DEFAULT 0,
  
  -- Risk classification
  risk_tier public.risk_tier NOT NULL DEFAULT 'low',
  
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

-- Create risk_metrics table for future runtime risk data
CREATE TABLE public.risk_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  time_window TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for risk_assessments
CREATE POLICY "Users can view all risk assessments" ON public.risk_assessments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create risk assessments" ON public.risk_assessments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their assessments" ON public.risk_assessments
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their assessments" ON public.risk_assessments
  FOR DELETE USING (auth.uid() = created_by);

-- RLS policies for risk_metrics
CREATE POLICY "Users can view all risk metrics" ON public.risk_metrics
  FOR SELECT USING (true);

CREATE POLICY "System can insert risk metrics" ON public.risk_metrics
  FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_risk_assessments_updated_at
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_risk_assessments_system ON public.risk_assessments(system_id);
CREATE INDEX idx_risk_assessments_project ON public.risk_assessments(project_id);
CREATE INDEX idx_risk_metrics_system ON public.risk_metrics(system_id);
