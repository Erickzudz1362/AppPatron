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
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme/ThemeProvider';
import { createAuthLayoutStyles } from '../auth/authLayoutStyles';
import AppDialog from '../components/AppDialog';
import { normalizeErrorMessage } from '../utils/errorMessages';

export default function RegisterScreen({
  navigation,
}: {
  navigation: { goBack: () => void; replace: (name: string) => void };
}) {
  const { signUp } = useAuth();
  const { colors } = useAppTheme();
  const styles = createAuthLayoutStyles(colors);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string; onClose?: () => void } | null>(null);

  const buildFullName = (n: string, a: string) =>
    [n.trim(), a.trim()]
      .filter((part) => part.length > 0)
      .join(' ')
      .trim();

  const handleRegister = async () => {
    if (!nombres.trim() || !apellidos.trim() || !phone.trim() || !email.trim() || !emailConfirm.trim() || !pass || !pass2) {
      setDialog({
        title: 'Campos incompletos',
        message: 'Completa nombres, apellidos, teléfono, correo, confirmación de correo y contraseña.',
      });
      return;
    }

    const emailTrim = email.trim();
    const emailConfirmTrim = emailConfirm.trim();

    if (!/\S+@\S+\.\S+/.test(emailTrim)) {
      setDialog({ title: 'Correo inválido', message: 'Ingresa un correo electrónico válido.' });
      return;
    }
    if (emailTrim.toLowerCase() !== emailConfirmTrim.toLowerCase()) {
      setDialog({ title: 'Correos distintos', message: 'El correo y su confirmación deben ser iguales.' });
      return;
    }
    if (pass.length < 8) {
      setDialog({ title: 'Contraseña inválida', message: 'Usa al menos 8 caracteres.' });
      return;
    }
    if (!/[A-ZÁÉÍÓÚÑ]/.test(pass)) {
      setDialog({ title: 'Contraseña inválida', message: 'Incluye al menos una letra mayúscula.' });
      return;
    }
    if (pass !== pass2) {
      setDialog({ title: 'Contraseñas distintas', message: 'Las contraseñas no coinciden.' });
      return;
    }

    setSubmitting(true);
    try {
      const fullName = buildFullName(nombres, apellidos);
      await signUp(emailTrim, pass, { name: fullName, phone: phone.trim() });
      setDialog({
        title: 'Cuenta creada',
        message: 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.',
        onClose: () => navigation.replace('Login'),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo completar el registro.';
      setDialog({ title: 'No se pudo crear la cuenta', message: normalizeErrorMessage(msg) });
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
              <Text style={styles.badgeText}>Nueva cuenta</Text>
            </View>
            <Text style={styles.title}>Crear cuenta</Text>
          </View>

          <View style={styles.inputWrap}>
            <Feather name="user" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput placeholder="Nombres" placeholderTextColor={colors.subtext} style={styles.input} value={nombres} onChangeText={setNombres} autoCapitalize="words" editable={!submitting} />
          </View>

          <View style={styles.inputWrap}>
            <Feather name="users" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput placeholder="Apellidos" placeholderTextColor={colors.subtext} style={styles.input} value={apellidos} onChangeText={setApellidos} autoCapitalize="words" editable={!submitting} />
          </View>

          <View style={styles.inputWrap}>
            <Feather name="phone" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput placeholder="WhatsApp o teléfono" placeholderTextColor={colors.subtext} style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} editable={!submitting} />
          </View>

          <View style={styles.inputWrap}>
            <Feather name="mail" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput placeholder="Correo electrónico" placeholderTextColor={colors.subtext} style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} editable={!submitting} />
          </View>

          <View style={styles.inputWrap}>
            <Feather name="check-circle" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput placeholder="Confirmar correo electrónico" placeholderTextColor={colors.subtext} style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={emailConfirm} onChangeText={setEmailConfirm} editable={!submitting} />
          </View>

          <View style={styles.inputWrap}>
            <Feather name="lock" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput placeholder="Contraseña" placeholderTextColor={colors.subtext} style={styles.input} secureTextEntry={!showPass} value={pass} onChangeText={setPass} editable={!submitting} textContentType="newPassword" />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name={showPass ? 'eye' : 'eye-off'} size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrap}>
            <Feather name="lock" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput placeholder="Confirmar contraseña" placeholderTextColor={colors.subtext} style={styles.input} secureTextEntry={!showPass2} value={pass2} onChangeText={setPass2} editable={!submitting} textContentType="password" />
            <TouchableOpacity onPress={() => setShowPass2(!showPass2)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name={showPass2 ? 'eye' : 'eye-off'} size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Crear mi cuenta</Text>}
          </TouchableOpacity>

          <View style={styles.linkRow}>
            <Text style={styles.linkMuted}>¿Ya tienes una cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')} disabled={submitting}>
              <Text style={styles.linkAccent}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
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
