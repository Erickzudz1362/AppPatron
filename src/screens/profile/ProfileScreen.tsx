// src/screens/profile/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  Linking,
  useWindowDimensions,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { TabScreenHeader } from '../../components/TabScreenHeader';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import { BARBER_WHATSAPP_URL } from '../../constants/contact';
import type { ProfileStackParamList } from '../../navigation/ProfileStack';
import AppDialog from '../../components/AppDialog';

type ProfileNav = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>,
  BottomTabNavigationProp<any>
>;

export default function ProfileScreen({ navigation }: { navigation: ProfileNav }) {
  const { width } = useWindowDimensions();
  const gutter = width < 360 ? 12 : width < 400 ? 16 : width < 768 ? 20 : 24;
  const tabBarHeight = useBottomTabBarHeight();
  const { signOut, profile, session, role, profileLoadPending } = useAuth();

  const { isDark, colors, toggleTheme } = useAppTheme();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(isDark);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [errorDialog, setErrorDialog] = useState<string | null>(null);

  useEffect(() => setDarkMode(isDark), [isDark]);

  const displayName =
    profile?.name?.trim() || session?.user?.email?.split('@')[0] || 'Cliente';
  const email = session?.user?.email ?? '—';
  const phone = profile?.phone?.trim() || 'Sin número';
  const roleLabel =
    role === 'barber' ? 'Barbero' : role === 'admin' ? 'Administrador' : 'Cliente';

  const openWhatsApp = () => Linking.openURL(BARBER_WHATSAPP_URL);

  const goTerms = () => navigation.navigate('LegalDocument', { document: 'terms' });
  const goPrivacy = () => navigation.navigate('LegalDocument', { document: 'privacy' });
  const goHelp = () => navigation.navigate('LegalDocument', { document: 'help' });

  const goEdit = () => navigation.navigate('EditProfile');
  const goQr = () => navigation.navigate('QrPayment');

  const handleLogout = () => {
    setLogoutConfirmVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutConfirmVisible(false);
    try {
      await signOut();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cerrar sesión';
      setErrorDialog(msg);
    }
  };

  const handleDeleteAccount = () => navigation.navigate('DeleteAccount');

  const goHistory = () => {
    navigation.navigate('History' as never);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: gutter, paddingBottom: tabBarHeight + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TabScreenHeader title="Mi perfil" titleColor={colors.primary} />

        {profileLoadPending && !profile ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subtext }]}>Cargando tu perfil…</Text>
          </View>
        ) : (
          <View
            style={[
              styles.userCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? 'transparent' : '#000',
              },
            ]}
          >
            <View style={styles.avatarCol}>
              <ProfileAvatar photoUrl={profile?.photo_url} size={64} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.meta, { color: colors.subtext }]} numberOfLines={1}>
                {roleLabel} • {email}
              </Text>
              <Text style={[styles.meta, { color: colors.subtext }]} numberOfLines={1}>
                {phone}
              </Text>
            </View>
            <TouchableOpacity
              onPress={goEdit}
              style={[styles.editBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="edit-2" size={16} color="#fff" />
              <Text style={styles.editText}>Editar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.quickRow}>
          <QuickAction icon="credit-card" label="Pago (QR)" color={colors} onPress={goQr} />
          <QuickAction icon="message-circle" label="WhatsApp" color={colors} onPress={openWhatsApp} />
          <QuickAction icon="calendar" label="Mis reservas" color={colors} onPress={goHistory} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferencias</Text>
        <RowSwitch
          icon="bell"
          label="Notificaciones push"
          value={pushEnabled}
          onValueChange={setPushEnabled}
          color={colors}
        />
        <RowSwitch
          icon="moon"
          label="Modo oscuro"
          value={darkMode}
          onValueChange={() => {
            toggleTheme();
            setDarkMode(!darkMode);
          }}
          color={colors}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cuenta</Text>
        <RowLink icon="file-text" label="Términos y Condiciones" onPress={goTerms} color={colors} />
        <RowLink icon="shield" label="Política de Privacidad" onPress={goPrivacy} color={colors} />
        <RowLink icon="help-circle" label="Ayuda" onPress={goHelp} color={colors} />

        <View style={{ height: 12 }} />
        <TouchableOpacity style={[styles.logout, { backgroundColor: colors.primary }]} onPress={handleLogout}>
          <Feather name="log-out" size={18} color="#fff" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.delete} onPress={handleDeleteAccount}>
          <Feather name="trash-2" size={16} color={isDark ? '#ff5a67' : '#b00020'} />
          <Text style={[styles.deleteText, { color: isDark ? '#ff5a67' : '#b00020' }]}>Eliminar cuenta</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={logoutConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Cerrar sesión</Text>
            <Text style={[styles.modalMessage, { color: colors.subtext }]}>
              ¿Seguro que quieres salir de tu cuenta?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnGhost, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setLogoutConfirmVisible(false)}
              >
                <Text style={[styles.modalBtnGhostText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={confirmLogout}>
                <Text style={styles.modalBtnText}>Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AppDialog
        visible={!!errorDialog}
        title="Error"
        message={errorDialog ?? ''}
        onClose={() => setErrorDialog(null)}
      />
    </SafeAreaView>
  );
}

function RowLink({
  icon,
  label,
  onPress,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  color: {
    card: string;
    border: string;
    primary: string;
    text: string;
    subtext: string;
  };
}) {
  return (
    <TouchableOpacity
      style={[rowStyles.row, { backgroundColor: color.card, borderColor: color.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={rowStyles.left}>
        <Feather name={icon} size={18} color={color.primary} />
        <Text style={[rowStyles.label, { color: color.text }]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={color.subtext} />
    </TouchableOpacity>
  );
}

function RowSwitch({
  icon,
  label,
  value,
  onValueChange,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  color: {
    card: string;
    border: string;
    primary: string;
    text: string;
  };
}) {
  return (
    <View style={[rowStyles.row, { backgroundColor: color.card, borderColor: color.border }]}>
      <View style={rowStyles.left}>
        <Feather name={icon} size={18} color={color.primary} />
        <Text style={[rowStyles.label, { color: color.text }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#d9dde1', true: color.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  color: {
    card: string;
    border: string;
    mutedBg: string;
    primary: string;
    text: string;
  };
}) {
  return (
    <TouchableOpacity
      style={[qaStyles.card, { backgroundColor: color.card, borderColor: color.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[qaStyles.iconWrap, { backgroundColor: color.mutedBg }]}>
        <Feather name={icon} size={18} color={color.primary} />
      </View>
      <Text style={[qaStyles.label, { color: color.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  loadingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  loadingText: { fontSize: 14 },

  avatarCol: {
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  meta: { fontSize: 13, marginTop: 5, lineHeight: 18 },

  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  editText: { color: '#fff', fontWeight: '600', fontSize: 12 },

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
  logoutText: { color: '#fff', fontWeight: '700' },

  delete: { alignSelf: 'center', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteText: { fontSize: 13, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  modalMessage: { fontSize: 15, lineHeight: 21 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
  modalBtnGhost: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhostText: { fontWeight: '700' },
  modalBtn: {
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: { color: '#fff', fontWeight: '700' },
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
