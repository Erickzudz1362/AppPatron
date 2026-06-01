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
  const { initializing, session, profile, profileLoadPending, role, passwordRecovery } = useAuth();
  const { colors } = useAppTheme();

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
