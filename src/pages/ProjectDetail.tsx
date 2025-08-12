import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Phone, Share2, Heart, Building2, Home, Car, TreePine } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import { useProjectBySlug } from "@/hooks/useProjectBySlug";
import { useState, useMemo, useEffect } from "react";
import UnitCard from "@/components/catalog/UnitCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Slider } from "@/components/ui/slider";
import StableInstallmentCalculator from "@/components/StableInstallmentCalculator";
import { LazyImage } from "@/components/ui/lazy-image";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default function ProjectDetail() {
  const { slug } = useParams();
  const { data, isLoading } = useProjectBySlug(slug || "");
  const project = data?.project;
  const allUnits = data?.units ?? [];
  
  // Фильтры
  const [roomsFilter, setRoomsFilter] = useState<number | "all">("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 200]);
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  
  // Состояние для избранного и истории
  const [isFavorite, setIsFavorite] = useState(false);
  
  useEffect(() => {
    if (project) {
      // Добавляем в историю просмотров
      const history = JSON.parse(localStorage.getItem("viewHistory") || "[]");
      const newItem = {
        id: project.id,
        slug: project.slug,
        name: project.name,
        image: project.image_urls?.[0],
        viewedAt: new Date().toISOString()
      };
      const updatedHistory = [newItem, ...history.filter((item: any) => item.id !== project.id)].slice(0, 10);
      localStorage.setItem("viewHistory", JSON.stringify(updatedHistory));
      
      // Проверяем избранное
      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
      setIsFavorite(favorites.includes(project.id));
    }
  }, [project]);

  const units = useMemo(() => {
    let list = allUnits;
    if (roomsFilter !== "all") list = list.filter(u => u.rooms === roomsFilter);
    list = list.filter(u => u.price >= priceRange[0] && u.price <= priceRange[1]);
    list = list.filter(u => u.area >= areaRange[0] && u.area <= areaRange[1]);
    if (statusFilter !== "all") list = list.filter(u => u.status === statusFilter);
    return list;
  }, [allUnits, roomsFilter, priceRange, areaRange, statusFilter]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Ссылка скопирована", description: "Отправьте её клиенту" });
    } catch {
      toast({ title: "Не удалось скопировать", description: url });
    }
  };

  const toggleFavorite = () => {
    if (!project) return;
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    const newFavorites = isFavorite 
      ? favorites.filter((id: string) => id !== project.id)
      : [...favorites, project.id];
    localStorage.setItem("favorites", JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
    toast({ 
      title: isFavorite ? "Удалено из избранного" : "Добавлено в избранное",
      description: project.name 
    });
  };

  if (isLoading) {
    return (
      <div className="container py-20 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container py-20 text-center">
        <p className="mb-4">Объект не найден</p>
        <Link className="story-link" to="/">Вернуться на главную</Link>
      </div>
    );
  }

  const addressFull = `${project.city}, ${project.district}, ${project.address}`;
  const images = project.image_urls || [];

  // Compute map embed src with priority: custom embed -> lat/lng -> address
  const mapEmbedSrc = (() => {
    const raw = (project as any).map_embed_url as string | null | undefined;
    if (raw && raw.trim()) {
      const val = raw.trim();
      // If a full iframe HTML was provided, try to extract the src
      if (val.includes("<iframe")) {
        const match = val.match(/src=["']([^"']+)["']/i);
        if (match?.[1]) return match[1];
      }
      // Otherwise assume it's a direct URL
      return val;
    }
    if (project.latitude && project.longitude) {
      return `https://www.google.com/maps?q=${project.latitude},${project.longitude}&output=embed`;
    }
    return `https://www.google.com/maps?q=${encodeURIComponent(addressFull)}&output=embed`;
  })();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${project.name} — объект новостройки`}</title>
        <meta name="description" content={`Цена от ${data?.stats?.min_unit_price ?? project.price_min} ₽. Площадь ${data?.stats?.min_unit_area ?? project.area_min}–${data?.stats?.max_unit_area ?? project.area_max} м². ${addressFull}.`} />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Главная", item: (typeof window !== 'undefined' ? `${window.location.origin}/` : "/") },
              { "@type": "ListItem", position: 2, name: "Каталог", item: (typeof window !== 'undefined' ? `${window.location.origin}/catalog` : "/catalog") },
              { "@type": "ListItem", position: 3, name: project.name, item: (typeof window !== 'undefined' ? window.location.href : "/") }
            ]
          })}
        </script>
      </Helmet>

      <SiteHeader>
        <Button asChild variant="outline">
          <Link to="/"><ArrowLeft className="mr-2" /> Назад</Link>
        </Button>
        <div className="hidden md:flex">
          <StableInstallmentCalculator 
            initialPrice={data?.stats?.min_unit_price ?? project?.price_min} 
            projectName={project?.name}
          />
        </div>
      </SiteHeader>

      <main className="container py-6 space-y-8">
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Главная</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/catalog">Каталог</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {/* Большая галерея фото */}
        <section>
          {images.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((src, idx) => (
                  <CarouselItem key={idx} className="md:basis-2/3 lg:basis-1/2">
                    <LazyImage 
                      src={src} 
                      alt={`Фото ${idx + 1} — ${project.name}`} 
                      className="w-full h-96 object-cover rounded-lg shadow-elegант"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          ) : (
            <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
              <Building2 className="size-24 text-muted-foreground" />
            </div>
          )}
        </section>

        {/* Основная информация */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Home className="size-4" />
                <span>Новостройка • {project.district}</span>
              </div>
              
              <h1 className="text-3xl font-bold">{project.name}</h1>
              
              <div className="text-muted-foreground flex items-center gap-2">
                <MapPin className="size-4" /> {addressFull}
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Badge variant={project.status === 'В продаже' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
                {(project.tags || []).map((t) => (
                  <Badge key={t} variant="outline">{t}</Badge>
                ))}
              </div>
            </div>

            {/* Подробное описание */}
            {project.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Описание</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Удобства */}
            {project.amenities?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>Удобства и инфраструктура</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {project.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        {amenity}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Боковая панель с ценой и действиями */}
          <Card className="h-fit sticky top-24">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">
                  от {(data?.stats?.min_unit_price ?? project.price_min).toLocaleString()} ₽
                </div>
                {(data?.stats?.max_unit_price ?? project.price_max) > (data?.stats?.min_unit_price ?? project.price_min) && (
                  <div className="text-muted-foreground">
                    до {(data?.stats?.max_unit_price ?? project.price_max).toLocaleString()} ₽
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Площадь:</span>
                  <div className="font-medium">
                    {(data?.stats?.min_unit_area ?? project.area_min) ?? "—"}–{(data?.stats?.max_unit_area ?? project.area_max) ?? "—"} м²
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Квартир:</span>
                  <div className="font-medium">{data?.stats?.units_count || 0}</div>
                </div>
              </div>

              {project.deadline && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Срок сдачи:</span>
                  <div className="font-medium">{project.deadline}</div>
                </div>
              )}

              <Separator />

              <div className="grid gap-3">
                <Button asChild variant="hero" size="lg" className="hover-scale">
                  <a href="tel:+79990000000">
                    <Phone className="mr-2" /> Позвонить
                  </a>
                </Button>
                
                <div className="md:hidden">
                  <StableInstallmentCalculator 
                    initialPrice={data?.stats?.min_unit_price ?? project?.price_min} 
                    projectName={project?.name}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="hover-scale" onClick={handleShare}>
                    <Share2 className="mr-2" /> Поделиться
                  </Button>
                  <Button 
                    variant={isFavorite ? "default" : "outline"} 
                    className="hover-scale"
                    onClick={toggleFavorite}
                  >
                    <Heart className={`mr-2 ${isFavorite ? "fill-current" : ""}`} />
                    {isFavorite ? "В избранном" : "В избранное"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Планировки и квартиры */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Планировки и квартиры</h2>
            <Badge variant="secondary">{units.length} из {allUnits.length}</Badge>
          </div>

          {/* Фильтры */}
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Комнат</label>
                  <Select onValueChange={(v) => setRoomsFilter(v === "all" ? "all" : Number(v))} defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Комнат" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      {Array.from(new Set(allUnits.map(u => u.rooms))).sort((a, b) => a - b).map(r => (
                        <SelectItem key={r} value={String(r)}>{r} комн.</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Цена до {priceRange[1].toLocaleString()} ₽</label>
                  <Slider
                    min={0}
                    max={Math.max(...allUnits.map(u => u.price), 50000000)}
                    step={100000}
                    value={priceRange}
                    onValueChange={(v) => setPriceRange([v[0], v[1]])}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Площадь до {areaRange[1]} м²</label>
                  <Slider
                    min={0}
                    max={Math.max(...allUnits.map(u => u.area), 200)}
                    step={1}
                    value={areaRange}
                    onValueChange={(v) => setAreaRange([v[0], v[1]])}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Статус</label>
                  <Select onValueChange={(v) => setStatusFilter(v)} defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Статус" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      {(["В продаже", "Сдан", "Забронировано"] as const).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Список квартир */}
          {units.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {units.map(u => <UnitCard key={u.id} unit={u} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="size-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Нет квартир по выбранным параметрам</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setRoomsFilter("all");
                    setPriceRange([0, 50000000]);
                    setAreaRange([0, 200]);
                    setStatusFilter("all");
                  }}
                >
                  Сбросить фильтры
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        <Separator />

        {/* Расположение */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Расположение</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-lg overflow-hidden shadow-elegant">
                <iframe
                  title="Карта"
                  width="100%"
                  height="400"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapEmbedSrc}
                />
              </div>
            </div>

            {/* Инфраструктура рядом — теперь из БД */}
            {(project as any).infrastructure_nearby && (project as any).infrastructure_nearby.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Инфраструктура рядом</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    {(project as any).infrastructure_nearby.map((item: string, idx: number) => (
                      <div key={`${item}-${idx}`} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Инфраструктура рядом</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Информация не указана.
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
