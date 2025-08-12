import { Helmet } from "react-helmet-async";
import { useState } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useProjectsList } from "@/hooks/useProjectsList";
import ProjectCard from "@/components/catalog/ProjectCard";
import { Link } from "react-router-dom";
import StableInstallmentCalculator from "@/components/StableInstallmentCalculator";
export default function Home() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useProjectsList({ limit: 12, search: query });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Новостройки Чеченской Республики — Главная</title>
        <meta name="description" content="Новостройки Чеченской Республики — актуальные объекты: описание, фото, планировки и цены. Найдите подходящую недвижимость быстро и удобно." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
      </Helmet>

      <SiteHeader>
        <div className="relative flex-1 max-w-2xl">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию, адресу или городу"
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        </div>
        <div className="hidden sm:flex gap-3">
          <Button asChild variant="outline"><Link to="/catalog">Каталог</Link></Button>
          <StableInstallmentCalculator />
        </div>
      </SiteHeader>

      <main className="container py-8 space-y-8">
        <section className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold">Новостройки Чеченской Республики</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Современная база объектов: смотрите фото, характеристики и планировки. Нажмите на объект, чтобы открыть подробную страницу с квартирами.
          </p>
          <div className="sm:hidden">
            <div className="flex gap-2 justify-center">
              <Button asChild variant="outline"><Link to="/catalog">Каталог</Link></Button>
              <StableInstallmentCalculator />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Актуальные объекты</h2>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/catalog">Все объекты</Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Card key={i} className="overflow-hidden animate-fade-in">
                  <Skeleton className="h-40 w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(data?.projects ?? []).map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}

          {!isLoading && (data?.projects?.length ?? 0) === 0 && (
            <p className="text-center text-muted-foreground">Пока нет опубликованных объектов</p>
          )}
        </section>
      </main>
    </div>
  );
}
