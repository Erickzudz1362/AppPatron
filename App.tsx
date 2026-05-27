// App.tsx
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Importar solo el handler evita cargar el registro automatico de push (DevicePushTokenAutoRegistration),
// que en Expo Go Android SDK 53+ dispara console.error y la pantalla roja de desarrollo.
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';

import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';

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
    </View>
  );
}

export default function App() {
  const [iconsReady, setIconsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    Font.loadAsync(Feather.font)
      .catch(() => undefined)
      .finally(() => {
        if (mounted) {
          setIconsReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!iconsReady) {
    return null;
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
