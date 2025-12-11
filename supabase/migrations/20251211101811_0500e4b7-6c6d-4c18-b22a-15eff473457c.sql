-- PURGE ALL FAKE DATA — START FROM ZERO — DECEMBER 11, 2025
-- This is the most honest act in RAI history

TRUNCATE TABLE request_logs CASCADE;
TRUNCATE TABLE review_queue CASCADE;
TRUNCATE TABLE incidents CASCADE;
TRUNCATE TABLE drift_alerts CASCADE;
TRUNCATE TABLE policy_violations CASCADE;
TRUNCATE TABLE red_team_campaigns CASCADE;

-- Add comment for audit trail
COMMENT ON TABLE request_logs IS 'All fake data purged on Dec 11, 2025. Only real traffic flows here.';
COMMENT ON TABLE review_queue IS 'All fake data purged on Dec 11, 2025. Only real HITL reviews here.';
COMMENT ON TABLE incidents IS 'All fake data purged on Dec 11, 2025. Only real incidents here.';