DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'antonio.ricci@riccipi.com.br') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'antonio.ricci@riccipi.com.br',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Antonio Ricci"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, perfil, ativo)
    SELECT id, email, 'Antonio Ricci', 'socio_gestor', true
    FROM auth.users WHERE email = 'antonio.ricci@riccipi.com.br'
    ON CONFLICT (id) DO NOTHING;
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('Skip@Pass', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE email = 'antonio.ricci@riccipi.com.br';
  END IF;
END $$;
