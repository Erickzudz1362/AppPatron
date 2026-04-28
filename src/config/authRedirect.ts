import * as Linking from 'expo-linking';

/**
 * URL a la que Supabase redirige tras confirmar correo, magic link o reset de contraseña.
 *
 * Si esta URL no está permitida en Supabase, el navegador puede terminar en localhost,
 * about:blank o una pantalla vacía.
 *
 * En Supabase -> Authentication -> URL Configuration:
 * - Site URL: `barberiaelpatron://auth-callback`
 * - Additional Redirect URLs:
 *   - `barberiaelpatron://**`
 *   - `exp://**`
 */
export function getAuthEmailRedirectUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_AUTH_REDIRECT
      ? String(process.env.EXPO_PUBLIC_SUPABASE_AUTH_REDIRECT).trim()
      : '';
  if (fromEnv) return fromEnv;

  const linkingUrl = Linking.createURL('auth-callback');
  if (linkingUrl.startsWith('exp://') || linkingUrl.startsWith('http')) {
    return 'barberiaelpatron://auth-callback';
  }
  return linkingUrl;
}

export function getAuthPasswordResetRedirectUrl(): string {
  return getAuthEmailRedirectUrl();
}

export type ParsedAuthRedirect = {
  access_token: string | null;
  refresh_token: string | null;
  type: string | null;
  error: string | null;
  error_code: string | null;
  error_description: string | null;
};

function decodeDescription(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

export function parseSupabaseAuthRedirect(url: string): ParsedAuthRedirect {
  const empty = {
    access_token: null,
    refresh_token: null,
    type: null,
    error: null,
    error_code: null,
    error_description: null,
  };

  try {
    const parsedUrl = new URL(url);
    const search = parsedUrl.searchParams;
    const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash;
    const fragment = new URLSearchParams(hash);
    const getParam = (key: string) => fragment.get(key) ?? search.get(key);

    return {
      access_token: getParam('access_token'),
      refresh_token: getParam('refresh_token'),
      type: getParam('type'),
      error: getParam('error'),
      error_code: getParam('error_code'),
      error_description: decodeDescription(getParam('error_description')),
    };
  } catch {
    return empty;
  }
}
