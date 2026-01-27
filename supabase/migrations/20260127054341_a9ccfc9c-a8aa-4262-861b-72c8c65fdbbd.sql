-- Phase 1: Critical Data Elements (CDE) and Business Impact Tagging

-- Add CDE flag to dq_rules
ALTER TABLE public.dq_rules ADD COLUMN IF NOT EXISTS is_critical_element BOOLEAN DEFAULT false;

-- Add business impact to dq_rules
ALTER TABLE public.dq_rules ADD COLUMN IF NOT EXISTS business_impact TEXT CHECK (business_impact IN ('high', 'medium', 'low'));

-- Add critical columns tracking to dq_profiles
ALTER TABLE public.dq_profiles ADD COLUMN IF NOT EXISTS critical_columns TEXT[] DEFAULT '{}';

-- Add business impact to datasets
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS business_impact TEXT CHECK (business_impact IN ('high', 'medium', 'low'));

-- Create index for faster CDE lookups
CREATE INDEX IF NOT EXISTS idx_dq_rules_critical ON public.dq_rules(is_critical_element) WHERE is_critical_element = true;

-- Create index for business impact filtering
CREATE INDEX IF NOT EXISTS idx_dq_rules_business_impact ON public.dq_rules(business_impact) WHERE business_impact IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_datasets_business_impact ON public.datasets(business_impact) WHERE business_impact IS NOT NULL;