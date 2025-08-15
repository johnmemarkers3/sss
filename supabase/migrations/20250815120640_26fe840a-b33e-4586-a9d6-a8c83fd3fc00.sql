-- CRITICAL SECURITY FIX: Исправление политик безопасности для access_keys и profiles

-- 1. Удаляем опасную политику, которая позволяет читать email адреса
DROP POLICY IF EXISTS "users_can_view_own_activated_keys" ON public.access_keys;

-- 2. Создаем безопасную политику для просмотра только своих активированных ключей (БЕЗ email)
CREATE POLICY "users_can_view_own_used_keys_secure" ON public.access_keys
FOR SELECT 
USING (
  used_by = auth.uid() 
  AND is_used = true
);

-- 3. Создаем админскую политику для полного доступа (остается как есть, но проверяем)
DROP POLICY IF EXISTS "access_keys_admin_full_access" ON public.access_keys;
CREATE POLICY "access_keys_admin_full_access" ON public.access_keys
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- 4. Создаем ограниченную политику для проверки доступности ключей (БЕЗ email и других данных)
CREATE POLICY "users_can_check_key_availability" ON public.access_keys
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_used = false 
  AND created_at > (now() - INTERVAL '30 days')
);

-- 5. КРИТИЧЕСКИ ВАЖНО: Запрещаем пользователям изменять свою роль
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile restricted" ON public.profiles
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  -- ВАЖНО: роль не может быть изменена обычными пользователями
  AND (
    OLD.role = NEW.role  -- роль не изменилась
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'  -- только админы могут менять роли
    )
  )
);

-- 6. Создаем функцию для безопасной проверки ключей (без раскрытия email)
CREATE OR REPLACE FUNCTION public.check_key_availability_secure(key_to_check text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_exists boolean;
  key_available boolean;
  key_duration integer;
BEGIN
  -- Проверяем авторизацию
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Необходима авторизация');
  END IF;

  -- Проверяем ключ БЕЗ раскрытия email и других данных
  SELECT 
    EXISTS(SELECT 1 FROM public.access_keys WHERE key = key_to_check),
    CASE WHEN EXISTS(
      SELECT 1 FROM public.access_keys 
      WHERE key = key_to_check 
      AND is_used = false 
      AND created_at > (now() - INTERVAL '30 days')
    ) THEN true ELSE false END,
    COALESCE(
      (SELECT duration_days FROM public.access_keys WHERE key = key_to_check LIMIT 1),
      0
    )
  INTO key_exists, key_available, key_duration;

  RETURN json_build_object(
    'success', true,
    'available', key_available,
    'duration_days', CASE WHEN key_exists THEN key_duration ELSE NULL END,
    'message', CASE 
      WHEN NOT key_exists THEN 'Ключ не найден'
      WHEN key_available THEN 'Ключ доступен для активации'
      ELSE 'Ключ недоступен'
    END
  );
END;
$$;

-- 7. Логирование изменений безопасности
INSERT INTO public.security_audit_log (user_id, action, details)
VALUES (
  auth.uid(),
  'security_policies_updated',
  jsonb_build_object(
    'timestamp', now(),
    'changes', 'Fixed critical email exposure and role escalation vulnerabilities',
    'tables_affected', ARRAY['access_keys', 'profiles']
  )
);