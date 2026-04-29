DO $$
BEGIN
  -- Adicionar colunas Kanban e SLA para o CRM
  ALTER TABLE public.manychat_contatos 
    ADD COLUMN IF NOT EXISTS current_stage text DEFAULT 'novo',
    ADD COLUMN IF NOT EXISTS sla_status text DEFAULT 'green';
    
  -- Criar tabela para historico do Kanban
  CREATE TABLE IF NOT EXISTS public.mc_kanban_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manychat_id text NOT NULL,
    previous_stage text,
    new_stage text NOT NULL,
    changed_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now()
  );

  -- Criar tabela para rastreamento de SLA
  CREATE TABLE IF NOT EXISTS public.mc_sla_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manychat_id text NOT NULL,
    stage text NOT NULL,
    status text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  -- Criar tabela de log de auditoria
  CREATE TABLE IF NOT EXISTS public.mc_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id text NOT NULL,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now()
  );

  -- Semear os serviços básicos para uso no CRM/ManyChat
  INSERT INTO public.manychat_servicos (codigo, descricao, ativo) VALUES
    ('registro_marcas', 'Registro de Marcas', true),
    ('protecao_patentes', 'Proteção de Patentes', true),
    ('protecao_desenho', 'Proteção de Desenho Industrial', true),
    ('direitos_autorais', 'Direitos Autorais ou Programas de Computador', true),
    ('consultoria_pi', 'Consultoria em Propriedade Intelectual', true),
    ('assessoria_acoes', 'Assessoria em Ações Judiciais', true),
    ('outros', 'Outros Assuntos', true)
  ON CONFLICT (codigo) DO NOTHING;

  -- Configurar RLS para as novas tabelas
  DROP POLICY IF EXISTS "authenticated_all_mc_kanban_history" ON public.mc_kanban_history;
  CREATE POLICY "authenticated_all_mc_kanban_history" ON public.mc_kanban_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
  ALTER TABLE public.mc_kanban_history ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "authenticated_all_mc_sla_tracking" ON public.mc_sla_tracking;
  CREATE POLICY "authenticated_all_mc_sla_tracking" ON public.mc_sla_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);
  ALTER TABLE public.mc_sla_tracking ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "authenticated_all_mc_audit_log" ON public.mc_audit_log;
  CREATE POLICY "authenticated_all_mc_audit_log" ON public.mc_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
  ALTER TABLE public.mc_audit_log ENABLE ROW LEVEL SECURITY;
END $$;
