import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';

const CONFIRM_TEXT = 'CONFIRMAR';

export default function DeleteAccountScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { colors, isDark } = useAppTheme();
  const { signOut } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canDelete = useMemo(() => confirmation.trim() === CONFIRM_TEXT, [confirmation]);

  const handleDelete = async () => {
    if (!canDelete || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;

      try {
        await signOut();
      } catch {
        // Si auth user ya fue eliminado, igual limpiamos navegación volviendo atrás.
      }

      Alert.alert('Cuenta eliminada', 'Tu cuenta y datos asociados se eliminaron correctamente.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar la cuenta.';
      Alert.alert(
        'Error al eliminar cuenta',
        `${msg}\n\nVerifica que ejecutaste el SQL de la función delete_my_account en Supabase.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>Eliminar cuenta</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.warningCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="alert-triangle" size={22} color={isDark ? '#ff8a80' : '#b00020'} />
          <Text style={[styles.warningTitle, { color: colors.text }]}>Esta acción es permanente</Text>
          <Text style={[styles.warningText, { color: colors.subtext }]}>
            Al confirmar, se eliminará tu cuenta y los datos asociados en el sistema. Esta operación no se puede
            deshacer.
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.subtext }]}>
          Escribe <Text style={{ color: colors.text, fontWeight: '700' }}>{CONFIRM_TEXT}</Text> para continuar
        </Text>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={CONFIRM_TEXT}
          placeholderTextColor={colors.subtext}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        />

        <TouchableOpacity
          disabled={!canDelete || submitting}
          onPress={handleDelete}
          activeOpacity={0.88}
          style={[
            styles.deleteBtn,
            { backgroundColor: canDelete ? (isDark ? '#ff5a67' : '#b00020') : colors.border },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="trash-2" size={18} color="#fff" />
              <Text style={styles.deleteBtnText}>Eliminar cuenta definitivamente</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backBtn: { padding: 8 },
  topTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  warningCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginBottom: 18,
  },
  warningTitle: { fontSize: 16, fontWeight: '700' },
  warningText: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  deleteBtn: {
    marginTop: 20,
    borderRadius: 12,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
