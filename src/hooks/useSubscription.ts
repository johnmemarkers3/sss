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

    console.log('[activateWithKey] Starting activation for key:', trimmed);
    console.log('[activateWithKey] User ID:', user.id);

    try {
      // 1) Сначала найдем ключ и проверим что он свободен
      console.log('[activateWithKey] Step 1: Looking for key...');
      const { data: keyData, error: findErr } = await (supabase as any)
        .from('access_keys')
        .select('id, duration_days, is_used, used_by, used_at')
        .eq('key', trimmed)
        .maybeSingle();

      console.log('[activateWithKey] Find result:', { keyData, findErr });

      if (findErr) {
        console.warn('[activateWithKey] find key error:', findErr.message);
        return { ok: false, message: 'Ошибка поиска ключа' };
      }

      if (!keyData) {
        console.log('[activateWithKey] Key not found in database');
        return { ok: false, message: 'Ключ не найден' };
      }

      console.log('[activateWithKey] Key found:', {
        id: keyData.id,
        is_used: keyData.is_used,
        used_by: keyData.used_by,
        used_at: keyData.used_at,
        duration_days: keyData.duration_days
      });

      if (keyData.is_used) {
        console.log('[activateWithKey] Key is already used by:', keyData.used_by);
        return { ok: false, message: 'Ключ уже использован' };
      }

      const days = Number(keyData.duration_days || 30);
      if (!Number.isFinite(days) || days <= 0) {
        console.log('[activateWithKey] Invalid duration:', days);
        return { ok: false, message: 'Некорректный срок действия ключа' };
      }

      const exp = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      console.log('[activateWithKey] Calculated expiration:', exp.toISOString());

      // 2) Атомарно захватываем ключ (только если он still свободен)
      console.log('[activateWithKey] Step 2: Attempting atomic key capture...');
      const { data: updatedKeys, error: updateErr } = await (supabase as any)
        .from('access_keys')
        .update({ 
          is_used: true, 
          used_by: user.id, 
          used_at: new Date().toISOString(), 
          expires_at: exp.toISOString() 
        })
        .eq('id', keyData.id)
        .eq('is_used', false) // ключевое условие - только если НЕ использован
        .select('id');

      console.log('[activateWithKey] Update result:', { updatedKeys, updateErr });

      if (updateErr) {
        console.warn('[activateWithKey] update key error:', updateErr.message);
        return { ok: false, message: 'Ошибка активации ключа' };
      }

      // Если массив пустой - значит ключ был захвачен кем-то другим между проверками
      if (!updatedKeys || updatedKeys.length === 0) {
        console.log('[activateWithKey] Key was captured by someone else between checks');
        return { ok: false, message: 'Ключ уже использован другим пользователем' };
      }

      console.log('[activateWithKey] Key successfully captured, rows updated:', updatedKeys.length);

      // 3) Создаем/обновляем подписку
      console.log('[activateWithKey] Step 3: Creating subscription...');
      const { error: sErr } = await (supabase as any)
        .from('subscriptions')
        .upsert({ user_id: user.id, active_until: exp.toISOString() }, { onConflict: 'user_id' });
      
      if (sErr) {
        console.warn('[activateWithKey] subscriptions table error:', sErr.message);
        return { ok: false, message: 'Не удалось записать подписку' };
      }

      console.log('[activateWithKey] Subscription created successfully');

      const iso = exp.toISOString();
      localStorage.setItem('subscription_active_until', iso);
      setExpiresAt(iso);
      window.dispatchEvent(new CustomEvent('subscription_updated', { detail: iso }));
      
      console.log('[activateWithKey] Activation completed successfully');
      return { ok: true, message: 'Доступ активирован' };
    } catch (e: any) {
      console.error('[activateWithKey] Unexpected error:', e);
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

