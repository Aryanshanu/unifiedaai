-- Create app_errors table for logging all application errors
CREATE TABLE public.app_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_name TEXT,
  user_id UUID,
  page_url TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (for error logging)
CREATE POLICY "Anyone can insert app errors" 
ON public.app_errors 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view errors
CREATE POLICY "Admins can view app errors" 
ON public.app_errors 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_app_errors_created_at ON public.app_errors(created_at DESC);
CREATE INDEX idx_app_errors_error_type ON public.app_errors(error_type);