import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { properties } from "@/data/properties";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Phone, Share2, Heart, MapPin, ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import { LazyImage } from "@/components/ui/lazy-image";

export default function ObjectDetail() {
  const { id } = useParams();
  const item = properties.find(p => p.id === id);

  if (!item) {
    return (
      <div className="container py-20 text-center">
        <p className="mb-4">Объект не найден</p>
        <Link className="story-link" to="/">Вернуться в каталог</Link>
      </div>
    );
  }

  const addressFull = `${item.city}, ${item.district}, ${item.address}`;

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Ссылка скопирована", description: "Отправьте её клиенту" });
    } catch {
      toast({ title: "Не удалось скопировать", description: url });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${item.title} — карточка объекта`}</title>
        <meta name="description" content={`Цена от ${item.priceMin.toLocaleString()} ₽. Площадь ${item.areaMin}–${item.areaMax} м². ${addressFull}.`} />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
      </Helmet>

      <SiteHeader>
        <Button asChild variant="outline"><Link to="/"><ArrowLeft className="mr-2" /> Назад</Link></Button>
      </SiteHeader>

      <main className="container py-6 space-y-8">
        <section>
          <Carousel className="w-full">
            <CarouselContent>
              {item.images.map((src, idx) => (
                <CarouselItem key={idx} className="md:basis-2/3 lg:basis-1/2">
                  <LazyImage src={src} alt={`Фото ${idx + 1} — ${item.title}`} className="w-full h-80 object-cover rounded-md" />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-2xl font-semibold">{item.title}</h1>
            <div className="text-muted-foreground flex items-center gap-2"><MapPin className="size-4" /> {addressFull}</div>
            <div className="flex gap-2">{item.tags?.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
            <div className="text-sm leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {item.description}
            </div>
            {item.amenities?.length ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {item.amenities.map(a => <Badge key={a} variant="outline">{a}</Badge>)}
              </div>
            ) : null}
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-lg">Цена: {item.priceMin.toLocaleString()}–{item.priceMax.toLocaleString()} ₽</div>
              <div className="text-sm text-muted-foreground">Площадь: {item.areaMin}–{item.areaMax} м²</div>
              <div className="text-sm text-muted-foreground">Комнат: {item.rooms}</div>
              {item.deadline && <div className="text-sm text-muted-foreground">Срок сдачи: {item.deadline}</div>}
              <div className="pt-2 grid gap-2">
                <Button asChild variant="hero"><a href="tel:+79990000000"><Phone className="mr-2" /> Позвонить</a></Button>
                <Button variant="outline" onClick={handleShare}><Share2 className="mr-2" /> Отправить клиенту</Button>
                <Button variant="ghost"><Heart className="mr-2" /> В избранное</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Расположение</h2>
          <div className="rounded-md overflow-hidden">
            <iframe
              title="Карта"
              width="100%"
              height="360"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(addressFull)}&output=embed`}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Похожие объекты</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.filter(p => p.id !== item.id).slice(0, 3).map(p => (
              <Card key={p.id} className="overflow-hidden">
                <LazyImage src={p.images[0]} alt={`Похожий объект ${p.title}`} className="w-full h-36 object-cover" />
                <CardContent className="p-4">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.district}, {p.address}</div>
                  <Button asChild variant="outline" className="mt-3"><Link to={`/object/${p.id}`}>Подробнее</Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
