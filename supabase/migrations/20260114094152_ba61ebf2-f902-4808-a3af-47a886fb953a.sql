-- ============================================
-- PHASE 1: Data Sovereignty & Fairness Layer
-- ============================================

-- Add demographics JSONB column to profiles (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'demographics') THEN
      ALTER TABLE public.profiles ADD COLUMN demographics JSONB DEFAULT '{}';
      COMMENT ON COLUMN public.profiles.demographics IS 'Protected attributes for fairness analysis: {age_group, gender, region, ethnicity}';
    END IF;
  END IF;
END $$;

-- Add demographic_context to decision_ledger for fairness tracking
ALTER TABLE public.decision_ledger ADD COLUMN IF NOT EXISTS demographic_context JSONB;
COMMENT ON COLUMN public.decision_ledger.demographic_context IS 'Demographic context at decision time for Disparate Impact Ratio calculation';

-- ============================================
-- PHASE 2: Semantic Knowledge Layer (pgvector)
-- ============================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to kg_nodes for semantic search
ALTER TABLE public.kg_nodes ADD COLUMN IF NOT EXISTS embedding vector(1536);
COMMENT ON COLUMN public.kg_nodes.embedding IS 'OpenAI text-embedding-3-small vector for semantic similarity search';

-- Create HNSW index for fast similarity search (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'kg_nodes_embedding_idx') THEN
    CREATE INDEX kg_nodes_embedding_idx ON public.kg_nodes 
    USING hnsw (embedding vector_cosine_ops);
  END IF;
END $$;

-- Create match_nodes RPC function for vector similarity search
CREATE OR REPLACE FUNCTION public.match_nodes(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id text,
  label text,
  properties jsonb,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kg_nodes.id,
    kg_nodes.entity_type,
    kg_nodes.entity_id,
    kg_nodes.label,
    kg_nodes.properties,
    kg_nodes.metadata,
    1 - (kg_nodes.embedding <=> query_embedding) as similarity
  FROM kg_nodes
  WHERE kg_nodes.embedding IS NOT NULL
    AND 1 - (kg_nodes.embedding <=> query_embedding) > match_threshold
  ORDER BY kg_nodes.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- PHASE 3: Communication & Alerting Layer
-- ============================================

-- Create notification_history table for audit trail
CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.notification_channels(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT,
  recipient TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT,
  provider_message_id TEXT,
  provider_response JSONB,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notification_history
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notifications for their channels
CREATE POLICY "Users can view their notification history"
  ON public.notification_history FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM public.notification_channels WHERE user_id = auth.uid()
    )
    OR auth.uid() IS NOT NULL -- Allow authenticated users to see system notifications
  );

-- Policy: System can insert notifications (service role)
CREATE POLICY "System can insert notifications"
  ON public.notification_history FOR INSERT
  WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_history_channel 
  ON public.notification_history(channel_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_status 
  ON public.notification_history(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_history_created 
  ON public.notification_history(created_at DESC);

-- ============================================
-- PHASE 5: Reporting & Compliance Layer
-- ============================================

-- Create audit_report_ledger table with hash chain
CREATE TABLE IF NOT EXISTS public.audit_report_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL UNIQUE,
  report_type TEXT NOT NULL DEFAULT 'governance_audit',
  content_hash TEXT NOT NULL,
  pdf_hash TEXT,
  storage_bucket TEXT NOT NULL DEFAULT 'fractal',
  storage_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL,
  report_period_start TIMESTAMPTZ,
  report_period_end TIMESTAMPTZ,
  previous_hash TEXT,
  record_hash TEXT,
  verified_at TIMESTAMPTZ,
  verification_status TEXT DEFAULT 'unverified',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_report_ledger ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view reports
CREATE POLICY "Authenticated users can view audit reports"
  ON public.audit_report_ledger FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: System can insert reports
CREATE POLICY "System can insert audit reports"
  ON public.audit_report_ledger FOR INSERT
  WITH CHECK (true);

-- Create hash chain trigger for immutability
CREATE OR REPLACE FUNCTION public.compute_report_ledger_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- Get previous hash from the chain
  SELECT record_hash INTO NEW.previous_hash
  FROM public.audit_report_ledger
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no previous record, use GENESIS
  NEW.previous_hash := COALESCE(NEW.previous_hash, 'GENESIS');
  
  -- Compute record hash using SHA-256
  NEW.record_hash := encode(sha256(
    (NEW.report_id::text || NEW.content_hash || COALESCE(NEW.pdf_hash, '') || 
     NEW.previous_hash || NEW.generated_at::text)::bytea
  ), 'hex');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS compute_report_ledger_hash_trigger ON public.audit_report_ledger;
CREATE TRIGGER compute_report_ledger_hash_trigger
  BEFORE INSERT ON public.audit_report_ledger
  FOR EACH ROW EXECUTE FUNCTION public.compute_report_ledger_hash();

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_report_ledger_report_id 
  ON public.audit_report_ledger(report_id);
CREATE INDEX IF NOT EXISTS idx_audit_report_ledger_generated 
  ON public.audit_report_ledger(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_report_ledger_type 
  ON public.audit_report_ledger(report_type);

-- Add realtime for notification_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_history;