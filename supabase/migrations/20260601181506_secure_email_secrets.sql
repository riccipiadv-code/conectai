-- Drop all existing policies that allow access to the email_secrets table from the client
DROP POLICY IF EXISTS "Authenticated users can insert email secrets" ON public.email_secrets;
DROP POLICY IF EXISTS "admin_insert_email_secrets" ON public.email_secrets;
DROP POLICY IF EXISTS "admin_update_email_secrets" ON public.email_secrets;
DROP POLICY IF EXISTS "admin_delete_email_secrets" ON public.email_secrets;
DROP POLICY IF EXISTS "no_select_email_secrets" ON public.email_secrets;

-- Ensure RLS is enabled so that only service_role (which bypasses RLS) can access it
ALTER TABLE public.email_secrets ENABLE ROW LEVEL SECURITY;
