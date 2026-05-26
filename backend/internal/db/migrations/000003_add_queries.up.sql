CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    datasource_id UUID NOT NULL REFERENCES datasources(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sql_text TEXT NOT NULL,
    max_rows INTEGER NOT NULL DEFAULT 1000,
    timeout_ms INTEGER NOT NULL DEFAULT 30000,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);