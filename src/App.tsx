
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ComparisonProvider } from "@/components/ComparisonProvider";
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ObjectDetail = lazy(() => import("./pages/ObjectDetail"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Home = lazy(() => import("./pages/Home"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminProjectEdit = lazy(() => import("./pages/AdminProjectEdit"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <HelmetProvider>
        <ComparisonProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<div className="container py-10 text-muted-foreground">Загрузка…</div>}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/catalog" element={<Index />} />
                  <Route path="/project/:slug" element={<ProjectDetail />} />
                  {/* Старая карточка по локальным данным оставляем, чтобы не ломать существующие ссылки */}
                  <Route path="/object/:id" element={<ObjectDetail />} />
                  <Route path="/admin" element={<AdminLogin />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  {/* Новые страницы админки для проектов */}
                  <Route path="/admin/projects" element={<Navigate to="/admin/dashboard?tab=manage" replace />} />
                  <Route path="/admin/projects/:id" element={<AdminProjectEdit />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </ComparisonProvider>
      </HelmetProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

