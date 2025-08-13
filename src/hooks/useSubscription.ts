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
      const days = 30; // временно используем стандартное значение
      const exp = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Атомарная операция: пытаемся обновить ключ только если он еще не использован
      const { data: updatedKey, error: updateErr } = await (supabase as any)
        .from('access_keys')
        .update({ 
          is_used: true, 
          used_by: user.id, 
          used_at: new Date().toISOString(), 
          expires_at: exp.toISOString() 
        })
        .eq('key', trimmed)
        .eq('is_used', false) // ключевое условие - только если НЕ использован
        .select('id, duration_days')
        .single();

      if (updateErr) {
        if (updateErr.code === 'PGRST116') {
          // Ключ не найден или уже использован
          return { ok: false, message: 'Ключ недействителен или уже использован' };
        }
        console.warn('[activateWithKey] access_keys update error:', updateErr.message);
        return { ok: false, message: 'Сервер недоступен. Настройте таблицы подписки в Supabase.' };
      }

      // Если дошли сюда - ключ успешно захвачен, пересчитаем срок по реальным данным
      const actualDays = Number(updatedKey.duration_days || 30);
      const actualExp = new Date(Date.now() + actualDays * 24 * 60 * 60 * 1000);

      // Обновим expires_at с правильным сроком
      await (supabase as any)
        .from('access_keys')
        .update({ expires_at: actualExp.toISOString() })
        .eq('id', updatedKey.id);

      // Создаем/обновляем подписку
      const { error: sErr } = await (supabase as any)
        .from('subscriptions')
        .upsert({ user_id: user.id, active_until: actualExp.toISOString() }, { onConflict: 'user_id' });
      
      if (sErr) {
        console.warn('[activateWithKey] subscriptions table error:', sErr.message);
        return { ok: false, message: 'Не удалось записать подписку. Проверьте таблицы в Supabase.' };
      }

      const iso = actualExp.toISOString();
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

