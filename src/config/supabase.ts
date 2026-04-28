import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { supabaseUrl?: string; supabaseAnonKey?: string } | undefined;
const rawSupabaseUrl =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
  extra?.supabaseUrl ||
  'TU_URL_AQUI';
const rawSupabaseAnonKey =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  extra?.supabaseAnonKey ||
  'TU_KEY_AQUI';

const supabaseUrl = /^https?:\/\//i.test(String(rawSupabaseUrl))
  ? String(rawSupabaseUrl)
  : 'https://example.supabase.co';
const supabaseAnonKey = String(rawSupabaseAnonKey || 'public-anon-placeholder');

/** Ref del proyecto (subdominio) para que la clave en AsyncStorage no mezcle sesiones entre proyectos. */
function supabaseProjectRef(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.split('.')[0] || 'default';
  } catch {
    return 'default';
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    storageKey: `sb-${supabaseProjectRef(supabaseUrl)}-auth-token`,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
