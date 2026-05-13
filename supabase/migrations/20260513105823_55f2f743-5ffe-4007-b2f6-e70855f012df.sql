ALTER TABLE public.meetings 
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS occurred boolean;