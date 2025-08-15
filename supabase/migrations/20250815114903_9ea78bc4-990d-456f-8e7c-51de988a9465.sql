-- Fix only the functions that don't actually need SECURITY DEFINER
-- Keep SECURITY DEFINER for functions that need elevated privileges

-- The debug_key_activation function doesn't need SECURITY DEFINER since it's just for debugging
-- Recreate it with SECURITY INVOKER (default)
CREATE OR REPLACE FUNCTION public.debug_key_activation(key_to_check text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY INVOKER  -- Changed from DEFINER to INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  key_info json;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  SELECT json_build_object(
    'key_exists', CASE WHEN k.id IS NOT NULL THEN true ELSE false END,
    'is_used', k.is_used,
    'used_by', k.used_by,
    'used_at', k.used_at,
    'expires_at', k.expires_at,
    'created_at', k.created_at,
    'duration_days', k.duration_days,
    'current_user', current_user_id,
    'key_age_days', EXTRACT(EPOCH FROM (NOW() - k.created_at)) / 86400,
    'is_expired', CASE WHEN k.created_at < (NOW() - INTERVAL '30 days') THEN true ELSE false END
  ) INTO key_info
  FROM public.access_keys k
  WHERE k.key = key_to_check;
  
  RETURN COALESCE(key_info, json_build_object('error', 'Key not found'));
END;
$function$;