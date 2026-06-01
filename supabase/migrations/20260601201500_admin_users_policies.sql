CREATE OR REPLACE FUNCTION public.is_socio_gestor()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'socio_gestor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "socio_gestor_select_all_profiles" ON public.profiles;
CREATE POLICY "socio_gestor_select_all_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING ( public.is_socio_gestor() );
