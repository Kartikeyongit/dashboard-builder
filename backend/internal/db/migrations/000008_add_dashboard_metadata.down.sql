DROP INDEX IF EXISTS idx_dashboard_favorites_dashboard;
DROP TABLE IF EXISTS dashboard_favorites;

ALTER TABLE dashboards
    DROP COLUMN IF EXISTS tags,
    DROP COLUMN IF EXISTS description;
