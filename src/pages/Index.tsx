import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, Search, SlidersHorizontal, History, Star } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import ProjectCard from "@/components/catalog/ProjectCard";
import { Link } from "react-router-dom";
import { useProjectsList } from "@/hooks/useProjectsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StableInstallmentCalculator from "@/components/StableInstallmentCalculator";
import { useIsMobile } from "@/hooks/use-mobile";
const PAGE_SIZE = 12;

type Filters = {
  query: string;
  price: [number, number];
  area: [number, number];
  rooms: number[];
  city?: string;
  district?: string;
  status?: "В продаже" | "Сдан" | "Забронировано";
  favoritesOnly: boolean;
  hasAvailable: boolean;
};

function useDebounced<T>(value: T, delay = 300) {
  const [deb, setDeb] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDeb(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return deb;
}

const Index = () => {
  const isMobile = useIsMobile();
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem("favorites") || "[]"));
  const [viewHistory, setViewHistory] = useState<any[]>(() => JSON.parse(localStorage.getItem("viewHistory") || "[]"));
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState<Filters>({
    query: "",
    price: [0, 50_000_000],
    area: [20, 200],
    rooms: [],
    city: undefined,
    district: undefined,
    status: undefined,
    favoritesOnly: false,
    hasAvailable: true,
  });

  const debounced = useDebounced(filters, 300);

  const { data, isLoading } = useProjectsList({
    limit: PAGE_SIZE * 5,
    search: debounced.query,
    city: debounced.city,
    district: debounced.district,
    status: debounced.status as any,
    hasAvailable: debounced.hasAvailable,
  });

  useEffect(() => { localStorage.setItem("favorites", JSON.stringify(favorites)); }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleProjectView = (projectId: string) => {
    // Обновляем историю просмотров
    const history = JSON.parse(localStorage.getItem("viewHistory") || "[]");
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const newItem = {
        id: project.id,
        slug: project.slug,
        name: project.name,
        image: project.image_urls?.[0],
        viewedAt: new Date().toISOString()
      };
      const updatedHistory = [newItem, ...history.filter((item: any) => item.id !== projectId)].slice(0, 10);
      localStorage.setItem("viewHistory", JSON.stringify(updatedHistory));
      setViewHistory(updatedHistory);
    }
  };

  const projects = data?.projects ?? [];

  const dynamicCities = useMemo(() => Array.from(new Set(projects.map(p => p.city).filter(Boolean))), [projects]);
  const dynamicDistricts = useMemo(() => Array.from(new Set(projects.map(p => p.district).filter(Boolean))), [projects]);

  const filtered = useMemo(() => {
    let list = projects;
    
    // Применяем фильтры в зависимости от активной вкладки
    if (activeTab === "favorites") {
      list = list.filter(p => favorites.includes(p.id as string));
    } else if (activeTab === "history") {
      const historyIds = viewHistory.map(h => h.id);
      list = list.filter(p => historyIds.includes(p.id));
      // Сортируем по времени просмотра
      list.sort((a, b) => {
        const aTime = viewHistory.find(h => h.id === a.id)?.viewedAt || '';
        const bTime = viewHistory.find(h => h.id === b.id)?.viewedAt || '';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    } else {
      // Обычные фильтры для вкладки "Все"
      if (debounced.rooms.length) list = list.filter(p => (p.rooms_available || []).some((r: number) => debounced.rooms.includes(Number(r))));
      list = list.filter(p => {
        const minP = Number(p.min_unit_price ?? 0);
        const maxP = Number(p.max_unit_price ?? 0);
        return maxP >= debounced.price[0] && minP <= debounced.price[1];
      });
      list = list.filter(p => {
        const minA = Number(p.min_unit_area ?? 0);
        const maxA = Number(p.max_unit_area ?? 0);
        return (!minA && !maxA) || (maxA >= debounced.area[0] && minA <= debounced.area[1]);
      });
      if (debounced.favoritesOnly) list = list.filter(p => favorites.includes(p.id as string));
    }
    
    return list;
  }, [projects, debounced, favorites, viewHistory, activeTab]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [debounced, activeTab]);

  const resetFilters = () => setFilters({ 
    query: "", 
    price: [0, 50_000_000], 
    area: [20, 200], 
    rooms: [], 
    city: undefined, 
    district: undefined, 
    status: undefined, 
    favoritesOnly: false, 
    hasAvailable: true 
  });

  const FiltersPanel = (
    <div className="w-full space-y-4 px-4 sm:px-0">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-sm text-muted-foreground">Цена, ₽</label>
          <Slider min={0} max={50_000_000} step={100_000} value={[filters.price[0], filters.price[1]]} onValueChange={(v) => setFilters({ ...filters, price: [v[0], v[1]] as [number, number] })} />
          <div className="text-xs text-muted-foreground mt-1">от {filters.price[0].toLocaleString()} до {filters.price[1].toLocaleString()}</div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Площадь, м²</label>
          <Slider min={20} max={200} step={1} value={[filters.area[0], filters.area[1]]} onValueChange={(v) => setFilters({ ...filters, area: [v[0], v[1]] as [number, number] })} />
          <div className="text-xs text-muted-foreground mt-1">от {filters.area[0]} до {filters.area[1]}</div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Комнаты</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {[1,2,3,4].map(n => (
              <label key={n} className="flex items-center gap-1 text-sm whitespace-nowrap">
                <Checkbox checked={filters.rooms.includes(n)} onCheckedChange={(c) => {
                  const next = new Set(filters.rooms);
                  c ? next.add(n) : next.delete(n);
                  setFilters({ ...filters, rooms: Array.from(next) as number[] });
                }} /> {n}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-sm text-muted-foreground">Город</label>
            <Select value={filters.city} onValueChange={(v) => setFilters({ ...filters, city: v })}>
              <SelectTrigger><SelectValue placeholder="Все" /></SelectTrigger>
              <SelectContent>
                {dynamicCities.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Район</label>
            <Select value={filters.district} onValueChange={(v) => setFilters({ ...filters, district: v })}>
              <SelectTrigger><SelectValue placeholder="Все" /></SelectTrigger>
              <SelectContent>
                {dynamicDistricts.map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v as Filters["status"] })}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              {(["В продаже", "Сдан", "Забронировано"] as const).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button 
            variant={filters.hasAvailable ? "default" : "outline"} 
            onClick={() => setFilters({ ...filters, hasAvailable: !filters.hasAvailable })}
            className="w-full sm:w-auto text-xs sm:text-sm whitespace-nowrap"
          >
            {isMobile ? "С квартирами" : "Только с доступными квартирами"}
          </Button>
        </div>
        <Button variant="ghost" onClick={resetFilters} className="w-full sm:w-auto">
          Сбросить фильтры
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Каталог новостроек — Поиск объектов</title>
        <meta name="description" content="Фильтры по цене, площади, комнатам и статусу. Быстрый поиск объектов с доступными квартирами." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
      </Helmet>

      <SiteHeader>
        <div className="relative flex-1 max-w-2xl min-w-0">
          <Input value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="Поиск по названию или адресу" className="pl-10" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        </div>
        <div className="hidden sm:flex gap-2">
          <StableInstallmentCalculator />
          <Button asChild variant="outline"><Link to="/admin">Админка</Link></Button>
        </div>
        <div className="sm:hidden flex gap-1">
          <StableInstallmentCalculator />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                <SlidersHorizontal className="size-4" />
                <span className="sr-only">Фильтры</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] max-h-[800px]">
              <SheetHeader>
                <SheetTitle>Фильтры</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(90vh-120px)] mt-4">
                <div className="pb-4">{FiltersPanel}</div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </SiteHeader>

      <div className="hidden sm:block sticky top-16 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-4 animate-fade-in">
          {FiltersPanel}
        </div>
      </div>

      <main className="container py-4 sm:py-6 px-4">
        <h1 className="sr-only">Каталог новостроек и объектов</h1>
        
        {/* Вкладки */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto sm:mx-0">
            <TabsTrigger value="all" className="text-xs sm:text-sm">Все объекты</TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              Избранное ({favorites.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="size-4" />
              История ({viewHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden animate-fade-in">
                    <Skeleton className="h-48 w-full" />
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
                {paged.map((p: any) => (
                  <ProjectCard 
                    key={p.id} 
                    project={p} 
                    isFavorite={favorites.includes(p.id)} 
                    onToggleFavorite={() => toggleFavorite(p.id)}
                    onView={() => handleProjectView(p.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            {favorites.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Heart className="size-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">У вас пока нет избранных объектов</p>
                  <Button onClick={() => setActiveTab("all")}>Посмотреть все объекты</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paged.map((p: any) => (
                  <ProjectCard 
                    key={p.id} 
                    project={p} 
                    isFavorite={true} 
                    onToggleFavorite={() => toggleFavorite(p.id)}
                    onView={() => handleProjectView(p.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {viewHistory.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <History className="size-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">История просмотров пуста</p>
                  <Button onClick={() => setActiveTab("all")}>Посмотреть все объекты</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paged.map((p: any) => (
                  <ProjectCard 
                    key={p.id} 
                    project={p} 
                    isFavorite={favorites.includes(p.id)} 
                    onToggleFavorite={() => toggleFavorite(p.id)}
                    onView={() => handleProjectView(p.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Пагинация */}
        {pageCount > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setPage(Math.max(1, page - 1))} />
                </PaginationItem>
                {Array.from({ length: Math.min(pageCount, 5) }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink isActive={page === i + 1} onClick={() => setPage(i + 1)}>
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext onClick={() => setPage(Math.min(pageCount, page + 1))} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;