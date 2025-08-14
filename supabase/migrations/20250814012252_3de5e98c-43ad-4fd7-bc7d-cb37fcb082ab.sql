-- Allow users to read access keys for activation purposes
CREATE POLICY "Users can read keys for activation" 
ON public.access_keys 
FOR SELECT 
USING (is_used = false);

-- Fix the existing activate policy name to be more descriptive
DROP POLICY IF EXISTS "ak_activate_keys" ON public.access_keys;

CREATE POLICY "Users can activate unused keys" 
ON public.access_keys 
FOR UPDATE 
USING (is_used = false)
WITH CHECK ((used_by = auth.uid()) AND (is_used = true) AND (used_at IS NOT NULL));