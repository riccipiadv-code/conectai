-- Make legacy fields in mc_audit_log nullable
ALTER TABLE public.mc_audit_log ALTER COLUMN table_name DROP NOT NULL;
ALTER TABLE public.mc_audit_log ALTER COLUMN record_id DROP NOT NULL;

-- Make legacy fields in mc_sla_tracking nullable
ALTER TABLE public.mc_sla_tracking ALTER COLUMN stage DROP NOT NULL;
ALTER TABLE public.mc_sla_tracking ALTER COLUMN status DROP NOT NULL;

-- Ensure unique index on manychat_contact_attributes to allow upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_manychat_contact_attributes_unique 
ON public.manychat_contact_attributes(manychat_id, attribute_key);
