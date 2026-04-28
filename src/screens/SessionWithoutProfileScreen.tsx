import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme/ThemeProvider';

export default function SessionWithoutProfileScreen() {
  const { signOut, refreshProfile } = useAuth();
  const { colors } = useAppTheme();
  const [busy, setBusy] = useState(false);

  const onRetry = useCallback(async () => {
    setBusy(true);
    try {
      await refreshProfile();
    } finally {
      setBusy(false);
    }
  }, [refreshProfile]);

  return (
    <SafeAreaView style={[styles.wrap, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.inner}>
        <View style={[styles.iconCircle, { backgroundColor: colors.mutedBg }]}>
          <Feather name="user-x" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>No se encontró tu perfil</Text>
        <Text style={[styles.sub, { color: colors.subtext }]}>
          La app intenta crear tu perfil de cliente al iniciar sesión. Si el problema continúa, revisa las políticas RLS
          en Supabase y pulsa Reintentar.
        </Text>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, { borderColor: colors.primary }]}
          onPress={onRetry}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.btnTxtSecondary, { color: colors.primary }]}>Reintentar</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => signOut()}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnTxt, { color: colors.onPrimary }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 28, textAlign: 'center' },
  btn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    marginBottom: 12,
  },
  btnTxt: { fontWeight: '700', fontSize: 16 },
  btnTxtSecondary: { fontWeight: '700', fontSize: 16 },
});
