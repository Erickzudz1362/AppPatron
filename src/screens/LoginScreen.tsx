import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme/ThemeProvider';
import { createAuthLayoutStyles } from '../auth/authLayoutStyles';
import AppDialog from '../components/AppDialog';
import { normalizeErrorMessage } from '../utils/errorMessages';

export default function LoginScreen({
  navigation,
}: {
  navigation: { navigate: (name: string) => void };
}) {
  const { signIn } = useAuth();
  const { colors } = useAppTheme();
  const styles = createAuthLayoutStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setDialog({
        title: 'Datos incompletos',
        message: 'Ingresa tu correo y tu contraseña para continuar.',
      });
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo iniciar sesión.';
      setDialog({
        title: 'No se pudo iniciar sesión',
        message: normalizeErrorMessage(msg),
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
          contentContainerStyle={[styles.scrollContent, { minHeight: '100%', justifyContent: 'flex-start' }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <Image
              source={require('../../assets/EL PATRON LOGO OFFICIAL.png')}
              style={{ width: 200, height: 200 }}
              resizeMode="contain"
            />
          </View>

          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Bienvenido</Text>
            </View>
            <Text style={styles.title}>Iniciar sesión</Text>
            <Text style={styles.subtitle}>
              Accede a tu cuenta para reservar y gestionar tus citas en El Patrón.
            </Text>
          </View>

          <View style={styles.inputWrap}>
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
              editable={!submitting}
            />
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
              textContentType="password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Entrar</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 18, alignSelf: 'center' }}
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={submitting}
          >
            <Text style={{ fontSize: 14, color: colors.subtext, fontWeight: '600' }}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          <View style={styles.linkRow}>
            <Text style={styles.linkMuted}>¿No tienes una cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={submitting}>
              <Text style={styles.linkAccent}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        onClose={() => setDialog(null)}
      />
    </SafeAreaView>
  );
}
