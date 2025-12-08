-- Create notification_channels table for persisting alert channels
CREATE TABLE public.notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'slack', 'teams', 'webhook')),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own channels" 
ON public.notification_channels 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own channels" 
ON public.notification_channels 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own channels" 
ON public.notification_channels 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own channels" 
ON public.notification_channels 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins full access to channels" 
ON public.notification_channels 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Updated at trigger
CREATE TRIGGER update_notification_channels_updated_at
BEFORE UPDATE ON public.notification_channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();