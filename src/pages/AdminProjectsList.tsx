import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  district: string;
  updated_at: string;
};

export default function AdminProjectsList() {
  const { user, isAdmin, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const load = async () => {
    setLoadingList(true);
    console.log("[AdminProjectsList] loading projects");
    let query = supabase
      .from("projects")
      .select("id, name, slug, city, district, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (search.trim()) {
      const s = search.trim();
      query = query.or(`name.ilike.%${s}%,slug.ilike.%${s}%,city.ilike.%${s}%,district.ilike.%${s}%`);
    }

  const { data, error } = await query;
    setLoadingList(false);
    if (error) {
      console.error("[AdminProjectsList] error", error);
      toast({ title: "Ошибка загрузки проектов", description: String(error.message || error) });
      return;
    }
    setProjects((data as any[]) as ProjectRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="container py-6">Загрузка…</div>;
  if (!user) return <Navigate to="/admin" replace />;
  if (!isAdmin) return <div className="container py-6">Нет доступа</div>;

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Проекты</h1>
        <Button variant="outline" onClick={load} disabled={loading}>
          Обновить
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Поиск по названию, slug, городу, району"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={load} disabled={loadingList}>Искать</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium truncate">{p.name}</div>
                <Badge variant="secondary">{new Date(p.updated_at).toLocaleDateString()}</Badge>
              </div>
              <div className="text-sm text-muted-foreground truncate">{p.city}, {p.district}</div>
              <div className="text-xs text-muted-foreground">/{p.slug}</div>
              <div className="pt-2">
                <Button asChild size="sm">
                  <Link to={`/admin/projects/${p.id}`}>Редактировать</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && !loading && (
        <div className="text-center text-muted-foreground py-12">Нет проектов</div>
      )}
    </div>
  );
}

