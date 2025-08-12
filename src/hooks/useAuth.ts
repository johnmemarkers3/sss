
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Profile = {
  user_id: string;
  role: string;
  created_at: string;
};

// Clean up auth state to avoid limbo states
export const cleanupAuthState = () => {
  try {
    localStorage.removeItem('supabase.auth.token');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch {}
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin bootstrap disabled: all signups are regular users


  const ensureProfile = useCallback(async (userId: string, role: 'user' | 'admin' = 'user') => {
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id, role')
        .eq('user_id', userId)
        .maybeSingle();
      if (existing) {
        if (role === 'admin' && existing.role !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin' }).eq('user_id', userId);
        }
        return;
      }
      await supabase.from('profiles').upsert({ user_id: userId, role });
    } catch (e) {
      console.error('[useAuth] ensureProfile error', e);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer fetching profile to avoid deadlocks
        setTimeout(async () => {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', newSession.user!.id)
            .maybeSingle();
          if (data) setProfile(data as Profile);
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (data) setProfile(data as Profile);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    cleanupAuthState();
    try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: new Error('Введите корректный email') as any };
    }
    if (password.length < 8) {
      return { error: new Error('Минимум 8 символов в пароле') as any };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user?.id) {
      await ensureProfile(data.user.id, 'user');
    }
    return { error };
  }, [ensureProfile]);

  const signUp = useCallback(async (email: string, password: string, _options?: { makeAdminIfNone?: boolean }) => {
    cleanupAuthState();
    try { await supabase.auth.signOut({ scope: 'global' }); } catch {}

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { error: new Error('Введите корректный email') as any };
    }
    if (password.length < 8) {
      return { error: new Error('Минимум 8 символов в пароле') as any };
    }

    // Create the user (Supabase stores password securely as a hash)
    const { error: signUpError } = await supabase.auth.signUp({ email: normalizedEmail, password });
    if (signUpError) {
      const msg = /already/i.test(signUpError.message)
        ? 'Такой email уже зарегистрирован'
        : signUpError.message;
      return { error: new Error(msg) as any };
    }

    // Auto sign-in immediately after successful signup
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      const msg = /invalid/i.test(error.message) ? 'Неверный email или пароль' : error.message;
      return { error: new Error(msg) as any };
    }

    // Ensure user profile exists and always set role to 'user'
    const userId = data.user?.id;
    if (userId) {
      await ensureProfile(userId, 'user');
    }
    return { error: null };
  }, [ensureProfile]);

  const signOut = useCallback(async () => {
    cleanupAuthState();
    try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
    window.location.href = '/';
  }, []);

  const isAdmin = profile?.role === 'admin';

  return { session, user, profile, isAdmin, loading, signIn, signUp, signOut };
}
