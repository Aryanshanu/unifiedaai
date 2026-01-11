-- Add analysis_details JSONB column to store detailed breakdown
ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS analysis_details JSONB;

-- Add comment for documentation
COMMENT ON COLUMN data_uploads.analysis_details IS 'Stores detailed column analysis, computation steps, raw logs, and evidence hash for governance-grade transparency';