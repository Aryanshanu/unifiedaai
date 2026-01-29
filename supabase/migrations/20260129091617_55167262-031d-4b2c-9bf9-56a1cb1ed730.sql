-- =====================================================
-- OVERSIGHT AGENT POC - Phase 1: Database Schema
-- =====================================================

-- 1. Create Unified Event Ingestion Table
CREATE TABLE public.events_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('data_quality', 'model_perf', 'fairness', 'security', 'compliance')),
  source_system_id UUID REFERENCES public.systems(id) ON DELETE SET NULL,
  source_model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  severity TEXT CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  payload JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  correlation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_events_raw_type ON public.events_raw(event_type);
CREATE INDEX idx_events_raw_unprocessed ON public.events_raw(processed) WHERE NOT processed;
CREATE INDEX idx_events_raw_created ON public.events_raw(created_at DESC);
CREATE INDEX idx_events_raw_correlation ON public.events_raw(correlation_id) WHERE correlation_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.events_raw ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read events"
ON public.events_raw FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System actors can insert events"
ON public.events_raw FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage events"
ON public.events_raw FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create Ownership Mapping Table
CREATE TABLE public.ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('system', 'model', 'dataset')),
  entity_id UUID NOT NULL,
  owner_user_id UUID,
  team_name TEXT,
  escalation_email TEXT,
  on_call_schedule JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_ownership_entity ON public.ownership(entity_type, entity_id);
CREATE INDEX idx_ownership_owner ON public.ownership(owner_user_id);

ALTER TABLE public.ownership ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ownership"
ON public.ownership FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage ownership"
ON public.ownership FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create SLO Configuration Table
CREATE TABLE public.slo_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL UNIQUE,
  target_value NUMERIC NOT NULL,
  threshold_warning NUMERIC,
  threshold_critical NUMERIC,
  measurement_window_hours INTEGER DEFAULT 24,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.slo_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read SLO config"
ON public.slo_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage SLO config"
ON public.slo_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed with POC defaults
INSERT INTO public.slo_config (metric_name, target_value, threshold_warning, threshold_critical) VALUES
  ('mttd_critical_minutes', 5, 10, 15),
  ('mttd_high_minutes', 15, 30, 60),
  ('mttr_critical_minutes', 60, 90, 120),
  ('mttr_high_minutes', 240, 360, 480),
  ('alert_precision', 0.80, 0.70, 0.60),
  ('alert_recall', 0.80, 0.70, 0.60),
  ('audit_completeness', 0.95, 0.90, 0.85);

-- 4. Create Escalation Rules Table
CREATE TABLE public.escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  severity_filter TEXT[],
  incident_type_filter TEXT[],
  sla_breach_minutes INTEGER,
  escalation_action TEXT CHECK (escalation_action IN ('notify_owner', 'notify_team', 'page', 'auto_create_ticket')),
  webhook_url TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read escalation rules"
ON public.escalation_rules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage escalation rules"
ON public.escalation_rules FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed with default escalation rules
INSERT INTO public.escalation_rules (rule_name, severity_filter, sla_breach_minutes, escalation_action) VALUES
  ('Critical SLA Breach', ARRAY['critical'], 60, 'page'),
  ('High Priority Escalation', ARRAY['high', 'critical'], 240, 'notify_team'),
  ('Default Owner Notification', ARRAY['medium', 'high', 'critical'], 120, 'notify_owner');

-- 5. Create Storage Bucket for Evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('oversight-evidence', 'oversight-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy for Evidence
CREATE POLICY "Authenticated users can read evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'oversight-evidence');

CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'oversight-evidence');

-- 6. Add evidence_url column to incidents if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'evidence_url'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN evidence_url TEXT;
  END IF;
END $$;

-- 7. Add detected_at column to incidents for MTTD calculation if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'detected_at'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN detected_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 8. Add resolved_at column to incidents for MTTR calculation if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;
END $$;

-- 9. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.events_raw;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escalation_rules;