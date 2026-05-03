-- Add edited_summary column to weekly_reviews if missing
ALTER TABLE public.weekly_reviews
  ADD COLUMN IF NOT EXISTS edited_summary TEXT;

-- follow_ups.source_id references meetings loosely via source_type='meeting'
-- but there is no FK. Drop the meeting join from queries by removing the FK
-- that was never created. Nothing to do in SQL — the code fix removes the join.
