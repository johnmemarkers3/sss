import { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import { Building2, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import ComparisonDrawer from "@/components/ComparisonDrawer";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";


const SiteHeader = ({ children }: PropsWithChildren) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const { isActive, expiresAt } = useSubscription();
  
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const remaining = (() => {
    if (!expiresAt) return '';
    const diff = Date.parse(expiresAt) - now;
    if (!Number.isFinite(diff) || diff <= 0) return '0м';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return d > 0 ? `${d}д ${h}ч` : `${h}ч ${m}м`;
  })();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container min-h-[3.5rem] sm:min-h-[4rem] flex items-center gap-2 px-3 sm:px-4 py-2">
        <Link to="/" className="flex items-center gap-2 story-link shrink-0" aria-label="Домой">
          <Building2 className="text-primary size-5 sm:size-6" />
          <span className="font-semibold text-sm sm:text-base">RealtyPro</span>
        </Link>
        
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {children}
        </div>
        
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <ComparisonDrawer />

          {/* Десктопные элементы */}
          <div className="hidden sm:flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Админка</Link>
            </Button>
            
            {user && isActive && remaining && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">Осталось: {remaining}</span>
            )}
            {user && (
              <Button variant="outline" size="sm" onClick={signOut}>Выйти</Button>
            )}
            <ThemeToggle />
          </div>
          
          {/* Мобильное меню - всегда видимое */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 w-9 p-0 sm:hidden border-2 border-primary/20 bg-background hover:bg-primary/10"
              >
                <Menu className="size-4 text-foreground" />
                <span className="sr-only">Открыть меню</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-[350px] z-[100]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="text-primary size-5" />
                  RealtyPro
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full justify-start h-12 text-base" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link to="/">Главная</Link>
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full justify-start h-12 text-base" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link to="/catalog">Каталог</Link>
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full justify-start h-12 text-base" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link to="/admin">Админка</Link>
                </Button>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium">Тема</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;