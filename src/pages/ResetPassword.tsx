import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/layout/SiteHeader";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const { updatePassword, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const type = searchParams.get('type');

  useEffect(() => {
    // Если есть токены сброса пароля, устанавливаем сессию
    if (accessToken && refreshToken && type === 'recovery') {
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
      });
    }
  }, [accessToken, refreshToken, type]);

  // Если пользователь не аутентифицирован и нет токенов восстановления
  if (!user && (!accessToken || !refreshToken || type !== 'recovery')) {
    return <Navigate to="/" replace />;
  }

  // Если уже сменили пароль успешно
  if (success) {
    return <Navigate to="/" replace />;
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    // Валидация пароля
    if (password.length < 8 || password.length > 128) {
      setBusy(false);
      return toast({ 
        title: "Некорректный пароль", 
        description: "Пароль должен содержать от 8 до 128 символов" 
      });
    }

    if (password !== confirmPassword) {
      setBusy(false);
      return toast({ 
        title: "Пароли не совпадают", 
        description: "Введите одинаковые пароли в оба поля" 
      });
    }

    // Проверка силы пароля
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const strengthScore = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (strengthScore < 3) {
      setBusy(false);
      return toast({ 
        title: "Слабый пароль", 
        description: "Пароль должен содержать как минимум 3 из: строчные буквы, заглавные буквы, цифры, специальные символы" 
      });
    }

    const { error } = await updatePassword(password);
    setBusy(false);

    if (error) {
      toast({ title: "Ошибка", description: error.message });
    } else {
      toast({ title: "Успешно", description: "Пароль обновлен" });
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Сброс пароля — Новостройки Чеченской Республики</title>
        <meta name="description" content="Создайте новый пароль для вашего аккаунта" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/reset-password'} />
      </Helmet>
      
      <SiteHeader />

      <main className="container py-12 flex justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-xl font-semibold">Создать новый пароль</h1>
            <p className="text-sm text-muted-foreground">
              Введите новый пароль для вашего аккаунта
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Новый пароль</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Подтвердите пароль</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>
              <Button disabled={busy} className="w-full" type="submit">
                Обновить пароль
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}