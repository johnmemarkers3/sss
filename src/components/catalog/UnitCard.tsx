import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Eye, Phone, Scale } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import StableInstallmentCalculator from "@/components/StableInstallmentCalculator";
import { useComparison } from "@/components/ComparisonProvider";
import { LazyImage } from "@/components/ui/lazy-image";
type Unit = {
  id: string;
  title: string | null;
  area: number;
  rooms: number;
  price: number;
  status: string;
  floor: number | null;
  project_id?: string;
  image_urls?: string[] | null;
  plan_image_url?: string | null;
  thumbnail_urls?: string[] | null;
  plan_image_thumb_url?: string | null;
};

export default function UnitCard({ unit }: { unit: Unit }) {
  const [isFavorite, setIsFavorite] = useState(() => {
    const favorites = JSON.parse(localStorage.getItem("unitFavorites") || "[]");
    return favorites.includes(unit.id);
  });
  const { addToComparison, isInComparison, canAddMore } = useComparison();

  // Показываем миниатюру/превью в листинге для скорости, но при просмотре открываем оригинал
  const coverThumb =
    unit.plan_image_thumb_url ||
    (unit.thumbnail_urls && unit.thumbnail_urls.length > 0 ? unit.thumbnail_urls[0] : undefined) ||
    (unit.image_urls && unit.image_urls.length > 0 ? unit.image_urls[0] : undefined) ||
    unit.plan_image_url ||
    undefined;

  const coverFull =
    unit.plan_image_url ||
    (unit.image_urls && unit.image_urls.length > 0 ? unit.image_urls[0] : undefined) ||
    coverThumb;

  const pricePerSqm = Math.round(unit.price / unit.area);

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem("unitFavorites") || "[]");
    const newFavorites = isFavorite 
      ? favorites.filter((id: string) => id !== unit.id)
      : [...favorites, unit.id];
    localStorage.setItem("unitFavorites", JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
    toast({ 
      title: isFavorite ? "Удалено из избранного" : "Добавлено в избранное",
      description: unit.title || `${unit.rooms}-комн. квартира`
    });
  };

  const handleViewPlan = () => {
    if (coverFull) {
      const win = window.open(coverFull, '_blank', 'noopener,noreferrer');
      if (!win) {
        toast({ title: "Откройте ссылку вручную", description: coverFull });
      }
    }
  };

  const handleCall = () => {
    window.location.href = 'tel:+79990000000';
  };

  const handleAddToComparison = () => {
    addToComparison({
      id: unit.id,
      type: 'unit',
      name: unit.title || `${unit.rooms}-комнатная квартира`,
      price: unit.price,
      area: unit.area,
      rooms: unit.rooms,
      image: coverThumb || undefined,
      project_id: unit.project_id,
      data: unit
    });
  };

  return (
    <Card className="overflow-hidden hover-scale animate-enter group touch-manipulation">
      <div className="relative">
        {coverThumb ? (
          <LazyImage 
            src={coverThumb} 
            alt={unit.title ?? "Планировка"} 
            className="w-full h-48 object-cover cursor-pointer" 
            onClick={handleViewPlan}
          />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-2xl font-bold">{unit.rooms}</div>
              <div className="text-xs">комн.</div>
            </div>
          </div>
        )}
        
        {/* Статус */}
        <div className="absolute top-2 left-2">
          <Badge variant={unit.status === 'В продаже' ? 'default' : 'secondary'}>
            {unit.status}
          </Badge>
        </div>

        {/* Действия */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            onClick={toggleFavorite}
            className="hover-scale rounded-full bg-background/90 backdrop-blur-sm p-2 shadow-lg hover:bg-background transition-colors border border-border/20"
          >
            <Heart className={`size-4 ${isFavorite ? "text-red-500 fill-red-500" : "text-muted-foreground"}`} />
          </button>
          <button 
            onClick={handleAddToComparison}
            disabled={!canAddMore && !isInComparison(unit.id)}
            className={`hover-scale rounded-full bg-background/90 backdrop-blur-sm p-2 shadow-lg hover:bg-background transition-colors border border-border/20 ${
              isInComparison(unit.id) ? 'bg-primary text-primary-foreground border-primary' : ''
            }`}
          >
            <Scale className="size-4" />
          </button>
          {coverFull && (
            <button 
              onClick={handleViewPlan}
              className="hover-scale rounded-full bg-background/90 backdrop-blur-sm p-2 shadow-lg hover:bg-background transition-colors border border-border/20"
            >
              <Eye className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Заголовок */}
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">
            {unit.title ?? `${unit.rooms}-комнатная квартира`}
          </h3>
          <div className="text-sm text-muted-foreground">
            {unit.area} м² {unit.floor ? `• ${unit.floor} этаж` : ""}
          </div>
        </div>

        {/* Цена */}
        <div className="space-y-1">
          <div className="text-2xl font-bold text-primary">
            {unit.price.toLocaleString()} ₽
          </div>
          <div className="text-sm text-muted-foreground">
            {pricePerSqm.toLocaleString()} ₽/м²
          </div>
        </div>

        {/* Ключевые параметры */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Комнат:</span>
            <div className="font-medium">{unit.rooms}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Площадь:</span>
            <div className="font-medium">{unit.area} м²</div>
          </div>
        </div>

        {/* Действия */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="hero" size="sm" onClick={handleCall} className="hover-scale">
            <Phone className="mr-1 size-3" />
            Звонок
          </Button>
          <StableInstallmentCalculator 
            initialPrice={unit.price}
            projectName={unit.title || `${unit.rooms}-комн. квартира`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
