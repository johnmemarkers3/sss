import { Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

export function AccessModal() {
  const { user, signIn, signUp, loading } = useAuth();
  const { activateWithKey } = useSubscription();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [accessKey, setAccessKey] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) toast({ title: "Ошибка входа", description: error.message });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signUp(email, password);
    setBusy(false);
    if (error) {
      toast({ title: "Ошибка регистрации", description: error.message });
    } else {
      toast({ title: "Письмо отправлено", description: "Подтвердите email и войдите" });
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await activateWithKey(accessKey);
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Не удалось активировать", description: res.message });
    } else {
      toast({ title: "Готово", description: res.message });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Center Card */}
      <Card className="relative mx-4 w-full max-w-md shadow-xl">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-primary/10 text-primary">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold">Доступ ограничен</h1>
          </div>

          <p className="text-sm text-muted-foreground">
            Для полного доступа оформите подписку или активируйте ключ доступа.
          </p>

          {!user ? (
            <div className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Пароль</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button disabled={busy || loading} className="w-full" type="submit">
                  Войти
                </Button>
              </form>

              <form onSubmit={handleSignUp} className="space-y-3">
                <Button disabled={busy || loading} variant="secondary" className="w-full" type="submit">
                  Зарегистрироваться
                </Button>
              </form>

              <Button
                asChild
                variant="outline"
                className="w-full"
              >
                <a href="mailto:info@example.com?subject=Покупка%20подписки">
                  Купить подписку
                </a>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleActivate} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Ключ доступа</label>
                  <Input
                    placeholder="Например: Tfa4-basf-65O1-BhtI"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    required
                  />
                </div>
                <Button disabled={busy} className="w-full" type="submit">
                  Активировать доступ
                </Button>
              </form>

              <Button
                asChild
                variant="outline"
                className="w-full"
              >
                <a href="mailto:info@example.com?subject=Запрос%20демо%20ключа">
                  Запросить демо-ключ на 1 день
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
