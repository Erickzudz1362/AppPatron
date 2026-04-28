import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';

export default function StaffHomeScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { role, signOut, profile } = useAuth();
  const isAdmin = role === 'admin';

  const modules = [
    { key: 'Bookings', title: 'Reservas', icon: 'calendar' as const, visible: true },
    { key: 'Services', title: 'Servicios', icon: 'scissors' as const, visible: isAdmin },
    { key: 'Barbers', title: 'Barberos', icon: 'users' as const, visible: isAdmin },
    { key: 'Notices', title: 'Avisos', icon: 'bell' as const, visible: isAdmin },
    { key: 'Media', title: 'Carrusel y QR', icon: 'image' as const, visible: isAdmin },
    { key: 'Coupons', title: 'Cupones', icon: 'tag' as const, visible: isAdmin },
    { key: 'Settings', title: 'Ajustes', icon: 'settings' as const, visible: isAdmin },
  ].filter((m) => m.visible);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <Text style={styles.title}>Administración</Text>
        <Text style={styles.sub}>
          Rol: {role ?? '—'}{profile?.name ? ` · ${profile.name}` : ''}
        </Text>

        <View style={styles.grid}>
          {modules.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate(m.key)}
            >
              <Feather name={m.icon} size={22} color={colors.primary} />
              <Text style={styles.cardTitle}>{m.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutTxt}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: {
  primary: string;
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
}) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 4 },
    sub: { color: colors.subtext, marginBottom: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: {
      width: '48%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
      marginBottom: 10,
      minHeight: 92,
      justifyContent: 'space-between',
    },
    cardTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
    logoutBtn: {
      marginTop: 8,
      height: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    logoutTxt: { color: '#fff', fontWeight: '700' },
  });
}

