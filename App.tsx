import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyCodeScreen from './src/screens/VerifyCodeScreen';
import MainTabs from './src/navigation/MainTabs';
// import BarberDetailScreen from './src/screens/barbers/BarberDetailScreen';

import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { navTheme } = useAppTheme();
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        {/* <Stack.Screen name="BarberDetail" component={BarberDetailScreen} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
