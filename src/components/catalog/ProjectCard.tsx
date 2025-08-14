import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Eye, Home, Building2, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useComparison } from "@/components/ComparisonProvider";
import { LazyImage } from "@/components/ui/lazy-image";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  district: string;
  status: string;
  price_min: number;
  price_max: number;
  min_unit_price?: number | null;
  max_unit_price?: number | null;
  min_unit_area?: number | null;
  max_unit_area?: number | null;
  image_urls?: string[] | null;
  tags?: string[] | null;
  units_count?: number | null;
  rooms_available?: number[] | null;
};

export default function ProjectCard({ 
  project, 
  isFavorite, 
  onToggleFavorite,
  onView 
}: { 
  project: Project; 
  isFavorite?: boolean; 
  onToggleFavorite?: () => void;
  onView?: () => void;
}) {
  const { addToComparison, isInComparison, canAddMore } = useComparison();
  const images = project.image_urls || [];
  const priceFrom = (project.min_unit_price ?? project.price_min) ?? 0;
  const priceTo = (project.max_unit_price ?? project.price_max) ?? 0;
  const areaFrom = project.min_unit_area;
  const areaTo = project.max_unit_area;
  const roomsAvailable = project.rooms_available || [];
  const [showSwipeHint, setShowSwipeHint] = useState(false);


  useEffect(() => {
    if (images.length > 1) {
      setShowSwipeHint(true);
      const t = setTimeout(() => setShowSwipeHint(false), 2200);
      return () => clearTimeout(t);
    }
  }, [images.length]);

  const unitsCount = project.units_count || 0;

  const handleCardClick = () => {
    if (onView) onView();
  };

  const handleAddToComparison = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    addToComparison({
      id: project.id,
      type: 'project',
      name: project.name,
      price: priceFrom,
      area: areaFrom || undefined,
      image: images[0],
      slug: project.slug,
      data: project
    });
  };

  return (
    <Card className="overflow-hidden hover-scale animate-enter group cursor-pointer touch-manipulation w-full max-w-full" onClick={handleCardClick}>
      <div className="relative">
        {images.length > 1 ? (
          <Carousel className="w-full">
            <CarouselContent>
              {images.slice(0, 5).map((img, idx) => (
                <CarouselItem key={idx}>
                  <LazyImage 
                    src={img} 
                    alt={`Фото ${idx + 1} объекта ${project.name}`} 
                    className="w-full h-40 sm:h-48 object-cover" 
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex" />
            <CarouselNext className="right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex" />
          </Carousel>
        ) : images.length === 1 ? (
          <LazyImage 
            src={images[0]} 
            alt={`Фото объекта ${project.name}`} 
            className="w-full h-40 sm:h-48 object-cover" 
          />
        ) : (
          <div className="w-full h-40 sm:h-48 bg-muted flex items-center justify-center">
            <Building2 className="size-8 sm:size-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Статус и теги */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          <Badge variant={project.status === 'В продаже' ? 'default' : 'secondary'}>
            {project.status}
          </Badge>
          {(project.tags || []).slice(0, 1).map((tag) => (
            <Badge key={tag} variant="outline" className="bg-background/90">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Кнопки действий */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 sm:transition-opacity duration-200">
          {onToggleFavorite && (
            <button 
              aria-label="Добавить в избранное" 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleFavorite();
              }}
              className="hover-scale rounded-full bg-background/90 backdrop-blur-sm p-1.5 sm:p-2 shadow-lg hover:bg-background transition-colors border border-border/20"
            >
              <Heart className={`size-4 ${isFavorite ? "text-red-500 fill-red-500" : "text-muted-foreground"}`} />
            </button>
          )}
          <button 
            aria-label="Добавить к сравнению"
            onClick={handleAddToComparison}
            disabled={!canAddMore && !isInComparison(project.id)}
            className={`hover-scale rounded-full bg-background/90 backdrop-blur-sm p-1.5 sm:p-2 shadow-lg hover:bg-background transition-colors border border-border/20 ${
              isInComparison(project.id) ? 'bg-primary text-primary-foreground border-primary' : ''
            }`}
          >
            <Scale className="size-4" />
          </button>
          <button 
            aria-label="Быстрый просмотр"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCardClick();
            }}
            className="hover-scale rounded-full bg-background/90 backdrop-blur-sm p-1.5 sm:p-2 shadow-lg hover:bg-background transition-colors border border-border/20"
          >
            <Eye className="size-4 text-muted-foreground" />
          </button>
        </div>

        {/* Количество фото и подсказка свайпа */}
        {images.length > 1 && (
          <>
            <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs border border-border/20">
              {images.length} фото
            </div>
            {showSwipeHint && (
              <div className="absolute bottom-2 left-2 sm:hidden bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs border border-border/20">
                Свайп →
              </div>
            )}
          </>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Заголовок и тип */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Home className="size-3" />
            <span className="truncate">Новостройка • {project.district}</span>
          </div>
          <h3 className="font-semibold text-base sm:text-lg leading-tight line-clamp-2 break-words" aria-label={`Проект: ${project.name}`}>{project.name}</h3>
        </div>

        {/* Цена - крупным шрифтом */}
        <div className="space-y-1">
          <div className="text-xl sm:text-2xl font-bold text-primary">
            от {priceFrom.toLocaleString()} ₽
          </div>
          {priceTo > priceFrom && (
            <div className="text-xs sm:text-sm text-muted-foreground">
              до {priceTo.toLocaleString()} ₽
            </div>
          )}
        </div>

        {/* Ключевые параметры */}
        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
          {areaFrom && areaTo && (
            <div>
              <span className="text-muted-foreground">Площадь:</span>
              <div className="font-medium">{areaFrom}–{areaTo} м²</div>
            </div>
          )}
          {roomsAvailable.length > 0 && (
            <div>
              <span className="text-muted-foreground">Комнат:</span>
              <div className="font-medium">
                {roomsAvailable.sort((a, b) => a - b).join(', ')}
              </div>
            </div>
          )}
          {unitsCount > 0 && (
            <div>
              <span className="text-muted-foreground">Квартир:</span>
              <div className="font-medium">{unitsCount}</div>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Тип:</span>
            <div className="font-medium">Новостройка</div>
          </div>
        </div>

        {/* Адрес */}
        <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 min-w-0">
          <MapPin className="size-3 flex-shrink-0" /> 
          <span className="truncate break-words overflow-hidden">{project.address}</span>
        </div>

        {/* Кнопка подробнее */}
        <div className="pt-2">
          <Button 
            asChild 
            variant="outline" 
            className="hover-scale w-full h-9 sm:h-10 text-xs sm:text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Link to={`/project/${project.slug}`}>
              Подробнее
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}