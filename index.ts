import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';

// Tras limpiar sesion local por refresh invalido, GoTrue aun puede loguear el error una vez.
if (__DEV__) {
  LogBox.ignoreLogs(['Invalid Refresh Token']);
}

if (typeof window !== 'undefined') {
  document.title = 'El Patron Barberia';

  const manifest = document.querySelector('link[rel="manifest"]');
  if (!manifest) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.webmanifest';
    document.head.appendChild(link);
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (!themeColor) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#08b9c7';
    document.head.appendChild(meta);
  }

  const appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
  if (!appleCapable) {
    const meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-capable';
    meta.content = 'yes';
    document.head.appendChild(meta);
  }

  const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleStatusBar) {
    const meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-status-bar-style';
    meta.content = 'default';
    document.head.appendChild(meta);
  }

  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!appleTitle) {
    const meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-title';
    meta.content = 'El Patron';
    document.head.appendChild(meta);
  }

  const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleIcon) {
    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.href = '/apple-touch-icon.png';
    document.head.appendChild(link);
  }

  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {
        // La app debe seguir funcionando aunque el navegador no acepte el service worker.
      });
    });
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// It also ensures that the environment is ready in Expo Go and native builds.
registerRootComponent(App);
