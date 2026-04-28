import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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

export function RootNavigator() {
  const { initializing, session, profile, profileLoadPending, role, passwordRecovery } = useAuth();
  const { navTheme, colors } = useAppTheme();

  const stackScreenOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: colors.background },
  } as const;

  if (initializing) {
    return <SplashScreen />;
  }

  if (!session) {
    return (
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (passwordRecovery) {
    return (
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={stackScreenOptions}>
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (!profile) {
    if (profileLoadPending) {
      return (
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator screenOptions={stackScreenOptions}>
            <Stack.Screen name="AppBoot" component={AppBootSkeletonScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      );
    }
    return (
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={stackScreenOptions}>
          <Stack.Screen name="SessionWithoutProfile" component={SessionWithoutProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  const isStaff = role === 'barber' || role === 'admin';

  return (
    <NavigationContainer theme={navTheme}>
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
    </NavigationContainer>
  );
}
