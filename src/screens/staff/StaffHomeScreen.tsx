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
    { key: 'Bookings', title: 'Reservas', subtitle: 'Hoy, estados y clientes', icon: 'calendar' as const, visible: true },
    { key: 'Services', title: 'Servicios', subtitle: 'Crear, editar y eliminar', icon: 'scissors' as const, visible: isAdmin },
    { key: 'Barbers', title: 'Barberos', subtitle: 'Equipo, fotos y horarios', icon: 'users' as const, visible: isAdmin },
    { key: 'Notices', title: 'Avisos', subtitle: 'Promos y comunicados', icon: 'bell' as const, visible: isAdmin },
    { key: 'Media', title: 'Contenido', subtitle: 'Carruseles, galeria y QR', icon: 'image' as const, visible: isAdmin },
    { key: 'Coupons', title: 'Cupones', subtitle: 'Descuentos activos', icon: 'tag' as const, visible: isAdmin },
    { key: 'Settings', title: 'Ajustes', subtitle: 'Reglas y contacto', icon: 'settings' as const, visible: isAdmin },
  ].filter((module) => module.visible);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name={isAdmin ? 'shield' : 'calendar'} size={24} color="#fff" />
          </View>
          <Text style={styles.kicker}>{isAdmin ? 'Panel administrador' : 'Panel barbero'}</Text>
          <Text style={styles.title}>Control de El Patron</Text>
          <Text style={styles.sub}>
            {profile?.name ? `${profile.name} · ` : ''}{isAdmin ? 'Gestiona reservas, equipo y contenido.' : 'Revisa tus reservas y avisos.'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{modules.length}</Text>
            <Text style={styles.summaryLabel}>Modulos</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{isAdmin ? 'Admin' : 'Barbero'}</Text>
            <Text style={styles.summaryLabel}>Rol activo</Text>
          </View>
        </View>

        <Text style={styles.section}>Accesos rapidos</Text>
        <View style={styles.grid}>
          {modules.map((module) => (
            <TouchableOpacity
              key={module.key}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate(module.key)}
            >
              <View style={styles.cardIcon}>
                <Feather name={module.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{module.title}</Text>
              <Text style={styles.cardSub}>{module.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Feather name="log-out" size={18} color="#fff" />
          <Text style={styles.logoutTxt}>Cerrar sesion</Text>
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
  mutedBg: string;
}) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 28 },
    hero: {
      borderRadius: 26,
      padding: 20,
      marginBottom: 14,
      backgroundColor: colors.primary,
      overflow: 'hidden',
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
      marginBottom: 14,
    },
    kicker: { color: 'rgba(255,255,255,0.86)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
    title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4 },
    sub: { color: 'rgba(255,255,255,0.9)', marginTop: 8, lineHeight: 20 },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    summaryCard: { flex: 1, borderRadius: 18, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    summaryValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
    summaryLabel: { color: colors.subtext, marginTop: 4, fontWeight: '700' },
    section: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: {
      width: '48%',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
      marginBottom: 12,
      minHeight: 132,
      justifyContent: 'space-between',
    },
    cardIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mutedBg },
    cardTitle: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 10 },
    cardSub: { color: colors.subtext, fontSize: 12, lineHeight: 16, marginTop: 4 },
    logoutBtn: {
      marginTop: 8,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      flexDirection: 'row',
      gap: 8,
    },
    logoutTxt: { color: '#fff', fontWeight: '900' },
  });
}
