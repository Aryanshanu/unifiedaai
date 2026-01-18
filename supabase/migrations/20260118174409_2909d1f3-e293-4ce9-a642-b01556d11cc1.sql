-- Fix numeric precision for threshold and confidence columns
-- Current: NUMERIC(5,4) can only hold values like 0.9999 max
-- New: DECIMAL (unrestricted) allows any valid decimal

ALTER TABLE dq_rules 
  ALTER COLUMN threshold TYPE DECIMAL,
  ALTER COLUMN confidence TYPE DECIMAL;