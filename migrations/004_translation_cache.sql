BEGIN;

CREATE TABLE IF NOT EXISTS translated_text_cache (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    field VARCHAR(50) NOT NULL,
    language VARCHAR(20) NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    provider VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (entity_type, entity_id, field, language)
);

CREATE INDEX IF NOT EXISTS ix_translated_text_cache_lookup
    ON translated_text_cache (entity_type, language, entity_id, field);

COMMIT;
