-- Add dimension_scores column to dq_profiles table to store computed quality dimensions
ALTER TABLE dq_profiles 
ADD COLUMN IF NOT EXISTS dimension_scores jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN dq_profiles.dimension_scores IS 
'Array of quality dimension scores: completeness, uniqueness, validity, accuracy, timeliness, consistency';