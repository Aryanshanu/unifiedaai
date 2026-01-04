-- Create table for tracking composite RAI scores
CREATE TABLE public.rai_composite_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  composite_score NUMERIC(5,2) NOT NULL,
  fairness_score NUMERIC(5,2),
  toxicity_score NUMERIC(5,2),
  privacy_score NUMERIC(5,2),
  hallucination_score NUMERIC(5,2),
  explainability_score NUMERIC(5,2),
  domain VARCHAR(50) DEFAULT 'general',
  is_compliant BOOLEAN DEFAULT false,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_rai_composite_scores_model ON public.rai_composite_scores(model_id);
CREATE INDEX idx_rai_composite_scores_evaluated ON public.rai_composite_scores(evaluated_at DESC);

-- Enable RLS
ALTER TABLE public.rai_composite_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can view composite scores
CREATE POLICY "Authenticated users can view composite scores"
  ON public.rai_composite_scores
  FOR SELECT TO authenticated USING (true);

-- RLS Policy: System can insert scores
CREATE POLICY "System can insert composite scores"
  ON public.rai_composite_scores
  FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.rai_composite_scores;