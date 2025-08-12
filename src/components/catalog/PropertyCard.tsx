import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LazyImage } from "@/components/ui/lazy-image";
import { Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { PropertyItem } from "@/data/properties";

export default function PropertyCard({ item, isFavorite, onToggleFavorite }: { item: PropertyItem; isFavorite: boolean; onToggleFavorite: () => void }) {
  return (
    <Card className="overflow-hidden hover-scale animate-enter">
      <div className="relative">
        <LazyImage 
          src={item.images[0]} 
          alt={`Фото объекта ${item.title}`} 
          className="w-full h-40 object-cover" 
        />
        <div className="absolute top-2 left-2 flex gap-2">
          {item.tags?.map((t) => (
            <Badge key={t} variant="outline" className="bg-background/90">{t}</Badge>
          ))}
        </div>
        <button aria-label="Добавить в избранное" onClick={onToggleFavorite} className="absolute top-2 right-2 rounded-md bg-background/90 backdrop-blur-sm p-2 shadow-lg border border-border/20">
          <Heart className={isFavorite ? "text-primary" : "text-muted-foreground"} />
        </button>
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate">{item.title}</h3>
          <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{item.status}</span>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="size-4" /> {item.district}, {item.address}
        </div>
        <div className="text-sm">Цена: от {item.priceMin.toLocaleString('ru-RU')} ₽ до {item.priceMax.toLocaleString('ru-RU')} ₽</div>
        <div className="text-sm">Площадь: {item.areaMin}–{item.areaMax} м² • Комнат: {item.rooms}</div>
        <div className="pt-2">
          <Button asChild variant="outline" className="hover-scale">
            <Link to={`/object/${item.id}`}>Подробнее</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
