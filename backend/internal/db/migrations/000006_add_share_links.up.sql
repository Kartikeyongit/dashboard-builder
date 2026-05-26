CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    password_hash VARCHAR(255),          -- bcrypt, NULL if no password
    expires_at TIMESTAMPTZ,              -- NULL = never
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_share_links_token_hash ON share_links(token_hash);