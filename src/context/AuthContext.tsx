import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { getAuthEmailRedirectUrl, parseSupabaseAuthRedirect } from '../config/authRedirect';
import { registerPushToken } from '../notifications/push';
import type { Profile, UserRole } from '../types/profile';
import { parseRole } from '../types/profile';

type ProfileResolution = 'idle' | 'loading' | 'done';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  initializing: boolean;
  profileLoadPending: boolean;
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, meta: { name: string; phone: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<void>;
  finishPasswordRecovery: (password: string) => Promise<void>;
  cancelPasswordRecovery: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);
const SPLASH_MIN_MS = 2000;

function isInvalidRefreshSessionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Invalid Refresh Token|Refresh Token Not Found|refresh token/i.test(msg);
}

async function clearLocalAuthSession(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncPushTokenToProfile(userId: string, current: string[] | null | undefined): Promise<void> {
  const token = await registerPushToken();
  if (!token) return;
  const prev = Array.isArray(current) ? current : [];
  if (prev.includes(token)) return;
  const next = Array.from(new Set([...prev, token]));
  const { error } = await supabase.from('profiles').update({ push_tokens: next }).eq('id', userId);
  if (error) {
    console.warn('[Auth] push_tokens:', error.message);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileResolution, setProfileResolution] = useState<ProfileResolution>('idle');
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const handlingPasswordSignInRef = useRef(false);
  const hydratingUserIdRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const profileRef = useRef<Profile | null>(null);

  sessionRef.current = session;
  profileRef.current = profile;

  const loadProfile = useCallback(async (userId: string): Promise<boolean> => {
    let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) {
      console.warn('[Auth] profiles:', error.message);
      return false;
    }

    if (!data) {
      const { data: authData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !authData.user || authData.user.id !== userId) {
        return false;
      }

      const meta = (authData.user.user_metadata || {}) as Record<string, unknown>;
      const nameRaw = meta.name;
      const phoneRaw = meta.phone;
      const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : null;
      const phone = typeof phoneRaw === 'string' && phoneRaw.trim() ? phoneRaw.trim() : null;

      const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        role: 'client',
        name,
        phone,
      });

      if (insertError) {
        const isDuplicate =
          insertError.code === '23505' ||
          /duplicate key|unique constraint/i.test(insertError.message ?? '');
        if (!isDuplicate) {
          console.warn('[Auth] profiles insert:', insertError.message);
          return false;
        }
      }

      const retry = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (retry.error || !retry.data) {
        if (retry.error) {
          console.warn('[Auth] profiles retry:', retry.error.message);
        }
        return false;
      }
      data = retry.data;
    }

    setProfile({
      ...data,
      role: parseRole(data.role),
    } as Profile);
    return true;
  }, []);

  const loadProfileWithRetry = useCallback(
    async (userId: string): Promise<boolean> => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const ok = await loadProfile(userId);
        if (ok) return true;
        await delay(320 * (attempt + 1));
      }
      return false;
    },
    [loadProfile]
  );

  const hydrateAuthenticatedUser = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        setProfileResolution('idle');
        setPasswordRecovery(false);
        return;
      }

      if (hydratingUserIdRef.current === nextSession.user.id) {
        return;
      }

      hydratingUserIdRef.current = nextSession.user.id;
      setProfileResolution('loading');
      try {
        let ok = await loadProfileWithRetry(nextSession.user.id);
        if (!ok) {
          const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr && refreshed.session?.user?.id === nextSession.user.id) {
            setSession(refreshed.session);
            ok = await loadProfileWithRetry(nextSession.user.id);
          }
        }
      } finally {
        hydratingUserIdRef.current = null;
        setProfileResolution('done');
      }
    },
    [loadProfileWithRetry]
  );

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (uid) {
      await loadProfileWithRetry(uid);
    }
  }, [loadProfileWithRetry, session?.user?.id]);

  const refreshSession = useCallback(async () => {
    const {
      data: { session: nextSession },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Auth] refreshSession:', error.message);
      return;
    }
    setSession(nextSession);
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      await delay(SPLASH_MIN_MS);
      if (!mounted) return;

      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (!mounted) return;

        if (currentSession?.user) {
          const { error: userErr } = await supabase.auth.getUser();
          if (userErr && isInvalidRefreshSessionError(userErr)) {
            await clearLocalAuthSession();
            if (!mounted) return;
            setSession(null);
            setProfile(null);
            setProfileResolution('idle');
            setPasswordRecovery(false);
          } else {
            await hydrateAuthenticatedUser(currentSession);
          }
        } else {
          setSession(null);
          setProfile(null);
          setProfileResolution('idle');
          setPasswordRecovery(false);
        }
      } catch (error) {
        if (isInvalidRefreshSessionError(error)) {
          await clearLocalAuthSession();
          if (mounted) {
            setSession(null);
            setProfile(null);
            setProfileResolution('idle');
            setPasswordRecovery(false);
          }
        } else {
          console.warn('[Auth] init:', error);
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [hydrateAuthenticatedUser]);

  useEffect(() => {
    if (!__DEV__) return;
    const redirect = getAuthEmailRedirectUrl();
    if (!/localhost|127\.0\.0\.1/i.test(redirect)) return;
    console.warn(
      `[Supabase] URL de redireccion (registro / recuperar contrasena):\n${redirect}\n` +
        'Si el correo te manda a localhost, agrega barberiaelpatron://** y exp://** en Redirect URLs.'
    );
  }, []);

  useEffect(() => {
    const handleAuthUrl = async (url: string | null) => {
      if (!url) return;
      const parsed = parseSupabaseAuthRedirect(url);
      const hasAuthPayload =
        !!parsed.access_token ||
        !!parsed.refresh_token ||
        !!parsed.error ||
        !!parsed.error_code;

      if (!hasAuthPayload) return;

      if (parsed.error || parsed.error_code) {
        const message =
          parsed.error_code === 'otp_expired'
            ? 'El enlace caduco o ya no es valido. Solicita uno nuevo.'
            : parsed.error_description ?? parsed.error ?? 'No se pudo completar el proceso';
        Alert.alert('Enlace invalido', message);
        return;
      }

      if (parsed.access_token && parsed.refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        });
        if (error) {
          Alert.alert('Error de sesion', error.message);
          return;
        }

        if (parsed.type === 'recovery') {
          setPasswordRecovery(true);
          setSession(data.session ?? null);
          return;
        }

        setPasswordRecovery(false);
        setProfile(null);
        setProfileResolution('idle');
        await clearLocalAuthSession();
        setSession(null);
        Alert.alert('Correo confirmado', 'Tu cuenta ya fue confirmada. Ahora inicia sesion en la app.');
      }
    };

    void Linking.getInitialURL().then(handleAuthUrl);
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleAuthUrl(url);
    });
    return () => sub.remove();
  }, [hydrateAuthenticatedUser]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, nextSession) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;

      if (event === 'USER_UPDATED' && nextSession) {
        setSession(nextSession);
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        if (nextSession) {
          setSession(nextSession);
        }
        return;
      }

      if (event === 'SIGNED_IN' && nextSession?.user) {
        if (handlingPasswordSignInRef.current) return;
        if (sessionRef.current?.user?.id === nextSession.user.id && profileRef.current?.id === nextSession.user.id) {
          setSession(nextSession);
          return;
        }

        await hydrateAuthenticatedUser(nextSession);
        return;
      }

      if (!nextSession?.user) {
        setSession(null);
        setProfile(null);
        setProfileResolution('idle');
        setPasswordRecovery(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [hydrateAuthenticatedUser]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || !profile) return;
    void syncPushTokenToProfile(uid, profile.push_tokens);
  }, [profile, session?.user?.id]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      handlingPasswordSignInRef.current = true;
      try {
        if (sessionRef.current?.user) {
          await clearLocalAuthSession();
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        await hydrateAuthenticatedUser(currentSession);
      } finally {
        handlingPasswordSignInRef.current = false;
      }
    },
    [hydrateAuthenticatedUser]
  );

  const signUp = useCallback(async (email: string, password: string, meta: { name: string; phone: string }) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getAuthEmailRedirectUrl(),
        data: {
          name: meta.name.trim(),
          phone: meta.phone.trim(),
        },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      await clearLocalAuthSession();
    }
    setSession(null);
    setProfile(null);
    setProfileResolution('idle');
    setPasswordRecovery(false);
  }, []);

  const finishPasswordRecovery = useCallback(
    async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const {
        data: { session: nextSession },
      } = await supabase.auth.getSession();

      setPasswordRecovery(false);
      await hydrateAuthenticatedUser(nextSession);
    },
    [hydrateAuthenticatedUser]
  );

  const cancelPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  const role = profile ? parseRole(profile.role) : null;
  const profileLoadPending = !!session?.user && profileResolution === 'loading';

  const value = useMemo(
    () => ({
      session,
      profile,
      role,
      initializing,
      profileLoadPending,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      refreshSession,
      finishPasswordRecovery,
      cancelPasswordRecovery,
    }),
    [
      cancelPasswordRecovery,
      finishPasswordRecovery,
      initializing,
      passwordRecovery,
      profile,
      profileLoadPending,
      refreshProfile,
      refreshSession,
      role,
      session,
      signIn,
      signOut,
      signUp,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
