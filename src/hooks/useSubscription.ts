import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscription gate with Supabase validation.
 * - Reads user's active subscription from DB (fallback to localStorage only for cache)
 * - Admins bypass the gate
 */
export function useSubscription() {
  const { user, isAdmin } = useAuth();
  const [expiresAt, setExpiresAt] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('subscription_active_until') : null
  );
  const [loading, setLoading] = useState(false);

  // Load actual subscription from Supabase when user changes
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('subscriptions')
          .select('active_until')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) {
          // If table is missing, keep local-only behavior but DO NOT auto-activate
          console.warn('[useSubscription] subscriptions table not available or error:', error.message);
          return;
        }
        if (data?.active_until) {
          const iso = new Date(data.active_until).toISOString();
          localStorage.setItem('subscription_active_until', iso);
          setExpiresAt(iso);
        } else {
          localStorage.removeItem('subscription_active_until');
          setExpiresAt(null);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const sync = () => setExpiresAt(localStorage.getItem('subscription_active_until'));
    window.addEventListener('storage', sync);
    // Custom event to sync within the same tab
    window.addEventListener('subscription_updated', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('subscription_updated', sync as EventListener);
    };
  }, []);

  const isActive = useMemo(() => {
    if (isAdmin) return true;
    if (!user) return false;
    if (!expiresAt) return false;
    const now = Date.now();
    const exp = Date.parse(expiresAt);
    return Number.isFinite(exp) && exp > now;
  }, [user, isAdmin, expiresAt]);

  const activateWithKey = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) return { ok: false, message: 'Введите ключ' };
    if (!user) return { ok: false, message: 'Войдите в аккаунт' };

    try {
      // 1) Find key
      const { data: k, error: kErr } = await (supabase as any)
        .from('access_keys')
        .select('id, key, duration_days, is_used, used_by, expires_at')
        .eq('key', trimmed)
        .maybeSingle();
      if (kErr) {
        console.warn('[activateWithKey] access_keys table error:', kErr.message);
        return { ok: false, message: 'Сервер недоступен. Настройте таблицы подписки в Supabase.' };
      }
      if (!k) return { ok: false, message: 'Ключ недействителен' };
      if (k.is_used && (!k.expires_at || Date.parse(k.expires_at) <= Date.now())) {
        return { ok: false, message: 'Ключ уже использован' };
      }
      if (k.is_used && k.used_by && k.used_by !== user.id) {
        return { ok: false, message: 'Ключ уже привязан к другому пользователю' };
      }

      const days = Number(k.duration_days || 0);
      if (!Number.isFinite(days) || days <= 0) return { ok: false, message: 'Некорректный срок действия ключа' };
      const exp = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // 2) Upsert subscription for user
      const { error: sErr } = await (supabase as any)
        .from('subscriptions')
        .upsert({ user_id: user.id, active_until: exp.toISOString() }, { onConflict: 'user_id' });
      if (sErr) {
        console.warn('[activateWithKey] subscriptions table error:', sErr.message);
        return { ok: false, message: 'Не удалось записать подписку. Проверьте таблицы в Supabase.' };
      }

      // 3) Mark key as used
      const { error: uErr } = await (supabase as any)
        .from('access_keys')
        .update({ is_used: true, used_by: user.id, used_at: new Date().toISOString(), expires_at: exp.toISOString() })
        .eq('id', k.id);
      if (uErr) {
        console.warn('[activateWithKey] cannot mark key used:', uErr.message);
      }

      const iso = exp.toISOString();
      localStorage.setItem('subscription_active_until', iso);
      setExpiresAt(iso);
      window.dispatchEvent(new CustomEvent('subscription_updated', { detail: iso }));
      return { ok: true, message: 'Доступ активирован' };
    } catch (e: any) {
      console.error('[activateWithKey] unexpected', e);
      return { ok: false, message: 'Ошибка активации' };
    }
  }, [user?.id]);

  const clearSubscription = useCallback(() => {
    localStorage.removeItem('subscription_active_until');
    setExpiresAt(null);
    window.dispatchEvent(new CustomEvent('subscription_updated'));
  }, []);

  return { isActive, expiresAt, loading, activateWithKey, clearSubscription };
}

