-- Исправление Security Definer View проблемы

-- Удаляем view с SECURITY DEFINER если он существует
DROP VIEW IF EXISTS public.projects_with_stats;

-- Создаем обычный view без SECURITY DEFINER
CREATE VIEW public.projects_with_stats AS
SELECT 
  p.*,
  ps.units_count,
  ps.min_unit_price,
  ps.max_unit_price,
  ps.min_unit_area,
  ps.max_unit_area,
  ps.rooms_available
FROM 
  public.projects p
LEFT JOIN 
  public.project_stats ps ON p.id = ps.project_id;

-- Устанавливаем RLS для view
ALTER VIEW public.projects_with_stats SET (security_barrier = true);

-- Создаем политику для view (наследует от projects)
CREATE POLICY "Public read projects_with_stats" ON public.projects_with_stats
FOR SELECT 
USING (true);

-- Логируем исправление
PERFORM public.log_security_event(
  'security_definer_view_fixed',
  jsonb_build_object(
    'timestamp', now(),
    'view_name', 'projects_with_stats',
    'action', 'removed_security_definer_property'
  )
);