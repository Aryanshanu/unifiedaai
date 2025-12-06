-- Add project_id and system_id foreign keys to models table
ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS system_id UUID REFERENCES public.systems(id) ON DELETE SET NULL;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_models_project_id ON public.models(project_id);
CREATE INDEX IF NOT EXISTS idx_models_system_id ON public.models(system_id);