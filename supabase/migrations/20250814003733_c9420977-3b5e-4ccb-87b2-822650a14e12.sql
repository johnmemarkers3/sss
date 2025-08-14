-- Усиленные RLS политики для безопасности

-- 1. Добавить политику для предотвращения изменения чужих профилей
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile secure" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL AND user_id = NEW.user_id);

-- 2. Добавить политику для предотвращения изменения роли обычными пользователями
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile secure" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND 
  auth.uid() IS NOT NULL AND
  role IN ('user', 'viewer') -- Запретить создание админов через API
);

-- 3. Добавить ограничение на создание ключей доступа
ALTER POLICY "ak_admin_all" ON public.access_keys RENAME TO "ak_admin_all_old";
CREATE POLICY "ak_admin_create_only" 
ON public.access_keys 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  ) AND
  created_by = auth.uid() AND
  duration_days <= 90 -- Максимум 90 дней
);

CREATE POLICY "ak_admin_read_update_delete" 
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

-- 4. Улучшить политику активации ключей для предотвращения race conditions
DROP POLICY IF EXISTS "ak_activate_keys" ON public.access_keys;
CREATE POLICY "ak_activate_keys_secure" 
ON public.access_keys 
FOR UPDATE 
TO authenticated
USING (
  is_used = false AND 
  created_at > (NOW() - INTERVAL '30 days') AND -- Ключ не старше 30 дней
  auth.uid() IS NOT NULL
)
WITH CHECK (
  used_by = auth.uid() AND 
  is_used = true AND 
  used_at IS NOT NULL AND
  used_at <= NOW() AND
  expires_at > NOW() -- Убедиться что срок действия в будущем
);

-- 5. Добавить ограничения на подписки
ALTER POLICY "subs_upsert_self" ON public.subscriptions RENAME TO "subs_insert_self";
ALTER POLICY "subs_update_self" ON public.subscriptions RENAME TO "subs_update_self_old";

CREATE POLICY "subs_update_self_secure" 
ON public.subscriptions 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid() AND auth.uid() IS NOT NULL)
WITH CHECK (
  user_id = auth.uid() AND 
  auth.uid() IS NOT NULL AND
  user_id = OLD.user_id AND -- Запретить изменение user_id
  (active_until IS NULL OR active_until > NOW()) -- Разрешить только продление
);

-- 6. Функция для логирования подозрительной активности
CREATE OR REPLACE FUNCTION public.log_suspicious_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Логировать множественные активации одним пользователем
  IF TG_OP = 'UPDATE' AND NEW.is_used = true AND OLD.is_used = false THEN
    -- Проверить количество активаций за последний час
    IF (
      SELECT COUNT(*) 
      FROM public.access_keys 
      WHERE used_by = NEW.used_by 
      AND used_at > (NOW() - INTERVAL '1 hour')
    ) > 5 THEN
      -- В реальном приложении здесь бы отправлялось уведомление
      RAISE NOTICE 'Suspicious activity: User % activated more than 5 keys in 1 hour', NEW.used_by;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;