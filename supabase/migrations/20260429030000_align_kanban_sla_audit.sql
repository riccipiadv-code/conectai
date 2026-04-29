-- Aligning schema for manychat_contatos
ALTER TABLE public.manychat_contatos
ADD COLUMN IF NOT EXISTS current_stage text DEFAULT 'novo',
ADD COLUMN IF NOT EXISTS sla_status text DEFAULT 'green',
ADD COLUMN IF NOT EXISTS responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_stage_change_at timestamptz,
ADD COLUMN IF NOT EXISTS sla_started_at timestamptz,
ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancel_reason text,
ADD COLUMN IF NOT EXISTS manual_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS manual_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Aligning schema for mc_kanban_history
ALTER TABLE public.mc_kanban_history
ADD COLUMN IF NOT EXISTS contato_id uuid REFERENCES public.manychat_contatos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS manychat_id text,
ADD COLUMN IF NOT EXISTS previous_stage text,
ADD COLUMN IF NOT EXISTS new_stage text,
ADD COLUMN IF NOT EXISTS changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notes text;

-- Aligning schema for mc_sla_tracking
ALTER TABLE public.mc_sla_tracking
ADD COLUMN IF NOT EXISTS contato_id uuid REFERENCES public.manychat_contatos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS manychat_id text,
ADD COLUMN IF NOT EXISTS sla_start timestamptz,
ADD COLUMN IF NOT EXISTS sla_due timestamptz,
ADD COLUMN IF NOT EXISTS sla_status text,
ADD COLUMN IF NOT EXISTS elapsed_business_hours numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_calculated_at timestamptz;

-- Aligning schema for mc_audit_log
ALTER TABLE public.mc_audit_log
ADD COLUMN IF NOT EXISTS contato_id uuid REFERENCES public.manychat_contatos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS entity_name text,
ADD COLUMN IF NOT EXISTS entity_id text,
ADD COLUMN IF NOT EXISTS action text,
ADD COLUMN IF NOT EXISTS field_name text,
ADD COLUMN IF NOT EXISTS old_value text,
ADD COLUMN IF NOT EXISTS new_value text,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Creating indexes
CREATE INDEX IF NOT EXISTS idx_manychat_contatos_manychat_id ON public.manychat_contatos(manychat_id);
CREATE INDEX IF NOT EXISTS idx_manychat_contatos_created_at ON public.manychat_contatos(created_at);
CREATE INDEX IF NOT EXISTS idx_manychat_contatos_current_stage ON public.manychat_contatos(current_stage);
CREATE INDEX IF NOT EXISTS idx_manychat_contatos_sla_status ON public.manychat_contatos(sla_status);
