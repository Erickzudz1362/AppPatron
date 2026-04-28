import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { createAuthLayoutStyles } from '../auth/authLayoutStyles';
import AppDialog from '../components/AppDialog';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme/ThemeProvider';
import { normalizeErrorMessage } from '../utils/errorMessages';

function isStrongPassword(value: string): { ok: boolean; message?: string } {
  if (value.length < 8) {
    return { ok: false, message: 'Usa al menos 8 caracteres.' };
  }
  if (!/[A-ZÁÉÍÓÚÑ]/.test(value)) {
    return { ok: false, message: 'Incluye al menos una letra mayúscula.' };
  }
  return { ok: true };
}

export default function ResetPasswordScreen() {
  const { colors } = useAppTheme();
  const styles = createAuthLayoutStyles(colors);
  const { finishPasswordRecovery, cancelPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string; onClose?: () => void } | null>(null);

  const content = useMemo(
    () => ({
      title: 'Nueva contraseña',
      subtitle: 'Crea una nueva contraseña para entrar a tu cuenta. Debe tener al menos 8 caracteres y una letra mayúscula.',
    }),
    []
  );

  const handleSubmit = async () => {
    const validation = isStrongPassword(password);
    if (!validation.ok) {
      setDialog({ title: 'Contraseña inválida', message: validation.message ?? 'Revisa tu contraseña.' });
      return;
    }
    if (password !== confirmPassword) {
      setDialog({ title: 'Contraseñas distintas', message: 'Las contraseñas no coinciden.' });
      return;
    }

    setSubmitting(true);
    try {
      await finishPasswordRecovery(password);
      setDialog({
        title: 'Contraseña actualizada',
        message: 'Tu contraseña se cambió correctamente.',
        onClose: () => cancelPasswordRecovery(),
      });
    } catch (error) {
      setDialog({
        title: 'No se pudo actualizar',
        message: normalizeErrorMessage(error instanceof Error ? error.message : 'Error al cambiar la contraseña.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'left']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 24}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { minHeight: '100%' }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={cancelPasswordRecovery} accessibilityLabel="Cancelar">
              <Feather name="arrow-left" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Seguridad</Text>
            </View>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
          </View>

          <View style={styles.inputWrap}>
            <Feather name="lock" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor={colors.subtext}
              style={styles.input}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
              textContentType="newPassword"
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrap}>
            <Feather name="lock" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Repetir contraseña"
              placeholderTextColor={colors.subtext}
              style={styles.input}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!submitting}
              textContentType="password"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
              <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Guardar contraseña</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        onClose={() => {
          const onClose = dialog?.onClose;
          setDialog(null);
          onClose?.();
        }}
      />
    </SafeAreaView>
  );
}
