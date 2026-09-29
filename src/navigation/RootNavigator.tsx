import React, { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyCodeScreen from '../screens/VerifyCodeScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SessionWithoutProfileScreen from '../screens/SessionWithoutProfileScreen';
import AppBootSkeletonScreen from '../screens/AppBootSkeletonScreen';
import AdminRoleSelectScreen from '../screens/AdminRoleSelectScreen';
import MainTabs from './MainTabs';
import StaffNavigator from './StaffNavigator';
import BarberStaffTabs from './BarberStaffTabs';

import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme/ThemeProvider';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function AppNavigationContainer({ children }: { children: React.ReactNode }) {
  const { navTheme } = useAppTheme();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    window.history.replaceState({ elPatron: true }, '', window.location.href);
    window.history.pushState({ elPatron: true }, '', window.location.href);

    const onPopState = () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
      }
      window.history.pushState({ elPatron: true }, '', window.location.href);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {children}
    </NavigationContainer>
  );
}

export function RootNavigator() {
  const { initializing, session, profile, profileLoadPending, actualRole, role, adminViewRole, passwordRecovery } = useAuth();
  const { colors } = useAppTheme();

  useEffect(() => {
    if (Platform.OS === 'web' || !session?.user || !role) return;
    let active = true;
    let subscription: { remove: () => void } | null = null;

    const openRelevantScreen = (data: Record<string, unknown> | undefined) => {
      if (!active || !navigationRef.isReady()) return;
      const kind = typeof data?.kind === 'string' ? data.kind : '';
      if (!kind) return;
      if (role === 'admin') {
        (navigationRef.navigate as any)('StaffRoot', { screen: 'Bookings' });
      } else if (role === 'barber') {
        (navigationRef.navigate as any)('BarberStaffRoot', { screen: 'BarberBookings' });
      } else {
        (navigationRef.navigate as any)('Main', { screen: 'History' });
      }
    };

    void import('expo-notifications/build/NotificationsEmitter').then((notifications) => {
      if (!active) return;
      const lastResponse = notifications.getLastNotificationResponse();
      if (lastResponse) {
        openRelevantScreen(lastResponse.notification.request.content.data as Record<string, unknown>);
        notifications.clearLastNotificationResponse();
      }
      subscription = notifications.addNotificationResponseReceivedListener((response) => {
        openRelevantScreen(response.notification.request.content.data as Record<string, unknown>);
      });
    }).catch(() => undefined);

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [role, session?.user]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !session?.user || !role) return;
    const target = new URLSearchParams(window.location.search).get('screen');
    if (!target || !navigationRef.isReady()) return;

    if (target === 'Bookings' && role === 'admin') {
      (navigationRef.navigate as any)('StaffRoot', { screen: 'Bookings' });
    } else if (target === 'Bookings' && role === 'barber') {
      (navigationRef.navigate as any)('BarberStaffRoot', { screen: 'BarberBookings' });
    } else if (target === 'History' && role === 'client') {
      (navigationRef.navigate as any)('Main', { screen: 'History' });
    }

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('screen');
    window.history.replaceState(window.history.state, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  }, [role, session?.user]);

  const stackScreenOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: colors.background },
  } as const;

  if (initializing) {
    return <SplashScreen />;
  }

  if (!session) {
    return (
      <AppNavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
        </Stack.Navigator>
      </AppNavigationContainer>
    );
  }

  if (passwordRecovery) {
    return (
      <AppNavigationContainer>
        <Stack.Navigator screenOptions={stackScreenOptions}>
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
      </AppNavigationContainer>
    );
  }

  if (!profile) {
    if (profileLoadPending) {
      return (
        <AppNavigationContainer>
          <Stack.Navigator screenOptions={stackScreenOptions}>
            <Stack.Screen name="AppBoot" component={AppBootSkeletonScreen} />
          </Stack.Navigator>
        </AppNavigationContainer>
      );
    }
    return (
      <AppNavigationContainer>
        <Stack.Navigator screenOptions={stackScreenOptions}>
          <Stack.Screen name="SessionWithoutProfile" component={SessionWithoutProfileScreen} />
        </Stack.Navigator>
      </AppNavigationContainer>
    );
  }

  if (actualRole === 'admin' && !adminViewRole) {
    return (
      <AppNavigationContainer>
        <Stack.Navigator screenOptions={stackScreenOptions}>
          <Stack.Screen name="AdminRoleSelect" component={AdminRoleSelectScreen} />
        </Stack.Navigator>
      </AppNavigationContainer>
    );
  }

  const isStaff = role === 'barber' || role === 'admin';

  return (
    <AppNavigationContainer>
      <Stack.Navigator screenOptions={stackScreenOptions}>
        {isStaff ? (
          role === 'admin' ? (
            <Stack.Screen name="StaffRoot" component={StaffNavigator} />
          ) : (
            <Stack.Screen name="BarberStaffRoot" component={BarberStaffTabs} />
          )
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </AppNavigationContainer>
  );
}
