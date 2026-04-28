import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';
import { createAuthLayoutStyles } from '../auth/authLayoutStyles';
import AppDialog from '../components/AppDialog';

export default function VerifyCodeScreen({
  route,
  navigation,
}: {
  route: { params?: { email?: string } };
  navigation: { goBack: () => void; replace: (name: string) => void };
}) {
  const email = route?.params?.email ?? '';
  const { colors } = useAppTheme();
  const styles = createAuthLayoutStyles(colors);
  const [code, setCode] = useState('');
  const [secs, setSecs] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string; onClose?: () => void } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecs((value) => {
        if (value <= 1) {
          setCanResend(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (code.trim().length < 4) {
      setDialog({ title: 'Codigo invalido', message: 'Ingresa el codigo que te enviamos.' });
      return;
    }

    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setDialog({
        title: 'Cuenta verificada',
        message: 'Bienvenido a El Patron.',
        onClose: () => navigation.replace('Login'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setSecs(60);
    setCanResend(false);
    setDialog({ title: 'Codigo reenviado', message: `Revisa tu correo: ${email || 'tu correo'}` });
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
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, minHeight: 44 }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
              <Feather name="arrow-left" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Verificacion</Text>
            </View>
            <Text style={styles.title}>Codigo de acceso</Text>
            <Text style={styles.subtitle}>Enviamos un codigo a</Text>
            <Text style={{ marginTop: 6, fontWeight: '700', fontSize: 16, color: colors.text, textAlign: 'center' }}>
              {email || 'tu correo'}
            </Text>
          </View>

          <View style={styles.inputWrap}>
            <Feather name="key" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="Codigo de 6 digitos"
              placeholderTextColor={colors.subtext}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              editable={!submitting}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={handleVerify}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Confirmar</Text>}
          </TouchableOpacity>

          <TouchableOpacity disabled={!canResend || submitting} onPress={handleResend} style={{ marginTop: 16, alignSelf: 'center' }}>
            <Text style={[styles.linkAccent, (!canResend || submitting) && { opacity: 0.45 }]}>
              {canResend ? 'Reenviar codigo' : `Reenviar en ${secs}s`}
            </Text>
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
