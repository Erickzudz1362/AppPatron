import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import HomeScreen from '../screens/home/HomeScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import BarbersStackNavigator from './BarbersStack';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileStackNavigator from './ProfileStack';
import { useAppTheme } from '../theme/ThemeProvider';
import { fetchNotices } from '../api/supabaseData';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { setPwaBadge } from '../pwa/webPwa';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { colors } = useAppTheme();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 12);
  const [noticeBadge, setNoticeBadge] = useState(0);

  useEffect(() => {
    let mounted = true;
    const refreshBadge = async () => {
      const rows = await fetchNotices().catch(() => []);
      if (!mounted) return;
      const count = rows.filter((row) => !row.read).length;
      setNoticeBadge(count);
      setPwaBadge(count);
    };

    void refreshBadge();
    const interval = setInterval(refreshBadge, 15_000);
    const channel = supabase
      .channel(`main-tabs-notice-badge-${session?.user?.id ?? 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => void refreshBadge())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads' }, () => void refreshBadge())
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(interval);
      setPwaBadge(0);
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

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
          height: 64 + tabBarBottom,
          minHeight: 64 + tabBarBottom,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, paddingBottom: 2 },
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
          tabBarBadge: noticeBadge > 0 ? noticeBadge : undefined,
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
