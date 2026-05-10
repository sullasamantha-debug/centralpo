
-- Enums
CREATE TYPE public.task_status AS ENUM ('a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido');
CREATE TYPE public.task_priority AS ENUM ('alta', 'media', 'baixa');
CREATE TYPE public.task_demand_type AS ENUM ('bug', 'melhoria', 'duvida', 'processo', 'projeto');
CREATE TYPE public.task_origin AS ENUM ('email', 'teams', 'reuniao', 'whatsapp', 'sistema', 'interno');
CREATE TYPE public.task_kind AS ENUM ('minha', 'cobranca', 'ambos');
CREATE TYPE public.response_channel AS ENUM ('email', 'teams', 'whatsapp', 'reuniao');
CREATE TYPE public.event_type AS ENUM ('reuniao', 'tarefa');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own products all" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  followup_owner TEXT,
  status public.task_status NOT NULL DEFAULT 'a_fazer',
  priority public.task_priority NOT NULL DEFAULT 'media',
  due_date DATE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  demand_type public.task_demand_type,
  origin public.task_origin,
  kind public.task_kind NOT NULL DEFAULT 'minha',
  needs_response BOOLEAN NOT NULL DEFAULT false,
  response_channel public.response_channel,
  response_summary TEXT,
  last_followup_date DATE,
  last_followup_note TEXT,
  next_followup_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks all" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.tasks(user_id, status);
CREATE INDEX ON public.tasks(user_id, due_date);
CREATE INDEX ON public.tasks(user_id, next_followup_date);

-- Followups history
CREATE TABLE public.task_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  note TEXT,
  followup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_followup_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own followups all" ON public.task_followups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Meetings
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  participants TEXT,
  meeting_link TEXT,
  event_type public.event_type NOT NULL DEFAULT 'reuniao',
  objective TEXT,
  context TEXT,
  decisions TEXT,
  pendings TEXT,
  next_steps TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meetings all" ON public.meetings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.meetings(user_id, start_at);

-- Meeting <-> tasks
CREATE TABLE public.meeting_tasks (
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  PRIMARY KEY (meeting_id, task_id)
);
ALTER TABLE public.meeting_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meeting_tasks all" ON public.meeting_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto set completed_at when status changes to concluido
CREATE OR REPLACE FUNCTION public.set_task_completed_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status <> 'concluido') THEN
    NEW.completed_at = now();
  ELSIF NEW.status <> 'concluido' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_tasks_completed BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_task_completed_at();

-- Handle new user: profile + default products
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
