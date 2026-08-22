-- Additive migration: per-task AI role models, content audit pipeline, and media caption.
--
-- Nothing here drops or rewrites existing data. The rotary pool (`ai_api_keys`) is left
-- untouched; `ai_role_models` is a separate table because role models are deliberately
-- NOT rotated -- exactly one active credential per role.

-- ---------------------------------------------------------------------------
-- media.caption (AI-generated photo caption, editable by hand)
-- ---------------------------------------------------------------------------
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "caption" TEXT;

-- ---------------------------------------------------------------------------
-- ai_role_models: one dedicated credential per task role
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ai_role_models" (
    "id"           TEXT NOT NULL,
    "role"         TEXT NOT NULL,
    "provider"     TEXT NOT NULL DEFAULT 'openai_compatible',
    "api_key"      TEXT NOT NULL,
    "base_url"     TEXT,
    "model"        TEXT,
    "auth_style"   TEXT,
    "label"        TEXT,
    "is_active"    BOOLEAN NOT NULL DEFAULT true,
    "usage_count"  INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "last_error"   TEXT,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_role_models_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_role_models_role_key" ON "ai_role_models"("role");
CREATE INDEX IF NOT EXISTS "ai_role_models_role_is_active_idx" ON "ai_role_models"("role", "is_active");

-- ---------------------------------------------------------------------------
-- content_audits: one scan run over every published post
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "content_audits" (
    "id"                 TEXT NOT NULL,
    "status"             TEXT NOT NULL DEFAULT 'pending',
    "scanned_posts"      INTEGER NOT NULL DEFAULT 0,
    "idea_count"         INTEGER NOT NULL DEFAULT 0,
    "link_count"         INTEGER NOT NULL DEFAULT 0,
    "gap_summary"        TEXT,
    "error"              TEXT,
    "used_role_model_id" TEXT,
    "user_id"            TEXT NOT NULL,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at"       TIMESTAMP(3),

    CONSTRAINT "content_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "content_audits_status_idx" ON "content_audits"("status");
CREATE INDEX IF NOT EXISTS "content_audits_user_id_idx" ON "content_audits"("user_id");

-- ---------------------------------------------------------------------------
-- content_ideas: calendar entries produced by an audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "content_ideas" (
    "id"                 TEXT NOT NULL,
    "title"              TEXT NOT NULL,
    "angle"              TEXT,
    "outline_html"       TEXT,
    "focus_keyword"      TEXT,
    "secondary_keywords" TEXT,
    "category_slug"      TEXT,
    "rationale"          TEXT,
    "scheduled_for"      TIMESTAMP(3),
    "status"             TEXT NOT NULL DEFAULT 'pending',
    "order"              INTEGER NOT NULL DEFAULT 0,
    "audit_id"           TEXT,
    "post_id"            TEXT,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_ideas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "content_ideas_status_idx" ON "content_ideas"("status");
CREATE INDEX IF NOT EXISTS "content_ideas_scheduled_for_idx" ON "content_ideas"("scheduled_for");
CREATE INDEX IF NOT EXISTS "content_ideas_audit_id_idx" ON "content_ideas"("audit_id");

-- ---------------------------------------------------------------------------
-- internal_link_suggestions: persisted scanning-model output
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "internal_link_suggestions" (
    "id"               TEXT NOT NULL,
    "exact_phrase"     TEXT NOT NULL,
    "replacement_html" TEXT NOT NULL,
    "target_url"       TEXT NOT NULL,
    "target_title"     TEXT,
    "rationale"        TEXT,
    "status"           TEXT NOT NULL DEFAULT 'pending',
    "applied_at"       TIMESTAMP(3),
    "source_post_id"   TEXT NOT NULL,
    "target_post_id"   TEXT,
    "audit_id"         TEXT,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_link_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "internal_link_suggestions_source_post_id_status_idx"
    ON "internal_link_suggestions"("source_post_id", "status");
CREATE INDEX IF NOT EXISTS "internal_link_suggestions_audit_id_idx"
    ON "internal_link_suggestions"("audit_id");

-- ---------------------------------------------------------------------------
-- Foreign keys (added separately so re-runs are safe)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_ideas_audit_id_fkey') THEN
        ALTER TABLE "content_ideas"
            ADD CONSTRAINT "content_ideas_audit_id_fkey"
            FOREIGN KEY ("audit_id") REFERENCES "content_audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_ideas_post_id_fkey') THEN
        ALTER TABLE "content_ideas"
            ADD CONSTRAINT "content_ideas_post_id_fkey"
            FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_link_suggestions_source_post_id_fkey') THEN
        ALTER TABLE "internal_link_suggestions"
            ADD CONSTRAINT "internal_link_suggestions_source_post_id_fkey"
            FOREIGN KEY ("source_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_link_suggestions_target_post_id_fkey') THEN
        ALTER TABLE "internal_link_suggestions"
            ADD CONSTRAINT "internal_link_suggestions_target_post_id_fkey"
            FOREIGN KEY ("target_post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_link_suggestions_audit_id_fkey') THEN
        ALTER TABLE "internal_link_suggestions"
            ADD CONSTRAINT "internal_link_suggestions_audit_id_fkey"
            FOREIGN KEY ("audit_id") REFERENCES "content_audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
