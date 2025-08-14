-- Разрешить аутентифицированным пользователям активировать ключи
CREATE POLICY "ak_activate_keys" 
ON public.access_keys 
FOR UPDATE 
TO authenticated
USING (is_used = false)  -- Можно обновлять только неиспользованные ключи
WITH CHECK (
  -- Проверяем, что пользователь устанавливает себя как used_by
  used_by = auth.uid() AND 
  is_used = true AND 
  used_at IS NOT NULL
);