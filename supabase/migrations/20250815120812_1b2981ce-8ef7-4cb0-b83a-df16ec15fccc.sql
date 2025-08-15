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