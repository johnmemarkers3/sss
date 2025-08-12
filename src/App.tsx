
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ComparisonProvider } from "@/components/ComparisonProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ObjectDetail from "./pages/ObjectDetail";
import AdminLogin from "./pages/AdminLogin";
import Home from "./pages/Home";
import ProjectDetail from "./pages/ProjectDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProjectEdit from "./pages/AdminProjectEdit";

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
            </BrowserRouter>
          </TooltipProvider>
        </ComparisonProvider>
      </HelmetProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

