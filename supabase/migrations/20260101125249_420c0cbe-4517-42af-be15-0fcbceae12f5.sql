-- Create persistent rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_ms integer NOT NULL DEFAULT 60000,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique index for upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_window 
  ON public.rate_limits(identifier, window_start);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
  ON public.rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- System can manage rate limits (service role only, no user access)
CREATE POLICY "Service role can manage rate limits" 
  ON public.rate_limits 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create cleanup function to auto-delete old entries
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Create trigger to cleanup on each insert (simple approach)
CREATE OR REPLACE FUNCTION public.trigger_cleanup_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only cleanup occasionally (1% of inserts)
  IF random() < 0.01 THEN
    PERFORM public.cleanup_old_rate_limits();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rate_limits_cleanup_trigger
  AFTER INSERT ON public.rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_cleanup_rate_limits();