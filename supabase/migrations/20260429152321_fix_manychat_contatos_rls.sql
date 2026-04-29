-- Enable RLS just to be sure
ALTER TABLE public.manychat_contatos ENABLE ROW LEVEL SECURITY;

-- Drop policies to ensure idempotency
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.manychat_contatos;
DROP POLICY IF EXISTS "authenticated_update_manychat_contatos" ON public.manychat_contatos;

-- Create policy for UPDATE
CREATE POLICY "Allow update for authenticated users" 
ON public.manychat_contatos
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);
