import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Feather from 'react-native-vector-icons/Feather';

import HomeScreen from '../screens/home/HomeScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import BarbersScreen from '../screens/barbers/BarbersScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { useAppTheme } from '../theme/ThemeProvider';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          backgroundColor: colors.card, // 👈 cambia con el tema
          borderTopColor: colors.border, // 👈 borde dinámico
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
        component={BarbersScreen}
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
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
