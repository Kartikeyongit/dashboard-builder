DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS org_invites;
DROP TABLE IF EXISTS user_settings;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
