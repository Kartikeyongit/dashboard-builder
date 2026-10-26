ALTER TABLE dashboards
    ADD COLUMN filters_json JSONB NOT NULL DEFAULT '[]';
