import { Platform } from 'react-native';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

export function initPwaInstallPromptListener() {
  if (!isWeb) return () => undefined;

  const onBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    installListeners.forEach((listener) => listener());
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
}

export function subscribePwaInstallPrompt(listener: () => void) {
  installListeners.add(listener);
  return () => installListeners.delete(listener);
}

export function canPromptPwaInstall() {
  return !!deferredInstallPrompt;
}

export async function promptPwaInstall() {
  if (!deferredInstallPrompt) return false;
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice.catch(() => null);
  return choice?.outcome === 'accepted';
}

export function isIosWeb() {
  if (!isWeb) return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function isStandalonePwa() {
  if (!isWeb) return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

export async function requestWebNotificationPermission() {
  if (!isWeb || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function showWebNotification(title: string, body: string) {
  if (!(await requestWebNotificationPermission())) return;

  const registration = await navigator.serviceWorker?.ready?.catch(() => null);
  if (registration?.showNotification) {
    await registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'el-patron-notice',
      renotify: true,
    } as NotificationOptions);
    return;
  }

  new Notification(title, { body, icon: '/icon-192.png' });
}

export function setPwaBadge(count: number) {
  if (!isWeb || typeof navigator === 'undefined') return;
  const badgeApi = navigator as Navigator & {
    setAppBadge?: (contents?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };

  if (count > 0 && badgeApi.setAppBadge) {
    void badgeApi.setAppBadge(count).catch(() => undefined);
  } else if (count <= 0 && badgeApi.clearAppBadge) {
    void badgeApi.clearAppBadge().catch(() => undefined);
  }
}
