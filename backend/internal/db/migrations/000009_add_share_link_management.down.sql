DROP INDEX IF EXISTS idx_share_links_dashboard_id;
ALTER TABLE share_links DROP COLUMN IF EXISTS last_used_at;
ALTER TABLE share_links DROP COLUMN IF EXISTS token_encrypted;
