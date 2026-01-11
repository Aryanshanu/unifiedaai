-- Track uploaded documents for quality auditing
CREATE TABLE public.data_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'analyzing', 'completed', 'failed')),
  quality_score INTEGER,
  error_message TEXT,
  parsed_row_count INTEGER,
  parsed_column_count INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER
);

-- Store granular quality issues
CREATE TABLE public.quality_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES public.data_uploads(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.datasets(id),
  issue_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  description TEXT NOT NULL,
  column_name TEXT,
  row_reference INTEGER,
  value_sample TEXT,
  suggested_fix TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_uploads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quality_issues;

-- RLS policies for data_uploads
ALTER TABLE data_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own uploads"
  ON data_uploads FOR SELECT
  USING (user_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role]));

CREATE POLICY "Users can insert their own uploads"
  ON data_uploads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own uploads"
  ON data_uploads FOR UPDATE
  USING (user_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role]));

CREATE POLICY "Users can delete their own uploads"
  ON data_uploads FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for quality_issues
ALTER TABLE quality_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view issues for their uploads"
  ON quality_issues FOR SELECT
  USING (
    upload_id IN (SELECT id FROM data_uploads WHERE user_id = auth.uid())
    OR dataset_id IN (SELECT id FROM datasets WHERE owner_id = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
  );

CREATE POLICY "Authenticated users can insert issues"
  ON quality_issues FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update issues they can view"
  ON quality_issues FOR UPDATE
  USING (
    upload_id IN (SELECT id FROM data_uploads WHERE user_id = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'analyst'::app_role])
  );

-- Create indexes for performance
CREATE INDEX idx_data_uploads_user ON data_uploads(user_id);
CREATE INDEX idx_data_uploads_status ON data_uploads(status);
CREATE INDEX idx_data_uploads_created ON data_uploads(created_at DESC);
CREATE INDEX idx_quality_issues_upload ON quality_issues(upload_id);
CREATE INDEX idx_quality_issues_severity ON quality_issues(severity);
CREATE INDEX idx_quality_issues_status ON quality_issues(status);