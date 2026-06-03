DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manychat_contatos_responsible_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.manychat_contatos
    ADD CONSTRAINT manychat_contatos_responsible_user_id_profiles_fkey 
    FOREIGN KEY (responsible_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
