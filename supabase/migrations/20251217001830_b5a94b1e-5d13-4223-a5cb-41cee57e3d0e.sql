-- Create table for user provider API keys
CREATE TABLE public.user_provider_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_provider_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own keys
CREATE POLICY "Users can view own provider keys"
ON public.user_provider_keys
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own keys
CREATE POLICY "Users can insert own provider keys"
ON public.user_provider_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own keys
CREATE POLICY "Users can update own provider keys"
ON public.user_provider_keys
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own keys
CREATE POLICY "Users can delete own provider keys"
ON public.user_provider_keys
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_provider_keys_updated_at
BEFORE UPDATE ON public.user_provider_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();