CREATE TABLE IF NOT EXISTS public.manychat_cancel_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motivo TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.manychat_cancel_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_cancel_reasons" ON public.manychat_cancel_reasons;
CREATE POLICY "authenticated_select_cancel_reasons" ON public.manychat_cancel_reasons
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.manychat_cancel_reasons (motivo) VALUES 
  ('Cliente não respondeu'),
  ('Cliente desistiu'),
  ('Sem interesse no momento'),
  ('Valor não aprovado'),
  ('Solicitação fora do escopo'),
  ('Duplicado'),
  ('Outro')
ON CONFLICT (motivo) DO NOTHING;

ALTER TABLE public.manychat_contatos 
  ADD COLUMN IF NOT EXISTS cancel_reason_id UUID,
  ADD COLUMN IF NOT EXISTS cancel_obs TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manychat_contatos_cancel_reason_id_fkey'
  ) THEN
    ALTER TABLE public.manychat_contatos
      ADD CONSTRAINT manychat_contatos_cancel_reason_id_fkey
      FOREIGN KEY (cancel_reason_id) REFERENCES public.manychat_cancel_reasons(id) ON DELETE SET NULL;
  END IF;
END $$;
