-- Create request_logs table for storing all gateway traffic
CREATE TABLE public.request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  environment TEXT DEFAULT 'production',
  request_body JSONB DEFAULT '{}'::jsonb,
  response_body JSONB DEFAULT '{}'::jsonb,
  status_code INTEGER,
  latency_ms INTEGER,
  error_message TEXT,
  trace_id TEXT,
  user_id UUID,
  engine_scores JSONB DEFAULT '{}'::jsonb,
  decision TEXT DEFAULT 'allow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_request_logs_system_id ON public.request_logs(system_id);
CREATE INDEX idx_request_logs_created_at ON public.request_logs(created_at DESC);
CREATE INDEX idx_request_logs_decision ON public.request_logs(decision);

-- Enable RLS
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view logs for their systems"
  ON public.request_logs
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert logs"
  ON public.request_logs
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_logs;