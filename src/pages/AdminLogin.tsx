import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import SiteHeader from "@/components/layout/SiteHeader";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
export default function AdminLogin() {
  const { signIn, signUp, user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      toast({ title: "Ошибка входа", description: error.message });
    } else {
      window.location.href = "/admin/dashboard";
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signUp(email, password);
    setBusy(false);
    if (error) {
      toast({ title: "Ошибка регистрации", description: error.message });
    } else {
      toast({ title: "Готово", description: "Администратор зарегистрирован. Выполните вход." });
    }
  };

  // Если уже вошли и есть права — сразу в админку
  useEffect(() => {
    if (user && isAdmin) {
      window.location.href = "/admin/dashboard";
    }
  }, [user, isAdmin]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Админка — вход</title>
        <meta name="description" content="Авторизация администратора для управления базой объектов." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
      </Helmet>
      <SiteHeader />

      <main className="container py-12 flex justify-center">
        <Card className="w-full max-w-md animate-enter">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-xl font-semibold">Вход в админку</h1>
            <form className="space-y-3" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Email</label>
                <Input type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Пароль</label>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button disabled={busy || loading} variant="hero" className="w-full" type="submit">Войти</Button>
            </form>
            <Button disabled={busy || loading} variant="outline" className="w-full" onClick={handleSignUp}>Зарегистрировать аккаунт</Button>
            {user && (
              <p className="text-xs text-muted-foreground">Вы уже вошли. {isAdmin ? "Перейти в админку" : "Нет прав администратора"}.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}