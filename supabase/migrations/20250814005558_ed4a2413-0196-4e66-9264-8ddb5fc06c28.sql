-- КРИТИЧЕСКАЯ ПРОБЛЕМА БЕЗОПАСНОСТИ: Fix публичный доступ к ключам
-- Сначала удаляем зависимости каскадно
DROP VIEW IF EXISTS public.projects_with_stats CASCADE;
DROP VIEW IF EXISTS public.project_stats CASCADE;

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

-- Пересоздаем project_stats как обычную таблицу для лучшей производительности
CREATE TABLE public.project_stats (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  units_count bigint DEFAULT 0,
  min_unit_price numeric,
  max_unit_price numeric,
  min_unit_area numeric,
  max_unit_area numeric,
  rooms_available integer[] DEFAULT '{}'
);

-- Включаем RLS
ALTER TABLE public.project_stats ENABLE ROW LEVEL SECURITY;

-- Создаем публичную политику чтения
CREATE POLICY "Public read project stats" ON public.project_stats
FOR SELECT USING (true);

-- Создаем админскую политику для изменений
CREATE POLICY "Admins manage project stats" ON public.project_stats
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Пересоздаем представление projects_with_stats
CREATE VIEW public.projects_with_stats AS
SELECT 
  p.*,
  COALESCE(ps.units_count, 0) as units_count,
  ps.min_unit_price,
  ps.max_unit_price,
  ps.min_unit_area,
  ps.max_unit_area,
  COALESCE(ps.rooms_available, '{}') as rooms_available
FROM public.projects p
LEFT JOIN public.project_stats ps ON p.id = ps.project_id;

-- Создаем функцию для пересчета статистики проекта
CREATE OR REPLACE FUNCTION public.recalculate_project_stats(project_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.project_stats (
    project_id,
    units_count,
    min_unit_price,
    max_unit_price,
    min_unit_area,
    max_unit_area,
    rooms_available
  )
  SELECT 
    project_uuid,
    COUNT(u.id),
    MIN(u.price),
    MAX(u.price),
    MIN(u.area),
    MAX(u.area),
    array_agg(DISTINCT u.rooms ORDER BY u.rooms)
  FROM public.units u
  WHERE u.project_id = project_uuid
  ON CONFLICT (project_id) DO UPDATE SET
    units_count = EXCLUDED.units_count,
    min_unit_price = EXCLUDED.min_unit_price,
    max_unit_price = EXCLUDED.max_unit_price,
    min_unit_area = EXCLUDED.min_unit_area,
    max_unit_area = EXCLUDED.max_unit_area,
    rooms_available = EXCLUDED.rooms_available;
END;
$$;

-- Создаем триггеры для автоматического обновления статистики
CREATE OR REPLACE FUNCTION public.trigger_recalculate_project_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_project_stats(OLD.project_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_project_stats(NEW.project_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Добавляем триггеры
CREATE TRIGGER trigger_units_recalc_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalculate_project_stats();

-- Заполняем начальные данные
INSERT INTO public.project_stats (project_id, units_count, min_unit_price, max_unit_price, min_unit_area, max_unit_area, rooms_available)
SELECT 
  p.id,
  COALESCE(COUNT(u.id), 0),
  MIN(u.price),
  MAX(u.price),
  MIN(u.area),
  MAX(u.area),
  CASE WHEN COUNT(u.id) > 0 THEN array_agg(DISTINCT u.rooms ORDER BY u.rooms) ELSE '{}' END
FROM public.projects p
LEFT JOIN public.units u ON p.id = u.project_id
GROUP BY p.id
ON CONFLICT (project_id) DO NOTHING;