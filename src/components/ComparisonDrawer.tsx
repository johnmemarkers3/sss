import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useComparison } from './ComparisonProvider';
import { Scale, X, Eye, Trash2, Building2, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ComparisonDrawer() {
  const { items, removeFromComparison, clearComparison } = useComparison();
  const [isOpen, setIsOpen] = useState(false);
  const [showFullComparison, setShowFullComparison] = useState(false);
  const isMobile = useIsMobile();

  if (items.length === 0) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const ComparisonContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Сравнение объектов ({items.length})</h3>
        <Button variant="outline" size="sm" onClick={clearComparison}>
          <Trash2 className="size-4 mr-2" />
          Очистить все
        </Button>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id} className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={() => removeFromComparison(item.id)}
            >
              <X className="size-4" />
            </Button>
            
            <CardContent className="p-4">
              <div className="flex gap-4">
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {item.type === 'project' ? (
                      <Building2 className="size-4 text-muted-foreground" />
                    ) : (
                      <Home className="size-4 text-muted-foreground" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {item.type === 'project' ? 'Объект' : 'Квартира'}
                    </Badge>
                  </div>
                  
                  <h4 className="font-medium truncate mb-1">{item.name}</h4>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Цена: {formatCurrency(item.price)}</div>
                    {item.area && <div>Площадь: {item.area} м²</div>}
                    {item.rooms && <div>Комнат: {item.rooms}</div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length >= 2 && (
        <Button 
          onClick={() => setShowFullComparison(true)} 
          className="w-full"
          variant="hero"
        >
          <Scale className="mr-2 size-4" />
          Подробное сравнение
        </Button>
      )}
    </div>
  );

  const FullComparisonModal = () => (
    <Dialog open={showFullComparison} onOpenChange={setShowFullComparison}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="size-5" />
            Подробное сравнение объектов
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Параметр</th>
                  {items.map((item) => (
                    <th key={item.id} className="text-left p-4 min-w-[200px]">
                      <div className="space-y-2">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-24 object-cover rounded-md"
                          />
                        )}
                        <div className="font-medium text-sm">{item.name}</div>
                        <Badge variant="outline" className="text-xs">
                          {item.type === 'project' ? 'Объект' : 'Квартира'}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-medium">Цена</td>
                  {items.map((item) => (
                    <td key={item.id} className="p-4">
                      <div className="text-lg font-semibold text-primary">
                        {formatCurrency(item.price)}
                      </div>
                    </td>
                  ))}
                </tr>
                
                <tr className="border-b">
                  <td className="p-4 font-medium">Площадь</td>
                  {items.map((item) => (
                    <td key={item.id} className="p-4">
                      {item.area ? `${item.area} м²` : '—'}
                    </td>
                  ))}
                </tr>
                
                <tr className="border-b">
                  <td className="p-4 font-medium">Комнат</td>
                  {items.map((item) => (
                    <td key={item.id} className="p-4">
                      {item.rooms ? `${item.rooms} комн.` : '—'}
                    </td>
                  ))}
                </tr>
                
                <tr className="border-b">
                  <td className="p-4 font-medium">Цена за м²</td>
                  {items.map((item) => (
                    <td key={item.id} className="p-4">
                      {item.area ? formatCurrency(Math.round(item.price / item.area)) + '/м²' : '—'}
                    </td>
                  ))}
                </tr>
                
                <tr className="border-b">
                  <td className="p-4 font-medium">Статус</td>
                  {items.map((item) => (
                    <td key={item.id} className="p-4">
                      <Badge variant={item.data?.status === 'В продаже' ? 'default' : 'secondary'}>
                        {item.data?.status || '—'}
                      </Badge>
                    </td>
                  ))}
                </tr>
                
                <tr>
                  <td className="p-4 font-medium">Действия</td>
                  {items.map((item) => (
                    <td key={item.id} className="p-4">
                      <div className="space-y-2">
                        {item.type === 'project' && item.slug && (
                          <Button asChild variant="outline" size="sm" className="w-full">
                            <Link to={`/project/${item.slug}`}>
                              <Eye className="mr-2 size-3" />
                              Подробнее
                            </Link>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full"
                          onClick={() => removeFromComparison(item.id)}
                        >
                          <X className="mr-2 size-3" />
                          Удалить
                        </Button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  const trigger = (
    <Button 
      variant="outline" 
      className="relative shrink-0"
      onClick={() => setIsOpen(true)}
    >
      <Scale className="size-4 mr-2" />
      <span className="hidden md:inline">Сравнение</span>
      <Badge variant="secondary" className="ml-2 text-xs">
        {items.length}
      </Badge>
    </Button>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            {trigger}
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] max-h-[600px]">
            <SheetHeader>
              <SheetTitle>Сравнение объектов</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100%-60px)] mt-4">
              <ComparisonContent />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            {trigger}
          </SheetTrigger>
          <SheetContent side="right" className="w-[90vw] max-w-[400px] sm:max-w-[540px]">
            <SheetHeader>
              <SheetTitle>Сравнение объектов</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-120px)] mt-4">
              <ComparisonContent />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}
      
      <FullComparisonModal />
    </>
  );
}