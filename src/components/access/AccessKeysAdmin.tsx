import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Lock, RefreshCw } from "lucide-react";

export type AccessKeyRow = {
  id: string;
  key: string;
  duration_days: number;
  assigned_email: string | null;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
};

function randomKey() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVXYZ23456789"; // exclude ambiguous chars
  const seg = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `${seg(4)}-${seg(4)}-${seg(4)}-${seg(4)}`;
}

export function AccessKeysAdmin() {
  const { user } = useAuth();
  const [duration, setDuration] = useState<string>("30"); // days: 1,3,30
  const [assignedEmail, setAssignedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState<AccessKeyRow[]>([]);
  const [missingTables, setMissingTables] = useState(false);

  const durationLabel = useMemo(() => {
    const d = Number(duration);
    return d === 1 ? "1 день" : d === 3 ? "3 дня" : "1 месяц";
  }, [duration]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('access_keys')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setKeys((data as AccessKeyRow[]) || []);
    } catch (e: any) {
      console.warn('[AccessKeysAdmin] load error', e?.message || e);
      setMissingTables(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    if (!user) return toast({ title: 'Нет пользователя' });
    const key = randomKey();
    setLoading(true);
    try {
      const payload = {
        key,
        duration_days: Number(duration),
        assigned_email: assignedEmail.trim() || null,
        is_used: false,
        created_by: user.id,
      };
      const { error } = await (supabase as any).from('access_keys').insert(payload);
      if (error) throw error;
      toast({ title: 'Ключ создан', description: key });
      setAssignedEmail("");
      await load();
      try {
        await navigator.clipboard.writeText(key);
        toast({ title: 'Скопировано', description: 'Ключ в буфере обмена' });
      } catch {}
    } catch (e: any) {
      console.warn('[AccessKeysAdmin] create error', e?.message || e);
      setMissingTables(true);
      toast({ title: 'Ошибка', description: 'Нужно настроить таблицы в Supabase' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-5" />
          Ключи доступа
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {missingTables && (
          <div className="p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm">
            <div className="font-medium mb-1">Нужно создать таблицы в Supabase</div>
            <p className="text-muted-foreground">
              Создайте таблицы public.access_keys и public.subscriptions. Затем обновите страницу. Я подготовлю SQL при необходимости.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Срок действия</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 день</SelectItem>
                <SelectItem value="3">3 дня</SelectItem>
                <SelectItem value="30">1 месяц</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Email пользователя (необязательно)</label>
            <Input placeholder="user@example.com" value={assignedEmail} onChange={(e) => setAssignedEmail(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleGenerate} disabled={loading}>Создать ключ ({durationLabel})</Button>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 size-4" /> Обновить список
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Последние ключи</div>
          <div className="border rounded-lg divide-y">
            {keys.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Ключей пока нет</div>
            )}
            {keys.map((k) => (
              <div key={k.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="font-mono text-sm break-all">{k.key}</div>
                <div className="flex-1 text-sm text-muted-foreground">
                  {k.duration_days} дн. • {k.assigned_email || 'без email'}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={k.is_used ? 'secondary' : 'default'}>
                    {k.is_used ? 'Использован' : 'Свободен'}
                  </Badge>
                  {k.expires_at && (
                    <span className="text-xs text-muted-foreground">до {new Date(k.expires_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
