import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme/ThemeProvider';
import StaffHomeScreen from '../screens/staff/StaffHomeScreen';
import StaffBookingsScreen from '../screens/staff/StaffBookingsScreen';
import StaffServicesScreen from '../screens/staff/StaffServicesScreen';
import StaffBarbersScreen from '../screens/staff/StaffBarbersScreen';
import StaffNoticesScreen from '../screens/staff/StaffNoticesScreen';
import StaffMediaScreen from '../screens/staff/StaffMediaScreen';
import StaffCouponsScreen from '../screens/staff/StaffCouponsScreen';
import StaffSettingsScreen from '../screens/staff/StaffSettingsScreen';

const Stack = createNativeStackNavigator();

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const { colors } = useAppTheme();
  if (role === 'admin') return <>{children}</>;
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Sin permisos</Text>
      <Text style={[styles.sub, { color: colors.subtext }]}>
        Este módulo está disponible solo para administradores.
      </Text>
    </View>
  );
}

function ServicesGate(props: object) {
  return (
    <AdminOnly>
      <StaffServicesScreen {...(props as any)} />
    </AdminOnly>
  );
}
function BarbersGate(props: object) {
  return (
    <AdminOnly>
      <StaffBarbersScreen {...(props as any)} />
    </AdminOnly>
  );
}
function NoticesGate(props: object) {
  return (
    <AdminOnly>
      <StaffNoticesScreen {...(props as any)} />
    </AdminOnly>
  );
}
function MediaGate(props: object) {
  return (
    <AdminOnly>
      <StaffMediaScreen {...(props as any)} />
    </AdminOnly>
  );
}
function CouponsGate(props: object) {
  return (
    <AdminOnly>
      <StaffCouponsScreen {...(props as any)} />
    </AdminOnly>
  );
}
function SettingsGate(props: object) {
  return (
    <AdminOnly>
      <StaffSettingsScreen {...(props as any)} />
    </AdminOnly>
  );
}

export default function StaffNavigator() {
  const { colors } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="StaffHome" component={StaffHomeScreen} />
      <Stack.Screen name="Bookings" component={StaffBookingsScreen} />
      <Stack.Screen name="Services" component={ServicesGate} />
      <Stack.Screen name="Barbers" component={BarbersGate} />
      <Stack.Screen name="Notices" component={NoticesGate} />
      <Stack.Screen name="Media" component={MediaGate} />
      <Stack.Screen name="Coupons" component={CouponsGate} />
      <Stack.Screen name="Settings" component={SettingsGate} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 15, marginBottom: 4, textAlign: 'center' },
});
