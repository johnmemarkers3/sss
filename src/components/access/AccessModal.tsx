import { Lock, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

export function AccessModal() {
  const { user, signIn, signUp, loading, signOut } = useAuth();
  const { activateWithKey } = useSubscription();

  const [step, setStep] = useState<'auth' | 'register' | 'key'>('auth');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [accessKey, setAccessKey] = useState("");

  // Reset to auth step when user logs out
  const handleSignOut = async () => {
    await signOut();
    setStep('auth');
    setEmail('');
    setPassword('');
    setAccessKey('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    
    // Enhanced client-side validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email) || email.length > 254) {
      setBusy(false);
      return toast({ title: "Некорректный email", description: "Введите действительный адрес электронной почты" });
    }
    if (password.length < 8 || password.length > 128) {
      setBusy(false);
      return toast({ title: "Некорректный пароль", description: "Пароль должен содержать от 8 до 128 символов" });
    }
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      toast({ title: "Ошибка входа", description: error.message });
    } else {
      // After successful login, show key entry
      setStep('key');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    
    // Enhanced client-side validation for signup
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email) || email.length > 254) {
      setBusy(false);
      return toast({ title: "Некорректный email", description: "Введите действительный адрес электронной почты" });
    }
    if (password.length < 8 || password.length > 128) {
      setBusy(false);
      return toast({ title: "Слабый пароль", description: "Пароль должен содержать от 8 до 128 символов" });
    }
    
    // Basic password validation - just minimum length
    // Removed complex password requirements as requested
    const { error } = await signUp(email, password);
    setBusy(false);
    if (error) {
      toast({ title: "Ошибка регистрации", description: error.message });
    } else {
      toast({ title: "Готово", description: "Регистрация выполнена. Теперь введите ключ доступа." });
      // After successful registration, show key entry
      setStep('key');
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    
    // Sanitize access key input
    const sanitizedKey = accessKey.trim().replace(/[^\w-]/g, '');
    if (sanitizedKey !== accessKey.trim()) {
      setBusy(false);
      return toast({ title: "Некорректный ключ", description: "Ключ содержит недопустимые символы" });
    }
    
    const res = await activateWithKey(sanitizedKey);
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Не удалось активировать", description: res.message });
    } else {
      toast({ title: "Готово", description: res.message });
    }
  };

  // Sync step with user state
  useEffect(() => {
    if (user && step !== 'key') {
      setStep('key');
    } else if (!user && step === 'key') {
      setStep('auth');
    }
  }, [user, step]);

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
            {step === 'key' 
              ? "Введите ключ доступа для активации подписки."
              : "Для полного доступа войдите в аккаунт или зарегистрируйтесь."
            }
          </p>

          {/* Auth Step - Login/Register choice */}
          {step === 'auth' && (
            <div className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    maxLength={254}
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
                    autoComplete="current-password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </div>
                <Button disabled={busy || loading} className="w-full" type="submit">
                  Войти
                </Button>
              </form>

              <Button 
                disabled={busy || loading} 
                variant="secondary" 
                className="w-full"
                onClick={() => setStep('register')}
              >
                Зарегистрироваться
              </Button>

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
          )}

          {/* Register Step */}
          {step === 'register' && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('auth')}
                className="self-start p-0 h-auto text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>

              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    maxLength={254}
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
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </div>
                <Button disabled={busy || loading} className="w-full" type="submit">
                  Создать аккаунт
                </Button>
              </form>
            </div>
          )}

          {/* Key Entry Step */}
          {step === 'key' && (
            <div className="space-y-4">
              {user && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Вы вошли как: {user.email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Выйти
                  </Button>
                </div>
              )}

              <form onSubmit={handleActivate} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Ключ доступа</label>
                  <Input
                    placeholder="Например: Tfa4-basf-65O1-BhtI"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    autoComplete="off"
                    pattern="[A-Za-z0-9-]+"
                    maxLength={20}
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
