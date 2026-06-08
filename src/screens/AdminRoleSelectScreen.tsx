import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme/ThemeProvider';
import type { UserRole } from '../types/profile';

const OPTIONS: Array<{
  role: UserRole;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  {
    role: 'admin',
    title: 'Administrador',
    subtitle: 'Gestionar reservas, barberos, servicios, avisos y contenido.',
    icon: 'shield',
  },
  {
    role: 'barber',
    title: 'Barbero',
    subtitle: 'Ver la agenda y trabajar con el panel de reservas del barbero.',
    icon: 'scissors',
  },
  {
    role: 'client',
    title: 'Cliente',
    subtitle: 'Entrar como cliente para revisar reservas, historial y avisos.',
    icon: 'user',
  },
];

export default function AdminRoleSelectScreen() {
  const { colors } = useAppTheme();
  const { profile, setAdminViewRole, signOut } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Feather name="key" size={16} color={colors.primary} />
            <Text style={styles.badgeText}>Cuenta admin</Text>
          </View>
          <Text style={styles.title}>¿Cómo quieres entrar?</Text>
          <Text style={styles.subtitle}>
            {profile?.name?.trim() ? `${profile.name.trim()}, elige el modo de trabajo para esta sesión.` : 'Elige el modo de trabajo para esta sesión.'}
          </Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.role}
              style={styles.card}
              onPress={() => setAdminViewRole(option.role)}
              activeOpacity={0.86}
            >
              <View style={styles.iconWrap}>
                <Feather name={option.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={22} color={colors.subtext} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={() => void signOut()} activeOpacity={0.85}>
          <Feather name="log-out" size={18} color={colors.subtext} />
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
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
    content: {
      flex: 1,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      padding: 18,
      justifyContent: 'center',
    },
    hero: { marginBottom: 18 },
    badge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.mutedBg,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginBottom: 14,
    },
    badgeText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
    title: { color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: 8 },
    subtitle: { color: colors.subtext, fontSize: 15, lineHeight: 21 },
    options: { gap: 12 },
    card: {
      minHeight: 92,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.mutedBg,
    },
    cardText: { flex: 1 },
    cardTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 3 },
    cardSubtitle: { color: colors.subtext, fontSize: 13, lineHeight: 18 },
    signOutBtn: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginTop: 18,
    },
    signOutText: { color: colors.subtext, fontWeight: '800' },
  });
}
