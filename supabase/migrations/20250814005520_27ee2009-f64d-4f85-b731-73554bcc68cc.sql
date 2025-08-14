-- КРИТИЧЕСКАЯ ПРОБЛЕМА БЕЗОПАСНОСТИ: Fix публичный доступ к ключам
-- Удаляем публичную политику чтения для access_keys
DROP POLICY IF EXISTS ak_select_all ON public.access_keys;

-- Создаем безопасные политики только для админов
CREATE POLICY "Admins can view access keys" ON public.access_keys
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Исправляем функции с небезопасным search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Удаляем небезопасные views с SECURITY DEFINER (если есть)
-- Создаем безопасную замену для view project_stats
DROP VIEW IF EXISTS public.project_stats;

-- Пересоздаем project_stats как материализованное представление без SECURITY DEFINER
CREATE MATERIALIZED VIEW public.project_stats AS
SELECT 
  p.id AS project_id,
  COUNT(u.id) AS units_count,
  MIN(u.price) AS min_unit_price,
  MAX(u.price) AS max_unit_price,
  MIN(u.area) AS min_unit_area,
  MAX(u.area) AS max_unit_area,
  array_agg(DISTINCT u.rooms ORDER BY u.rooms) AS rooms_available
FROM public.projects p
LEFT JOIN public.units u ON p.id = u.project_id
GROUP BY p.id;

-- Создаем индекс для производительности
CREATE UNIQUE INDEX idx_project_stats_project_id ON public.project_stats (project_id);

-- Включаем RLS для материализованного представления
ALTER MATERIALIZED VIEW public.project_stats OWNER TO postgres;

-- Создаем политику для чтения статистики проектов
CREATE POLICY "Public read project stats" ON public.project_stats
FOR SELECT USING (true);

-- Создаем функцию для обновления статистики
CREATE OR REPLACE FUNCTION public.refresh_project_stats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.project_stats;
$$;

-- Создаем триггеры для автоматического обновления статистики
CREATE OR REPLACE FUNCTION public.trigger_refresh_project_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Отложенное обновление статистики
  PERFORM pg_notify('refresh_project_stats', '');
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Добавляем триггеры на изменения проектов и юнитов
DROP TRIGGER IF EXISTS trigger_units_stats_refresh ON public.units;
DROP TRIGGER IF EXISTS trigger_projects_stats_refresh ON public.projects;

CREATE TRIGGER trigger_units_stats_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_refresh_project_stats();

CREATE TRIGGER trigger_projects_stats_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_refresh_project_stats();