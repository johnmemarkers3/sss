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
        const { data, error } = await supabase
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
    // Enhanced input validation and sanitization
    const trimmed = key.trim().replace(/[^\w-]/g, ''); // Allow only alphanumeric and hyphens
    if (!trimmed || trimmed.length < 8 || trimmed.length > 20) {
      return { ok: false, message: 'Некорректный формат ключа' };
    }
    if (!user) return { ok: false, message: 'Войдите в аккаунт' };

    // Rate limiting for key activation attempts
    const activationKey = `key-activation:${user.id}`;
    console.log('[activateWithKey] Checking rate limiting for:', activationKey);
    const rateLimitCheck = await import('@/utils/rateLimiter').then(m => m.isBlocked(activationKey));
    console.log('[activateWithKey] Rate limit status:', rateLimitCheck);
    
    if (rateLimitCheck.blocked) {
      return { ok: false, message: 'Слишком много попыток активации. Попробуйте позже.' };
    }

    console.log('[activateWithKey] Starting activation for key:', trimmed);
    console.log('[activateWithKey] User ID:', user.id);
    console.log('[activateWithKey] Key length:', trimmed.length);

    try {
      // 1) Найдем ключ и проверим, что он существует и не использован
      console.log('[activateWithKey] Step 1: Looking for key:', trimmed);
      const { data: keyData, error: findErr } = await supabase
        .from('access_keys')
        .select('id, duration_days, is_used, used_by, used_at, expires_at, created_at, created_by')
        .eq('key', trimmed)
        .maybeSingle();

      console.log('[activateWithKey] Find result:', { keyData, findErr });
      console.log('[activateWithKey] Current user trying to activate:', user.id);
      console.log('[activateWithKey] Key created by:', keyData?.created_by);
      console.log('[activateWithKey] Raw query for key:', trimmed);

      if (findErr) {
        console.warn('[activateWithKey] find key error:', findErr.message);
        return { ok: false, message: 'Ошибка поиска ключа' };
      }

      if (!keyData) {
        console.log('[activateWithKey] Key not found in database');
        return { ok: false, message: 'Ключ не найден' };
      }

      console.log('[activateWithKey] Key data:', keyData);

      if (keyData.is_used) {
        console.log('[activateWithKey] Key is already used by:', keyData.used_by);
        return { ok: false, message: 'Ключ уже использован' };
      }

      // Проверяем срок жизни ключа (от даты создания)
      const created = new Date(keyData.created_at);
      const keyLifetime = 30 * 24 * 60 * 60 * 1000; // 30 дней жизни ключа
      const keyExpiry = new Date(created.getTime() + keyLifetime);
      const now = new Date();
      
      if (now > keyExpiry) {
        console.log('[activateWithKey] Key expired (creation date based)');
        return { ok: false, message: 'Ключ истек (просрочен)' };
      }

      const days = Number(keyData.duration_days || 30);
      if (!Number.isFinite(days) || days <= 0) {
        console.log('[activateWithKey] Invalid duration:', days);
        return { ok: false, message: 'Некорректный срок действия ключа' };
      }

      // Подписка действует с момента активации
      const subscriptionExp = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      console.log('[activateWithKey] Calculated subscription expiration:', subscriptionExp.toISOString());

      // 2) Атомарно захватываем ключ
      console.log('[activateWithKey] Step 2: Attempting atomic key capture...');
      const { data: updatedKeys, error: updateErr } = await supabase
        .from('access_keys')
        .update({ 
          is_used: true, 
          used_by: user.id, 
          used_at: new Date().toISOString(),
          expires_at: subscriptionExp.toISOString() // Теперь устанавливаем при активации
        })
        .eq('id', keyData.id)
        .eq('is_used', false) // важно: только если НЕ использован
        .select('id');

      console.log('[activateWithKey] Update result:', { updatedKeys, updateErr });

      if (updateErr) {
        console.warn('[activateWithKey] update key error:', updateErr.message);
        return { ok: false, message: 'Ошибка активации ключа' };
      }

      // Если массив пустой - ключ захвачен другим пользователем
      if (!updatedKeys || updatedKeys.length === 0) {
        console.log('[activateWithKey] Key was captured by someone else');
        // Дополнительная диагностика - проверим состояние ключа еще раз
        const { data: recheckData } = await supabase
          .from('access_keys')
          .select('is_used, used_by, used_at')
          .eq('id', keyData.id)
          .maybeSingle();
        console.log('[activateWithKey] Key recheck after failed update:', recheckData);
        return { ok: false, message: 'Ключ уже использован другим пользователем' };
      }

      console.log('[activateWithKey] Key successfully captured');

      // 3) Создаем/обновляем подписку
      console.log('[activateWithKey] Step 3: Creating subscription...');
      const { error: sErr } = await supabase
        .from('subscriptions')
        .upsert({ user_id: user.id, active_until: subscriptionExp.toISOString() }, { onConflict: 'user_id' });
      
      if (sErr) {
        console.warn('[activateWithKey] subscriptions table error:', sErr.message);
        return { ok: false, message: 'Не удалось записать подписку' };
      }

      console.log('[activateWithKey] Subscription created successfully');

      const iso = subscriptionExp.toISOString();
      localStorage.setItem('subscription_active_until', iso);
      setExpiresAt(iso);
      window.dispatchEvent(new CustomEvent('subscription_updated', { detail: iso }));
      
      console.log('[activateWithKey] Activation completed successfully');
      
      // Record successful activation (for rate limiting)
      const { recordAttempt } = await import('@/utils/rateLimiter');
      recordAttempt(activationKey, true);
      
      const expiryDateStr = subscriptionExp.toLocaleDateString('ru-RU');
      return { ok: true, message: `Доступ активирован до ${expiryDateStr}` };
    } catch (e: any) {
      console.error('[activateWithKey] Unexpected error:', e);
      
      // Record failed activation (for rate limiting)
      const { recordAttempt } = await import('@/utils/rateLimiter');
      recordAttempt(activationKey, false);
      
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

