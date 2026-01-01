-- Enable realtime for all critical tables that need live updates
-- This allows Supabase Realtime to broadcast changes to subscribed clients

-- Core operational tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drift_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;

-- Registry and approval tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.systems;
ALTER PUBLICATION supabase_realtime ADD TABLE public.models;

-- Evaluation tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluation_runs;

-- Governance tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.attestations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.controls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.control_assessments;

-- Notification and settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_channels;

-- Project and risk tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.impact_assessments;