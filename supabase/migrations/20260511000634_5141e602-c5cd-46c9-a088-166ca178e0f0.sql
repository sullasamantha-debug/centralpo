
-- 1. Convert enum columns to text for flexibility
ALTER TABLE public.tasks ALTER COLUMN demand_type TYPE text USING demand_type::text;
ALTER TABLE public.tasks ALTER COLUMN origin TYPE text USING origin::text;

-- 2. User-managed option tables
CREATE TABLE public.demand_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.demand_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own demand_types all" ON public.demand_types FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.origins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.origins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own origins all" ON public.origins FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Notes
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  tags text[] DEFAULT '{}',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes all" ON public.notes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_notes_user ON public.notes(user_id, created_at DESC);
CREATE INDEX idx_notes_task ON public.notes(task_id);
CREATE INDEX idx_notes_meeting ON public.notes(meeting_id);

-- 4. Seed defaults for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.products (user_id, name, color) VALUES
    (NEW.id, 'Group Com', '#6366f1'),
    (NEW.id, 'Group Pay', '#10b981'),
    (NEW.id, 'App', '#f59e0b'),
    (NEW.id, 'Interno', '#64748b');
  INSERT INTO public.demand_types (user_id, name) VALUES
    (NEW.id, 'Bug'), (NEW.id, 'Melhoria'), (NEW.id, 'Dúvida'), (NEW.id, 'Processo'), (NEW.id, 'Projeto');
  INSERT INTO public.origins (user_id, name) VALUES
    (NEW.id, 'Email'), (NEW.id, 'Teams'), (NEW.id, 'Reunião'), (NEW.id, 'WhatsApp'), (NEW.id, 'Sistema'), (NEW.id, 'Interno');
  RETURN NEW;
END; $function$;

-- 5. Backfill demand_types/origins for existing users
INSERT INTO public.demand_types (user_id, name)
SELECT DISTINCT p.user_id, v.name
FROM public.profiles p
CROSS JOIN (VALUES ('Bug'),('Melhoria'),('Dúvida'),('Processo'),('Projeto')) AS v(name)
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO public.origins (user_id, name)
SELECT DISTINCT p.user_id, v.name
FROM public.profiles p
CROSS JOIN (VALUES ('Email'),('Teams'),('Reunião'),('WhatsApp'),('Sistema'),('Interno')) AS v(name)
ON CONFLICT (user_id, name) DO NOTHING;
