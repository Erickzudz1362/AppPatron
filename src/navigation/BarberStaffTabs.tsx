import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme/ThemeProvider';
import StaffBookingsScreen from '../screens/staff/StaffBookingsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

const Tab = createBottomTabNavigator();

function SignOutHeaderRight() {
  const { signOut } = useAuth();
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity onPress={() => void signOut()} hitSlop={12} style={{ marginRight: 12 }}>
      <Feather name="log-out" size={20} color={colors.subtext} />
    </TouchableOpacity>
  );
}

export default function BarberStaffTabs() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        headerRight: () => <SignOutHeaderRight />,
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
        name="BarberBookings"
        component={StaffBookingsScreen}
        options={{
          title: 'Reservas',
          headerTitle: 'Panel barbero',
          tabBarLabel: 'Reservas',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="BarberNotices"
        component={NotificationsScreen}
        options={{
          title: 'Avisos',
          headerTitle: 'Avisos',
          tabBarLabel: 'Avisos',
          tabBarIcon: ({ color, size }) => <Feather name="bell" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
