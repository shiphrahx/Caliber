-- Migration: add tldr column to meetings table
-- Stores AI-generated 2-sentence summary, nullable, fire-and-forget async generation

ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS tldr TEXT;
