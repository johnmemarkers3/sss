-- Fix security definer view issue by recreating projects_with_stats view without SECURITY DEFINER
-- This ensures the view runs with querying user's permissions instead of view creator's

-- Drop the existing view
DROP VIEW IF EXISTS public.projects_with_stats;

-- Recreate the view without SECURITY DEFINER (uses default SECURITY INVOKER)
CREATE VIEW public.projects_with_stats AS
SELECT 
    p.*,
    ps.units_count,
    ps.min_unit_price,
    ps.max_unit_price,
    ps.min_unit_area,
    ps.max_unit_area,
    ps.rooms_available
FROM public.projects p
LEFT JOIN public.project_stats ps ON p.id = ps.project_id;