-- Add 'sandbox' to environment_type enum
ALTER TYPE environment_type ADD VALUE IF NOT EXISTS 'sandbox';

-- Add environment column to datasets for cleanup isolation
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production';