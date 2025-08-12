
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type PropertyStatus = Database["public"]["Enums"]["property_status"];

type Params = {
  limit?: number;
  search?: string;
  city?: string;
  district?: string;
  status?: PropertyStatus;
  hasAvailable?: boolean;
};

export function useProjectsList(params: Params = {}) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: async () => {
      console.log("[useProjectsList] fetching with params", params);
      let q = supabase.from("projects_with_stats").select("*");

      // Поиск по названию/адресу/городу/району
      if (params.search && params.search.trim()) {
        const s = params.search.trim();
        q = q.or(`name.ilike.%${s}%,address.ilike.%${s}%,city.ilike.%${s}%,district.ilike.%${s}%`);
      }

      if (params.city) q = q.eq("city", params.city);
      if (params.district) q = q.eq("district", params.district);
      if (params.status) q = q.eq("status", params.status);
      if (params.hasAvailable) q = q.not("min_unit_price", "is", null);
      q = q.order("created_at", { ascending: false });

      if (params.limit) q = q.limit(params.limit);

      const { data, error } = await q;
      if (error) throw error;

      return {
        projects: data ?? []
      };
    },
    staleTime: 30_000,
    gcTime: 300_000,
    meta: {
      onError: (error: unknown) => {
        console.error("[useProjectsList] error", error);
        toast({
          title: "Не удалось загрузить список объектов",
          description: "Попробуйте изменить фильтры или повторите позже",
        });
      },
    },
  });
}
