DO $$
BEGIN
  -- 1. Create tables
  CREATE TABLE IF NOT EXISTS public.email_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL DEFAULT 'smtp',
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    reply_to text,
    smtp_host text,
    smtp_port integer,
    smtp_user text,
    smtp_secure boolean DEFAULT true,
    secret_configured boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS public.email_secrets (
    setting_id uuid PRIMARY KEY REFERENCES public.email_settings(id) ON DELETE CASCADE,
    secret_value text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS public.email_send_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL,
    to_email text NOT NULL,
    subject text,
    status text NOT NULL,
    error_message text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
  );
END $$;

-- 2. Enable RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "auth_select_email_settings" ON public.email_settings;
  CREATE POLICY "auth_select_email_settings" ON public.email_settings FOR SELECT TO authenticated USING (true);

  DROP POLICY IF EXISTS "admin_all_email_settings" ON public.email_settings;
  CREATE POLICY "admin_all_email_settings" ON public.email_settings FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'socio_gestor'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'socio_gestor'));

  DROP POLICY IF EXISTS "no_select_email_secrets" ON public.email_secrets;
  CREATE POLICY "no_select_email_secrets" ON public.email_secrets FOR SELECT TO authenticated USING (false);

  DROP POLICY IF EXISTS "admin_insert_email_secrets" ON public.email_secrets;
  CREATE POLICY "admin_insert_email_secrets" ON public.email_secrets FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'socio_gestor'));

  DROP POLICY IF EXISTS "admin_update_email_secrets" ON public.email_secrets;
  CREATE POLICY "admin_update_email_secrets" ON public.email_secrets FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'socio_gestor'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'socio_gestor'));

  DROP POLICY IF EXISTS "admin_delete_email_secrets" ON public.email_secrets;
  CREATE POLICY "admin_delete_email_secrets" ON public.email_secrets FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'socio_gestor'));

  DROP POLICY IF EXISTS "auth_insert_email_send_logs" ON public.email_send_logs;
  CREATE POLICY "auth_insert_email_send_logs" ON public.email_send_logs FOR INSERT TO authenticated WITH CHECK (true);

  DROP POLICY IF EXISTS "auth_select_email_send_logs" ON public.email_send_logs;
  CREATE POLICY "auth_select_email_send_logs" ON public.email_send_logs FOR SELECT TO authenticated USING (true);
END $$;

-- 4. Initial seed user
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'antonio.ricci@riccipi.com.br') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'antonio.ricci@riccipi.com.br',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin Ricci"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, perfil, ativo)
    VALUES (new_user_id, 'antonio.ricci@riccipi.com.br', 'Admin Ricci', 'socio_gestor', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
