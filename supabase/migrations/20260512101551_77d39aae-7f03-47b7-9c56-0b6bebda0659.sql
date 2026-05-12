
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER,
  ADD COLUMN IF NOT EXISTS recurrence_days TEXT[],
  ADD COLUMN IF NOT EXISTS recurrence_monthly_mode TEXT,
  ADD COLUMN IF NOT EXISTS recurrence_end_type TEXT,
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
  ADD COLUMN IF NOT EXISTS recurrence_count INTEGER,
  ADD COLUMN IF NOT EXISTS parent_meeting_id UUID;

CREATE INDEX IF NOT EXISTS idx_meetings_parent ON public.meetings(parent_meeting_id);
