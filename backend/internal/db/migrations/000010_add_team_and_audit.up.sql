-- Phase 4B: team management, per-user settings, and an audit trail.

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(120) NOT NULL DEFAULT '',
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'editor',
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_encrypted TEXT NOT NULL DEFAULT '',
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT org_invites_role_check CHECK (role IN ('admin', 'editor', 'viewer'))
);

CREATE INDEX IF NOT EXISTS org_invites_org_idx ON org_invites (org_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS org_invites_pending_email_idx
    ON org_invites (org_id, lower(email))
    WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(50) NOT NULL DEFAULT '',
    target_id UUID,
    target_name VARCHAR(255) NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_org_created_idx ON audit_events (org_id, created_at DESC);
