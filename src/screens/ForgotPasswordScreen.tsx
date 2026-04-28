import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { getAuthPasswordResetRedirectUrl } from '../config/authRedirect';
import { useAppTheme } from '../theme/ThemeProvider';
import { createAuthLayoutStyles } from '../auth/authLayoutStyles';
import AppDialog from '../components/AppDialog';
import { normalizeErrorMessage } from '../utils/errorMessages';

export default function ForgotPasswordScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { colors } = useAppTheme();
  const styles = createAuthLayoutStyles(colors);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const handleSendReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setDialog({ title: 'Correo requerido', message: 'Ingresa el correo con el que te registraste.' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setDialog({ title: 'Correo inválido', message: 'Revisa el formato del correo electrónico.' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: getAuthPasswordResetRedirectUrl(),
      });
      if (error) throw error;
      setSent(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo enviar el correo.';
      setDialog({ title: 'No se pudo enviar', message: normalizeErrorMessage(msg) });
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
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
              <Feather name="arrow-left" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Seguridad</Text>
            </View>
            <Text style={styles.title}>Recuperar contraseña</Text>
            <Text style={styles.subtitle}>
              Te enviaremos un enlace seguro para crear una nueva contraseña. Revisa también la carpeta de spam.
            </Text>
          </View>

          {!sent ? (
            <>
              <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
                <Feather name="mail" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  placeholder="Correo electrónico"
                  placeholderTextColor={colors.subtext}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  editable={!submitting}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                onPress={handleSendReset}
                disabled={submitting}
                activeOpacity={0.88}
              >
                {submitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Enviar enlace</Text>}
              </TouchableOpacity>

              <Text style={styles.footerNote}>
                Si el correo está registrado en El Patrón, recibirás el mensaje en unos minutos.
              </Text>
            </>
          ) : (
            <View style={styles.successCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Feather name="check-circle" size={22} color={colors.success} style={{ marginRight: 8 }} />
                <Text style={styles.successTitle}>Revisa tu bandeja</Text>
              </View>
              <Text style={styles.successText}>
                Si existe una cuenta para {email.trim()}, te enviaremos un correo con instrucciones para restablecer la contraseña.
              </Text>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.goBack()} activeOpacity={0.88}>
                <Text style={styles.outlineBtnText}>Volver al inicio</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AppDialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} onClose={() => setDialog(null)} />
    </SafeAreaView>
  );
}
