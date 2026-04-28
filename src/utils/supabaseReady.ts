import Constants from 'expo-constants';

/** True si hay URL y anon key reales (no placeholders). */
export function isSupabaseConfigured(): boolean {
  const extra = Constants.expoConfig?.extra as { supabaseUrl?: string; supabaseAnonKey?: string } | undefined;
  const url = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL)
    ? String(process.env.EXPO_PUBLIC_SUPABASE_URL)
    : (extra?.supabaseUrl ?? '');
  const key = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY)
    ? String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
    : (extra?.supabaseAnonKey ?? '');
  if (!url || !key) return false;
  if (url.includes('TU_URL') || url.includes('xxxxxxxx') || key.includes('TU_KEY')) return false;
  return true;
}
