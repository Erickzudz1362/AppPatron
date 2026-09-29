// App.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Importar solo el handler evita cargar el registro automatico de push (DevicePushTokenAutoRegistration),
// que en Expo Go Android SDK 53+ dispara console.error y la pantalla roja de desarrollo.
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import * as Font from 'expo-font';
import Feather from '@expo/vector-icons/Feather';

import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';
import { PwaInstallPrompt } from './src/components/PwaInstallPrompt';

setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function ThemedAppShell() {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RootNavigator />
      <PwaInstallPrompt />
    </View>
  );
}

export default function App() {
  const [iconsReady, setIconsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fallback = setTimeout(() => {
      if (mounted) {
        setIconsReady(true);
      }
    }, 120);

    Font.loadAsync(Feather.font)
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(fallback);
        if (mounted) {
          setIconsReady(true);
        }
      });

    return () => {
      mounted = false;
      clearTimeout(fallback);
    };
  }, []);

  if (!iconsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06141D' }}>
        <Image source={require('./assets/splash-icon.png')} style={{ width: 88, height: 88, borderRadius: 22, marginBottom: 18 }} />
        <ActivityIndicator color="#08B9C7" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <ThemedAppShell />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
