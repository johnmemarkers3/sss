import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useProjectBySlug(slug: string) {
  return useQuery({
    queryKey: ["projectBySlug", slug],
    queryFn: async () => {
      console.log("[useProjectBySlug] slug", slug);
      if (!slug) return { project: null, units: [], stats: null as any };

      // 1) Проект из основной таблицы (все поля, включая инфраструктуру и карту)
      const { data: projects, error: pErr } = await supabase
        .from("projects")
        .select("id, slug, name, description, amenities, status, tags, city, district, address, price_min, price_max, area_min, area_max, image_urls, deadline, latitude, longitude, map_embed_url")
        .eq("slug", slug)
        .limit(1);

      if (pErr) throw pErr;

      const project = projects?.[0] as any;

      if (!project) return { project: null, units: [], stats: null as any };

      // 2) Юниты проекта
      const { data: units, error: uErr } = await supabase
        .from("units")
        .select("*")
        .eq("project_id", project.id)
        .order("price", { ascending: true });

      if (uErr) throw uErr;

      const list = units ?? [];
      // 3) Локальная агрегация статистики по юнитам
      const prices = list.map((u: any) => Number(u.price)).filter((n) => !Number.isNaN(n));
      const areas = list.map((u: any) => Number(u.area)).filter((n) => !Number.isNaN(n));
      const rooms = Array.from(new Set(list.map((u: any) => u.rooms))).sort((a, b) => a - b);

      const stats = {
        min_unit_price: prices.length ? Math.min(...prices) : null,
        max_unit_price: prices.length ? Math.max(...prices) : null,
        min_unit_area: areas.length ? Math.min(...areas) : null,
        max_unit_area: areas.length ? Math.max(...areas) : null,
        rooms_available: rooms,
        units_count: list.length,
      };

      return { project, units: list, stats };
    },
    staleTime: 30_000,
    gcTime: 300_000,
    meta: {
      onError: (error: unknown) => {
        console.error("[useProjectBySlug] error", error);
        toast({
          title: "Не удалось загрузить объект",
          description: "Повторите попытку позже",
        });
      },
    },
  });
}
