-- Additive migration: persist the working auth style for custom OpenAI-compatible providers.
--
-- Some gateways expect the raw API key in the Authorization header (no "Bearer " prefix)
-- or in x-api-key. The style that succeeded is cached here so later requests do not have
-- to re-probe. Nullable with no default, so existing rows keep working (they fall back to
-- the default "bearer" probing order).

ALTER TABLE "ai_api_keys" ADD COLUMN IF NOT EXISTS "auth_style" TEXT;
