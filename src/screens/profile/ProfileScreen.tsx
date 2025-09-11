// src/screens/profile/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Linking,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeProvider'; // 👈 usa el provider global

export default function ProfileScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const gutter = width < 360 ? 12 : width < 400 ? 16 : width < 768 ? 20 : 24;

  // Tema global
  const { isDark, colors, toggleTheme } = useAppTheme();

  // Estados locales (DB más adelante)
  const [pushEnabled, setPushEnabled] = useState(true);

  const openWhatsApp = () => Linking.openURL('https://wa.me/59170000000');
  const openTerms = () => Alert.alert('Términos', 'Mostrar términos y condiciones (web o screen).');
  const openPrivacy = () => Alert.alert('Privacidad', 'Mostrar política de privacidad (web o screen).');
  const openHelp = () => Alert.alert('Ayuda', 'FAQ, soporte por WhatsApp o email.');

  const handleEditProfile = () => {
    Alert.alert('Editar perfil', 'Aquí iría la pantalla de edición (nombre, teléfono, etc.)');
    // navigation.navigate('EditProfile');
  };

  const handlePaymentMethods = () => {
    Alert.alert('Métodos de pago', 'Gestión de QR / métodos guardados (futuro).');
    // navigation.navigate('PaymentMethods');
  };

  const handleLogout = () => {
    Alert.alert('Sesión cerrada', 'Has cerrado sesión correctamente.');
    navigation.replace('Login');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Seguro que deseas eliminar tu cuenta? Esta acción es irreversible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => Alert.alert('Cuenta eliminada') },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingHorizontal: gutter }]}>
        {/* Header */}
        <Text style={[styles.title, { color: colors.primary }]}>Mi Perfil</Text>

        {/* Card: usuario */}
        <View
          style={[
            styles.userCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Image source={require('../../../assets/Elpatron-Logo.png')} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>Sebastián Mendieta</Text>
            <Text style={[styles.meta, { color: colors.subtext }]}>cliente • sebastian@email.com</Text>
            <Text style={[styles.meta, { color: colors.subtext }]}>+591 70000000</Text>
          </View>
          <TouchableOpacity
            onPress={handleEditProfile}
            style={[styles.editBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="edit-2" size={16} color={colors.onPrimary} />
            <Text style={[styles.editText, { color: colors.onPrimary }]}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* Acciones rápidas */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="credit-card"
            label="Pago (QR)"
            onPress={handlePaymentMethods}
            colors={colors}
          />
          <QuickAction icon="message-circle" label="WhatsApp" onPress={openWhatsApp} colors={colors} />
          <QuickAction
            icon="calendar"
            label="Mis reservas"
            onPress={() => navigation.navigate('History')}
            colors={colors}
          />
        </View>

        {/* Preferencias */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferencias</Text>
        <RowSwitch
          icon="bell"
          label="Notificaciones push"
          value={pushEnabled}
          onValueChange={setPushEnabled}
          colors={colors}
        />
        <RowSwitch
          icon="moon"
          label="Modo oscuro"
          value={isDark}
          onValueChange={toggleTheme}
          colors={colors}
        />

        {/* Cuenta */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cuenta</Text>
        <RowLink icon="file-text" label="Términos y Condiciones" onPress={openTerms} colors={colors} />
        <RowLink icon="shield" label="Política de Privacidad" onPress={openPrivacy} colors={colors} />
        <RowLink icon="help-circle" label="Ayuda" onPress={openHelp} colors={colors} />

        {/* Sesión */}
        <View style={{ height: 12 }} />
        <TouchableOpacity style={[styles.logout, { backgroundColor: colors.primary }]} onPress={handleLogout}>
          <Feather name="log-out" size={18} color={colors.onPrimary} />
          <Text style={[styles.logoutText, { color: colors.onPrimary }]}>Cerrar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.delete} onPress={handleDeleteAccount}>
          <Feather name="trash-2" size={16} color={colors.danger} />
          <Text style={[styles.deleteText, { color: colors.danger }]}>Eliminar cuenta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ---------- Componentes reutilizables (con tema) ---------- */

function RowLink({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[rowStyles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={rowStyles.left}>
        <Feather name={icon} size={18} color={colors.primary} />
        <Text style={[rowStyles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.subtext} />
    </TouchableOpacity>
  );
}

function RowSwitch({
  icon,
  label,
  value,
  onValueChange,
  colors,
}: {
  icon: any;
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  colors: any;
}) {
  return (
    <View style={[rowStyles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={rowStyles.left}>
        <Feather name={icon} size={18} color={colors.primary} />
        <Text style={[rowStyles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.onPrimary}
      />
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        qaStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[qaStyles.iconWrap, { backgroundColor: colors.surface }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[qaStyles.label, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ----------------- Estilos base (sin colores fijos) ----------------- */

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: 40 },
  container: { flex: 1, paddingTop: 8, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  avatar: { width: 64, height: 64, borderRadius: 64, marginRight: 12 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 2 },

  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  editText: { fontWeight: '600', fontSize: 12 },

  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },

  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },

  logout: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: { fontWeight: '700' },

  delete: { alignSelf: 'center', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteText: { fontSize: 13, fontWeight: '600' },
});

const rowStyles = StyleSheet.create({
  row: {
    height: 56,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 14, fontWeight: '500' },
});

const qaStyles = StyleSheet.create({
  card: {
    width: '32%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
