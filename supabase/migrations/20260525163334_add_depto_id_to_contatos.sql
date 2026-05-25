-- Add depto_id column
ALTER TABLE public.manychat_contatos ADD COLUMN IF NOT EXISTS depto_id INTEGER;

-- Add foreign key
DO $DO$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manychat_contatos_depto_id_fkey'
  ) THEN
    ALTER TABLE public.manychat_contatos 
      ADD CONSTRAINT manychat_contatos_depto_id_fkey 
      FOREIGN KEY (depto_id) REFERENCES public.manychat_deptos(id) ON DELETE SET NULL;
  END IF;
END $DO$;

-- Seed manychat_deptos data
INSERT INTO public.manychat_deptos (id, nome) VALUES
  (1, 'Marcas'),
  (2, 'Patentes'),
  (3, 'Consultivo'),
  (4, 'Contencioso'),
  (5, 'Outros'),
  (6, 'Internacional')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;
