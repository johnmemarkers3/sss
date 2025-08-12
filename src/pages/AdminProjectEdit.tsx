import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
type Project = {
  id: string;
  name: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  infrastructure_nearby: string[] | null;
  map_embed_url: string | null;
};

export default function AdminProjectEdit() {
  const { id } = useParams();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["adminProject", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, slug, city, district, address, infrastructure_nearby, map_embed_url")
        .eq("id", id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
    staleTime: 10_000,
    gcTime: 60_000,
    meta: {
      onError: (error: unknown) => {
        console.error("[AdminProjectEdit] load error", error);
        toast({ title: "Не удалось загрузить проект", description: "Попробуйте позже" });
      },
    },
  });
  const { user, isAdmin } = useAuth();
  const project = data;

  const [infraText, setInfraText] = useState<string>("");
  const [mapEmbed, setMapEmbed] = useState<string>("");
  useEffect(() => {
    if (project) {
      setInfraText((project.infrastructure_nearby ?? []).join("\n"));
      setMapEmbed(project.map_embed_url ?? "");
    }
  }, [project?.id]);

  if (isLoading) return <div className="container py-6">Загрузка…</div>;
  if (!user) return <Navigate to="/admin" replace />;
  if (!isAdmin) return <div className="container py-6">Нет доступа</div>;

  const parseInfra = (text: string) => {
    return text
      .split(/\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleSave = async () => {
    if (!id) return;
    const infra = parseInfra(infraText);
    const payload: Partial<Project> = {
      infrastructure_nearby: infra,
      map_embed_url: mapEmbed.trim() || null,
    };

    console.log("[AdminProjectEdit] updating", { id, payload });

    const { error } = await supabase
      .from("projects")
      .update(payload as any)
      .eq("id", id);

    if (error) {
      console.error("[AdminProjectEdit] update error", error);
      toast({
        title: "Не удалось сохранить",
        description: error.message ?? String(error),
      });
      return;
    }

    toast({ title: "Сохранено", description: "Данные проекта обновлены" });
    refetch();
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline">
          <Link to="/admin/projects"><ArrowLeft className="mr-2" /> Назад</Link>
        </Button>
        {project && <div className="text-sm text-muted-foreground">/{project.slug}</div>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Редактирование проекта</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading && <div className="text-sm text-muted-foreground">Загрузка...</div>}
          {!isLoading && !project && <div className="text-sm text-muted-foreground">Проект не найден</div>}
          {project && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Название</Label>
                  <Input value={project.name} readOnly />
                </div>
                <div>
                  <Label className="text-muted-foreground">Адрес</Label>
                  <Input value={`${project.city}, ${project.district}, ${project.address}`} readOnly />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Инфраструктура рядом</Label>
                <Textarea
                  placeholder="Каждый пункт с новой строки, или через запятую"
                  value={infraText}
                  onChange={(e) => setInfraText(e.target.value)}
                  rows={6}
                />
                <div className="text-xs text-muted-foreground">
                  Пример: Парковка во дворе, Парк в 5 минутах, Торговый центр рядом
                </div>
              </div>

              <div className="space-y-2">
                <Label>Карта (embed URL или iframe)</Label>
                <Textarea
                  placeholder="Вставьте ссылку на карту или код iframe"
                  value={mapEmbed}
                  onChange={(e) => setMapEmbed(e.target.value)}
                  rows={4}
                />
                <div className="text-xs text-muted-foreground">
                  Можно вставить URL (https://...) или HTML-код iframe — мы извлечём src автоматически.
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave}>Сохранить</Button>
                <Button asChild variant="outline">
                  <Link to={project.slug ? `/project/${project.slug}` : "#"} target="_blank">Открыть страницу</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

