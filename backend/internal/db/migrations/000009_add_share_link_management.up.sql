ALTER TABLE share_links ADD COLUMN token_encrypted TEXT;
ALTER TABLE share_links ADD COLUMN last_used_at TIMESTAMPTZ;
CREATE INDEX idx_share_links_dashboard_id ON share_links(dashboard_id);
