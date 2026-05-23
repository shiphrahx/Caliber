-- Migration: add cache token tracking columns to ai_request_log
-- Stores Anthropic prompt cache read/write tokens per request for transparency

ALTER TABLE public.ai_request_log
  ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER NOT NULL DEFAULT 0;
