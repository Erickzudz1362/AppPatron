import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import HomeScreen from '../screens/home/HomeScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import BarbersStackNavigator from './BarbersStack';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileStackNavigator from './ProfileStack';
import { useAppTheme } from '../theme/ThemeProvider';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: {
          paddingBottom: tabBarBottom,
          paddingTop: 8,
          minHeight: 52 + tabBarBottom,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Historial',
          tabBarIcon: ({ color, size }) => <Feather name="clock" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Barbers"
        component={BarbersStackNavigator}
        options={{
          tabBarLabel: 'Barberos',
          tabBarIcon: ({ color, size }) => <Feather name="scissors" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Avisos',
          tabBarIcon: ({ color, size }) => <Feather name="bell" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
          /** Al cambiar de pestaña, el stack interno vuelve arriba (pantalla principal de perfil, no Pago QR ni editar). */
          popToTopOnBlur: true,
        }}
      />
    </Tab.Navigator>
  );
}
