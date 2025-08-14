-- Fix RLS policy for access_keys table to allow key activation
-- The current UPDATE policy is incorrect and prevents key activation

-- Drop the existing problematic UPDATE policy
DROP POLICY IF EXISTS "Simple key activation" ON public.access_keys;

-- Create a proper UPDATE policy that allows authenticated users to activate unused keys
CREATE POLICY "Users can activate unused keys" 
ON public.access_keys 
FOR UPDATE 
USING (
  -- Allow update if the key is currently unused, not expired, and user is authenticated
  (is_used = false) 
  AND (created_at > (now() - '30 days'::interval))
  AND (auth.uid() IS NOT NULL)
)
WITH CHECK (
  -- After update, ensure the key is marked as used by the current user
  (is_used = true)
  AND (used_by = auth.uid())
  AND (used_at IS NOT NULL)
);

-- Also ensure users can read keys they're trying to activate
-- Update the existing SELECT policy to be more permissive for authenticated users
DROP POLICY IF EXISTS "access_keys_read_unused" ON public.access_keys;

CREATE POLICY "Users can read available keys" 
ON public.access_keys 
FOR SELECT 
USING (
  -- Allow reading unused keys within 30 days, or keys used by current user
  (
    (is_used = false AND created_at > (now() - '30 days'::interval))
    OR (used_by = auth.uid())
  )
  AND (auth.uid() IS NOT NULL)
);