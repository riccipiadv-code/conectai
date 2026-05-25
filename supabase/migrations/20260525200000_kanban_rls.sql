DROP POLICY IF EXISTS "authenticated_insert_mc_kanban_history" ON public.mc_kanban_history;
CREATE POLICY "authenticated_insert_mc_kanban_history" ON public.mc_kanban_history
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_select_mc_kanban_history" ON public.mc_kanban_history;
CREATE POLICY "authenticated_select_mc_kanban_history" ON public.mc_kanban_history
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_update_manychat_contatos" ON public.manychat_contatos;
CREATE POLICY "authenticated_update_manychat_contatos" ON public.manychat_contatos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
