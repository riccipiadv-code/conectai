DO $$
BEGIN
  -- 1. manychat_contatos changes
  ALTER TABLE public.manychat_contatos
    ADD COLUMN IF NOT EXISTS current_stage text default 'novo',
    ADD COLUMN IF NOT EXISTS sla_status text default 'green',
    ADD COLUMN IF NOT EXISTS responsible_user_id uuid references auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_stage_change_at timestamptz,
    ADD COLUMN IF NOT EXISTS sla_started_at timestamptz,
    ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
    ADD COLUMN IF NOT EXISTS deleted_by uuid references auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cancel_reason text;

  -- 2. mc_kanban_history
  CREATE TABLE IF NOT EXISTS public.mc_kanban_history (
    id uuid primary key default gen_random_uuid(),
    contato_id uuid references public.manychat_contatos(id) ON DELETE CASCADE,
    manychat_id text,
    previous_stage text,
    new_stage text,
    changed_by uuid references auth.users(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz default now()
  );

  ALTER TABLE public.mc_kanban_history
    ADD COLUMN IF NOT EXISTS contato_id uuid references public.manychat_contatos(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS notes text;

  -- 3. mc_sla_tracking
  CREATE TABLE IF NOT EXISTS public.mc_sla_tracking (
    id uuid primary key default gen_random_uuid(),
    contato_id uuid references public.manychat_contatos(id) ON DELETE CASCADE,
    manychat_id text,
    sla_start timestamptz,
    sla_due timestamptz,
    sla_status text,
    elapsed_business_hours numeric default 0,
    last_calculated_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  ALTER TABLE public.mc_sla_tracking
    ADD COLUMN IF NOT EXISTS contato_id uuid references public.manychat_contatos(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS sla_start timestamptz,
    ADD COLUMN IF NOT EXISTS sla_due timestamptz,
    ADD COLUMN IF NOT EXISTS elapsed_business_hours numeric default 0,
    ADD COLUMN IF NOT EXISTS last_calculated_at timestamptz;

  -- 4. mc_audit_log
  CREATE TABLE IF NOT EXISTS public.mc_audit_log (
    id uuid primary key default gen_random_uuid(),
    contato_id uuid references public.manychat_contatos(id) ON DELETE CASCADE,
    entity_name text,
    entity_id text,
    action text,
    field_name text,
    old_value text,
    new_value text,
    user_id uuid references auth.users(id) ON DELETE SET NULL,
    metadata jsonb,
    created_at timestamptz default now()
  );

  ALTER TABLE public.mc_audit_log
    ADD COLUMN IF NOT EXISTS contato_id uuid references public.manychat_contatos(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS entity_name text,
    ADD COLUMN IF NOT EXISTS entity_id text,
    ADD COLUMN IF NOT EXISTS field_name text,
    ADD COLUMN IF NOT EXISTS old_value text,
    ADD COLUMN IF NOT EXISTS new_value text,
    ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS metadata jsonb;

  -- 5. mc_user_profiles
  CREATE TABLE IF NOT EXISTS public.mc_user_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) ON DELETE CASCADE UNIQUE,
    role text,
    department text,
    active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

END $$;

-- Triggers to auto update updated_at
CREATE OR REPLACE FUNCTION public.update_mc_user_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_mc_user_profiles ON public.mc_user_profiles;
CREATE TRIGGER set_updated_at_mc_user_profiles
  BEFORE UPDATE ON public.mc_user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_mc_user_profiles_updated_at();

CREATE OR REPLACE FUNCTION public.update_mc_sla_tracking_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_mc_sla_tracking ON public.mc_sla_tracking;
CREATE TRIGGER set_updated_at_mc_sla_tracking
  BEFORE UPDATE ON public.mc_sla_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_mc_sla_tracking_updated_at();

-- 6. Important indexes
CREATE INDEX IF NOT EXISTS idx_manychat_contatos_manychat_id ON public.manychat_contatos(manychat_id);
CREATE INDEX IF NOT EXISTS idx_manychat_contatos_created_at ON public.manychat_contatos(created_at);
CREATE INDEX IF NOT EXISTS idx_manychat_contatos_current_stage ON public.manychat_contatos(current_stage);
CREATE INDEX IF NOT EXISTS idx_manychat_contatos_sla_status ON public.manychat_contatos(sla_status);

-- 7. Adjust RLS
ALTER TABLE public.manychat_contatos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_manychat_contatos" ON public.manychat_contatos;
DROP POLICY IF EXISTS "authenticated_select_manychat_contatos" ON public.manychat_contatos;
DROP POLICY IF EXISTS "authenticated_insert_manychat_contatos" ON public.manychat_contatos;
DROP POLICY IF EXISTS "authenticated_update_manychat_contatos" ON public.manychat_contatos;

CREATE POLICY "authenticated_select_manychat_contatos" ON public.manychat_contatos
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "authenticated_insert_manychat_contatos" ON public.manychat_contatos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_manychat_contatos" ON public.manychat_contatos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Ensure other tables have RLS
ALTER TABLE public.mc_kanban_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_mc_kanban_history" ON public.mc_kanban_history;
CREATE POLICY "authenticated_all_mc_kanban_history" ON public.mc_kanban_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.mc_sla_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_mc_sla_tracking" ON public.mc_sla_tracking;
CREATE POLICY "authenticated_all_mc_sla_tracking" ON public.mc_sla_tracking
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.mc_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_mc_audit_log" ON public.mc_audit_log;
CREATE POLICY "authenticated_all_mc_audit_log" ON public.mc_audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.mc_user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_mc_user_profiles" ON public.mc_user_profiles;
CREATE POLICY "authenticated_all_mc_user_profiles" ON public.mc_user_profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
