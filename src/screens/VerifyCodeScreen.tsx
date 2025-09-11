import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ButtonStyles } from '../styles/components/ButtonStyles';
import Feather from 'react-native-vector-icons/Feather';

export default function VerifyCodeScreen({ route, navigation }: any) {
  const email = route?.params?.email ?? '';
  const [code, setCode] = useState('');
  const [secs, setSecs] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) { setCanResend(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleVerify = async () => {
    if (code.trim().length < 4) {
      Alert.alert('Código inválido', 'Ingresa el código que te enviamos.');
      return;
    }
    // TODO: Verificar código en backend (Supabase/Firebase).
    // Si es OK:
    Alert.alert('Cuenta verificada', '¡Bienvenido!');
    navigation.replace('Main');
  };

  const handleResend = async () => {
    if (!canResend) return;
    // TODO: reenviar código
    setSecs(60);
    setCanResend(false);
    Alert.alert('Nuevo código enviado', `Revisá tu correo: ${email}`);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={24} color="#00A9B9" />
      </TouchableOpacity>

      <Text style={styles.title}>Verificar código</Text>
      <Text style={styles.subtitle}>Enviamos un código a</Text>
      <Text style={styles.email}>{email}</Text>

      <TextInput
        style={styles.codeInput}
        placeholder="Ingresa tu código"
        placeholderTextColor="#999"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />

      <TouchableOpacity style={[ButtonStyles.base, ButtonStyles.primary]} onPress={handleVerify}>
        <Text style={ButtonStyles.textLight}>Confirmar</Text>
      </TouchableOpacity>

      <TouchableOpacity disabled={!canResend} onPress={handleResend}>
        <Text style={[styles.resend, !canResend && { opacity: 0.4 }]}>
          {canResend ? 'Reenviar código' : `Reenviar en ${secs}s`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 32, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 40, left: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#00A9B9', alignSelf: 'center' },
  subtitle: { marginTop: 12, color: '#555', alignSelf: 'center' },
  email: { marginTop: 4, fontWeight: '600', color: '#111', alignSelf: 'center', marginBottom: 20 },
  codeInput: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 12,
    height: 48, paddingHorizontal: 16, backgroundColor: '#fafafa', color: '#333',
    textAlign: 'center', letterSpacing: 6, fontSize: 20, marginBottom: 16,
  },
  resend: { marginTop: 12, color: '#00A9B9', alignSelf: 'center', fontWeight: '600' },
});
