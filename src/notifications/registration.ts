import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { cancelAppointmentReminders, registerPushToken } from './push';

const ENABLED_KEY = 'el_patron_notifications_enabled_v1';
const NATIVE_TOKEN_KEY = 'el_patron_native_push_token_v1';

function vapidKeyBytes(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = globalThis.atob(base64);
  const bytes = Uint8Array.from(Array.from(raw).map((character) => character.charCodeAt(0)));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function notificationsEnabled(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  return (await AsyncStorage.getItem(`${ENABLED_KEY}:${userId}`)) === 'true';
}

async function enableWebPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador no admite notificaciones push instalables.');
  }
  const publicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) throw new Error('Falta configurar EXPO_PUBLIC_VAPID_PUBLIC_KEY en el despliegue web.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('No se concedió permiso para notificaciones.');

  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('El Service Worker todavía no está listo. Recarga la PWA e intenta nuevamente.')), 6000)),
  ]);
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKeyBytes(publicKey),
  });

  const serialized = subscription.toJSON();
  const { error } = await supabase.from('web_push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    subscription: serialized,
    user_agent: navigator.userAgent.slice(0, 500),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,endpoint' });
  if (error) throw error;
}

async function disableWebPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from('web_push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe().catch(() => false);
}

async function enableNativePush(userId: string, currentTokens: string[] | null | undefined): Promise<void> {
  const token = await registerPushToken();
  if (!token) throw new Error('No se pudo registrar este dispositivo para notificaciones.');
  const { data: freshProfile } = await supabase
    .from('profiles')
    .select('push_tokens')
    .eq('id', userId)
    .maybeSingle();
  const serverTokens = Array.isArray(freshProfile?.push_tokens) ? freshProfile.push_tokens.map(String) : currentTokens ?? [];
  const next = Array.from(new Set([...serverTokens, token]));
  const { error } = await supabase.from('profiles').update({ push_tokens: next }).eq('id', userId);
  if (error) throw error;
  await AsyncStorage.setItem(NATIVE_TOKEN_KEY, token);
}

async function disableNativePush(userId: string, currentTokens: string[] | null | undefined): Promise<void> {
  await cancelAppointmentReminders();
  const token = await AsyncStorage.getItem(NATIVE_TOKEN_KEY);
  if (!token) return;
  const { data: freshProfile } = await supabase
    .from('profiles')
    .select('push_tokens')
    .eq('id', userId)
    .maybeSingle();
  const serverTokens = Array.isArray(freshProfile?.push_tokens) ? freshProfile.push_tokens.map(String) : currentTokens ?? [];
  const next = serverTokens.filter((value) => value !== token);
  await supabase.from('profiles').update({ push_tokens: next }).eq('id', userId);
  await AsyncStorage.removeItem(NATIVE_TOKEN_KEY);
}

export async function setNotificationsEnabled(params: {
  enabled: boolean;
  userId: string;
  currentNativeTokens?: string[] | null;
}): Promise<void> {
  if (params.enabled) {
    if (Platform.OS === 'web') await enableWebPush(params.userId);
    else await enableNativePush(params.userId, params.currentNativeTokens);
  } else if (Platform.OS === 'web') {
    await disableWebPush(params.userId);
  } else {
    await disableNativePush(params.userId, params.currentNativeTokens);
  }
  await AsyncStorage.setItem(`${ENABLED_KEY}:${params.userId}`, String(params.enabled));
}
