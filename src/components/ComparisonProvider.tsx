import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

type ComparisonItem = {
  id: string;
  type: 'project' | 'unit';
  name: string;
  price: number;
  area?: number;
  rooms?: number;
  image?: string;
  slug?: string;
  project_id?: string;
  data: any; // Полные данные объекта
};

type ComparisonContextType = {
  items: ComparisonItem[];
  addToComparison: (item: ComparisonItem) => void;
  removeFromComparison: (id: string) => void;
  clearComparison: () => void;
  isInComparison: (id: string) => boolean;
  canAddMore: boolean;
};

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const MAX_COMPARISON_ITEMS = 4;

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ComparisonItem[]>(() => {
    try {
      const saved = localStorage.getItem('comparison');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('comparison', JSON.stringify(items));
  }, [items]);

  const addToComparison = (item: ComparisonItem) => {
    if (items.length >= MAX_COMPARISON_ITEMS) {
      toast({
        title: 'Максимум объектов для сравнения',
        description: `Можно сравнивать не более ${MAX_COMPARISON_ITEMS} объектов одновременно`,
        variant: 'destructive'
      });
      return;
    }

    if (items.some(i => i.id === item.id)) {
      toast({
        title: 'Объект уже добавлен',
        description: 'Этот объект уже находится в списке сравнения'
      });
      return;
    }

    setItems(prev => [...prev, item]);
    toast({
      title: 'Добавлено к сравнению',
      description: `${item.name} добавлен в список сравнения`
    });
  };

  const removeFromComparison = (id: string) => {
    const item = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (item) {
      toast({
        title: 'Удалено из сравнения',
        description: `${item.name} удален из списка сравнения`
      });
    }
  };

  const clearComparison = () => {
    setItems([]);
    toast({
      title: 'Список сравнения очищен',
      description: 'Все объекты удалены из сравнения'
    });
  };

  const isInComparison = (id: string) => {
    return items.some(i => i.id === id);
  };

  const canAddMore = items.length < MAX_COMPARISON_ITEMS;

  return (
    <ComparisonContext.Provider value={{
      items,
      addToComparison,
      removeFromComparison,
      clearComparison,
      isInComparison,
      canAddMore
    }}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
}