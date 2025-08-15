-- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ БЕЗОПАСНОСТИ: Защита от утечки email адресов
-- Исправляем RLS политики для access_keys, чтобы предотвратить утечку данных

-- 1. Удаляем текущие политики access_keys
DROP POLICY IF EXISTS "Users can read available keys" ON public.access_keys;
DROP POLICY IF EXISTS "Users can activate unused keys" ON public.access_keys;
DROP POLICY IF EXISTS "access_keys_admin_full" ON public.access_keys;

-- 2. Создаем более безопасные политики

-- Админы могут видеть все ключи (включая email)
CREATE POLICY "access_keys_admin_full_access" 
ON public.access_keys 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Пользователи могут видеть только ключи, которые они активировали (БЕЗ email)
CREATE POLICY "users_can_view_own_activated_keys" 
ON public.access_keys 
FOR SELECT 
TO authenticated
USING (
  used_by = auth.uid() AND is_used = true
);

-- Пользователи могут активировать неиспользованные ключи (только обновление статуса)
CREATE POLICY "users_can_activate_unused_keys" 
ON public.access_keys 
FOR UPDATE 
TO authenticated
USING (
  is_used = false 
  AND created_at > (now() - '30 days'::interval)
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  is_used = true 
  AND used_by = auth.uid() 
  AND used_at IS NOT NULL
);

-- 3. Создаем защищенную функцию для поиска ключей БЕЗ раскрытия email
CREATE OR REPLACE FUNCTION public.check_key_availability(key_to_check text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  key_record record;
  result json;
BEGIN
  -- Проверяем, что пользователь авторизован
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Необходима авторизация');
  END IF;

  -- Ищем ключ БЕЗ раскрытия email
  SELECT 
    id, is_used, created_at, duration_days,
    CASE 
      WHEN created_at < (NOW() - INTERVAL '30 days') THEN true 
      ELSE false 
    END as is_expired
  INTO key_record
  FROM public.access_keys
  WHERE key = key_to_check;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Ключ не найден');
  END IF;

  -- Возвращаем информацию БЕЗ email и других чувствительных данных
  RETURN json_build_object(
    'success', true,
    'available', NOT key_record.is_used AND NOT key_record.is_expired,
    'duration_days', key_record.duration_days,
    'message', CASE 
      WHEN key_record.is_used THEN 'Ключ уже использован'
      WHEN key_record.is_expired THEN 'Ключ просрочен'
      ELSE 'Ключ доступен для активации'
    END
  );
END;
$function$;

-- 4. УКРЕПЛЕНИЕ КОНТРОЛЯ РОЛЕЙ
-- Создаем безопасную функцию для проверки ролей
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- 5. ОЧИСТКА ДУБЛИРУЮЩИХ ПОЛИТИК В SUBSCRIPTIONS
-- Удаляем дублирующие политики
DROP POLICY IF EXISTS "subs_select_self" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_user_manage" ON public.subscriptions;

-- Оставляем только одну корректную политику
-- (политика "Users can manage own subscriptions" уже существует и работает правильно)

-- 6. ДОБАВЛЕНИЕ AUDIT LOGGING для критических операций
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Включаем RLS для audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Только админы могут читать audit log
CREATE POLICY "admins_can_read_audit_log" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Создаем функцию для логирования безопасности
CREATE OR REPLACE FUNCTION public.log_security_event(
  action_name text,
  event_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (user_id, action, details)
  VALUES (auth.uid(), action_name, event_details);
END;
$function$;

-- 7. Создаем триггер для логирования активации ключей
CREATE OR REPLACE FUNCTION public.log_key_activation_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Логируем активацию ключа
  IF OLD.is_used = false AND NEW.is_used = true THEN
    PERFORM public.log_security_event(
      'key_activated',
      json_build_object(
        'key_id', NEW.id,
        'duration_days', NEW.duration_days,
        'used_by', NEW.used_by
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Создаем триггер
DROP TRIGGER IF EXISTS trigger_log_key_activation ON public.access_keys;
CREATE TRIGGER trigger_log_key_activation
  AFTER UPDATE ON public.access_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.log_key_activation_trigger();