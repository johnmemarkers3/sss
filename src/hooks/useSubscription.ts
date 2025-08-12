import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Temporary client-side subscription gate until Supabase backend is wired.
 * - Stores subscription expiration in localStorage as ISO string
 * - Admins (profile.role === 'admin') bypass the gate
 */
export function useSubscription() {
  const { user, isAdmin } = useAuth();
  const [expiresAt, setExpiresAt] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('subscription_active_until') : null
  );

  useEffect(() => {
    const handler = () => {
      setExpiresAt(localStorage.getItem('subscription_active_until'));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
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
    // Placeholder logic: accept any non-empty key and grant 30 days by default
    // DEMO- prefix grants 1 day. This will be replaced by Supabase validation.
    const trimmed = key.trim();
    if (!trimmed) {
      return { ok: false, message: 'Введите ключ' };
    }
    const now = new Date();
    let days = trimmed.startsWith('DEMO-') ? 1 : 30;
    const exp = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    localStorage.setItem('subscription_active_until', exp.toISOString());
    setExpiresAt(exp.toISOString());
    return { ok: true, message: 'Доступ активирован' };
  }, []);

  const clearSubscription = useCallback(() => {
    localStorage.removeItem('subscription_active_until');
    setExpiresAt(null);
  }, []);

  return { isActive, expiresAt, activateWithKey, clearSubscription };
}
