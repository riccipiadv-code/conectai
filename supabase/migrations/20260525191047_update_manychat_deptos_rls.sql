-- Enable RLS on manychat_deptos
ALTER TABLE public.manychat_deptos ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "authenticated_select_manychat_deptos" ON public.manychat_deptos;
CREATE POLICY "authenticated_select_manychat_deptos" ON public.manychat_deptos
  FOR SELECT TO authenticated USING (true);

-- Ensure all existing records are set to ativo = true
UPDATE public.manychat_deptos SET ativo = true WHERE ativo IS DISTINCT FROM true;
