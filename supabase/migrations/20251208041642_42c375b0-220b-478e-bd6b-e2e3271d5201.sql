-- Add governance fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS data_residency text DEFAULT 'us',
ADD COLUMN IF NOT EXISTS primary_owner_email text,
ADD COLUMN IF NOT EXISTS compliance_frameworks text[] DEFAULT '{}';

-- Add governance and provenance fields to systems table
ALTER TABLE public.systems
ADD COLUMN IF NOT EXISTS business_owner_email text,
ADD COLUMN IF NOT EXISTS technical_owner text,
ADD COLUMN IF NOT EXISTS license text,
ADD COLUMN IF NOT EXISTS data_residency text,
ADD COLUMN IF NOT EXISTS access_tier text DEFAULT 'internal-only',
ADD COLUMN IF NOT EXISTS sla_tier text DEFAULT 'best-effort',
ADD COLUMN IF NOT EXISTS base_model text,
ADD COLUMN IF NOT EXISTS model_card_url text;

-- Add same fields to models table for direct access
ALTER TABLE public.models
ADD COLUMN IF NOT EXISTS business_owner_email text,
ADD COLUMN IF NOT EXISTS license text,
ADD COLUMN IF NOT EXISTS base_model text,
ADD COLUMN IF NOT EXISTS model_card_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.data_residency IS 'Data processing jurisdiction: us, eu, uk, apac, global';
COMMENT ON COLUMN public.projects.compliance_frameworks IS 'Applicable compliance frameworks: gdpr, ccpa, hipaa, sox, eu-ai-act, nist';
COMMENT ON COLUMN public.systems.license IS 'Model license: apache-2.0, mit, gpl-3.0, proprietary, restricted, other';
COMMENT ON COLUMN public.systems.access_tier IS 'Who can access: internal-only, partner, customer, public';
COMMENT ON COLUMN public.systems.sla_tier IS 'SLA level: best-effort, standard, premium, mission-critical';