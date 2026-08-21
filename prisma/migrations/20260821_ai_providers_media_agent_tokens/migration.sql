-- Additive migration: custom AI providers, media provenance, post provenance, agent tokens.
--
-- Every statement is additive and idempotent-safe (IF NOT EXISTS) so it can be applied to an
-- existing production database without downtime. No column is dropped or renamed, and all new
-- columns are either nullable or have defaults, so existing rows and older application code
-- continue to work.

-- ---------------------------------------------------------------------------
-- ai_api_keys: support custom OpenAI-compatible providers
-- ---------------------------------------------------------------------------
ALTER TABLE "ai_api_keys" ADD COLUMN IF NOT EXISTS "base_url" TEXT;
ALTER TABLE "ai_api_keys" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "ai_api_keys" ADD COLUMN IF NOT EXISTS "capability" TEXT NOT NULL DEFAULT 'text';

CREATE INDEX IF NOT EXISTS "ai_api_keys_provider_capability_idx"
    ON "ai_api_keys" ("provider", "capability");

-- ---------------------------------------------------------------------------
-- media: provenance, licensing attribution, Cloudinary public_id
-- ---------------------------------------------------------------------------
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'upload';
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "source_ref" TEXT;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "attribution" TEXT;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "ai_prompt" TEXT;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "public_id" TEXT;

CREATE INDEX IF NOT EXISTS "media_source_idx" ON "media" ("source");

-- ---------------------------------------------------------------------------
-- posts: record which surface created the article
-- ---------------------------------------------------------------------------
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "created_via" TEXT;

-- ---------------------------------------------------------------------------
-- agent_api_tokens: bearer credentials for external agents
-- Only the SHA-256 hash is stored; the plaintext is shown once at creation time.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "agent_api_tokens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_api_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_api_tokens_token_hash_key"
    ON "agent_api_tokens" ("token_hash");

CREATE INDEX IF NOT EXISTS "agent_api_tokens_is_active_idx"
    ON "agent_api_tokens" ("is_active");
