-- Library metadata for dashboards plus per-user favorites.
ALTER TABLE dashboards
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS dashboard_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, dashboard_id)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_favorites_dashboard ON dashboard_favorites(dashboard_id);
