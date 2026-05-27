/**
 * URL a la que Supabase redirige tras confirmar correo, magic link o reset de contrasena.
 *
 * Para evitar pantalla blanca al confirmar desde el correo, por defecto usamos
 * una pagina web estatica que solo muestra "Cuenta verificada".
 *
 * En Supabase -> Authentication -> URL Configuration:
 * - Site URL: `https://barberia-el-patron-opal.vercel.app`
 * - Additional Redirect URLs:
 *   - `https://barberia-el-patron-opal.vercel.app/**`
 */
const PUBLIC_AUTH_CONFIRMED_URL = 'https://barberia-el-patron-opal.vercel.app/auth-confirmed.html';

export function getAuthEmailRedirectUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_AUTH_REDIRECT
      ? String(process.env.EXPO_PUBLIC_SUPABASE_AUTH_REDIRECT).trim()
      : '';
  if (fromEnv) return fromEnv;
  return PUBLIC_AUTH_CONFIRMED_URL;
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
