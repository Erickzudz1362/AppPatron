// App.tsx
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Importar solo el handler evita cargar el registro automático de push (DevicePushTokenAutoRegistration),
// que en Expo Go Android SDK 53+ dispara console.error y la pantalla roja de desarrollo.
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';

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
