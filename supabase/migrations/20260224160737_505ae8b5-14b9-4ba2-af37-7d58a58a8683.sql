
-- Create semantic_definitions table
CREATE TABLE public.semantic_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  description TEXT,
  definition_yaml TEXT NOT NULL,
  owner_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated')),
  version INTEGER NOT NULL DEFAULT 1,
  definition_hash TEXT,
  grain TEXT,
  sql_logic TEXT,
  synonyms TEXT[] DEFAULT '{}',
  ai_context TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.semantic_definitions ENABLE ROW LEVEL SECURITY;

-- RLS policies: everyone can read, authenticated users can create/update their own
CREATE POLICY "Anyone can read semantic definitions"
  ON public.semantic_definitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own definitions"
  ON public.semantic_definitions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own definitions"
  ON public.semantic_definitions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own definitions"
  ON public.semantic_definitions FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_semantic_definitions_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_semantic_definitions_updated_at
  BEFORE UPDATE ON public.semantic_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_semantic_definitions_updated_at();

-- Compute SHA-256 hash of definition_yaml on insert/update
CREATE OR REPLACE FUNCTION public.compute_semantic_definition_hash()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.definition_hash := encode(sha256(NEW.definition_yaml::bytea), 'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER compute_semantic_hash
  BEFORE INSERT OR UPDATE ON public.semantic_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_semantic_definition_hash();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.semantic_definitions;
