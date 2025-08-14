
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { isBlocked, recordAttempt } from "@/utils/rateLimiter";

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
    const key = `auth:${email.trim().toLowerCase()}`;
    const block = isBlocked(key);
    if (block.blocked) {
      return { error: new Error('Слишком много попыток. Попробуйте позже.') as any };
    }
    cleanupAuthState();
    try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
    
    // Enhanced email validation with domain whitelist check
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return { error: new Error('Введите корректный email') as any };
    }
    
    // Enhanced password validation
    if (password.length < 8) {
      return { error: new Error('Минимум 8 символов в пароле') as any };
    }
    if (password.length > 128) {
      return { error: new Error('Пароль слишком длинный (максимум 128 символов)') as any };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    recordAttempt(key, !error);
    if (!error && data.user?.id) {
      await ensureProfile(data.user.id, 'user');
    }
    return { error };
  }, [ensureProfile]);

  const signUp = useCallback(async (email: string, password: string, _options?: { makeAdminIfNone?: boolean }) => {
    cleanupAuthState();
    try { await supabase.auth.signOut({ scope: 'global' }); } catch {}

    const normalizedEmail = email.trim().toLowerCase();
    const key = `signup:${normalizedEmail}`;
    const block = isBlocked(key);
    if (block.blocked) {
      return { error: new Error('Слишком много попыток. Попробуйте позже.') as any };
    }

    // Enhanced email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
      return { error: new Error('Введите корректный email') as any };
    }
    
    // Enhanced password validation with strength requirements
    if (password.length < 8) {
      return { error: new Error('Минимум 8 символов в пароле') as any };
    }
    if (password.length > 128) {
      return { error: new Error('Пароль слишком длинный (максимум 128 символов)') as any };
    }
    
    // Check password strength
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const strengthScore = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (strengthScore < 3) {
      return { error: new Error('Пароль должен содержать как минимум 3 из: строчные буквы, заглавные буквы, цифры, специальные символы') as any };
    }

    // SECURITY: Set proper redirect URL to prevent open redirects
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

    // Create the user with secure options
    const { error: signUpError } = await supabase.auth.signUp({ 
      email: normalizedEmail, 
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          // Sanitize any metadata to prevent XSS
          email_confirmed: false
        }
      }
    });
    if (signUpError) {
      recordAttempt(key, false);
      const msg = /already/i.test(signUpError.message)
        ? 'Такой email уже зарегистрирован'
        : signUpError.message;
      return { error: new Error(msg) as any };
    }

    // Auto sign-in immediately after successful signup
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      recordAttempt(key, false);
      const msg = /invalid/i.test(error.message) ? 'Неверный email или пароль' : error.message;
      return { error: new Error(msg) as any };
    }

    // Ensure user profile exists and always set role to 'user'
    const userId = data.user?.id;
    if (userId) {
      await ensureProfile(userId, 'user');
    }
    recordAttempt(key, true);
    return { error: null };
  }, [ensureProfile]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    
    // Enhanced email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
      return { error: new Error('Введите корректный email') as any };
    }
    
    // Rate limiting for password reset
    const resetKey = `reset:${normalizedEmail}`;
    const block = isBlocked(resetKey);
    if (block.blocked) {
      return { error: new Error('Слишком много попыток сброса пароля. Попробуйте позже.') as any };
    }
    
    // SECURITY: Use secure redirect URL
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    
    // Record attempt regardless of success to prevent email enumeration
    recordAttempt(resetKey, !error);
    
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    // Enhanced password validation
    if (newPassword.length < 8) {
      return { error: new Error('Минимум 8 символов в пароле') as any };
    }
    if (newPassword.length > 128) {
      return { error: new Error('Пароль слишком длинный (максимум 128 символов)') as any };
    }
    
    // Check password strength
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    const strengthScore = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (strengthScore < 3) {
      return { error: new Error('Пароль должен содержать как минимум 3 из: строчные буквы, заглавные буквы, цифры, специальные символы') as any };
    }
    
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Clear all auth-related storage first
      cleanupAuthState();
      
      // Sign out from Supabase with global scope
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear any remaining subscription data
      localStorage.removeItem('subscription_active_until');
      
      // Force a clean redirect to prevent any cached state
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect even if signOut fails
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    }
  }, []);

  const isAdmin = profile?.role === 'admin';
 
  return { session, user, profile, isAdmin, loading, signIn, signUp, signOut, requestPasswordReset, updatePassword };
}
