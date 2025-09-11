import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { ButtonStyles } from '../styles/components/ButtonStyles';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const handleRegister = async () => {
    // Validaciones básicas
    if (!name || !phone || !email || !pass || !pass2) {
      Alert.alert('Campos incompletos', 'Completa todos los campos.');
      return;
    }
    const emailOk = /\S+@\S+\.\S+/.test(email);
    if (!emailOk) {
      Alert.alert('Correo inválido', 'Ingresa un correo válido.');
      return;
    }
    if (pass.length < 6) {
      Alert.alert('Contraseña débil', 'Mínimo 6 caracteres.');
      return;
    }
    if (pass !== pass2) {
      Alert.alert('Contraseñas no coinciden', 'Repite la misma contraseña.');
      return;
    }

    // TODO: crear usuario en Supabase/Firebase y enviar código al email
    // Ejemplo: await supabase.auth.signUp({ email, password: pass, options:{emailRedirectTo:'...'}})

    // Navegar a Verificar Código pasando el email
    navigation.replace('VerifyCode', { email });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={24} color="#00A9B9" />
      </TouchableOpacity>

      <Text style={styles.title}>Crear cuenta</Text>

      <View style={styles.inputContainer}>
        <Feather name="user" size={18} color="#00A9B9" style={styles.icon} />
        <TextInput
          placeholder="Nombre completo"
          placeholderTextColor="#999"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputContainer}>
        <Feather name="phone" size={18} color="#00A9B9" style={styles.icon} />
        <TextInput
          placeholder="WhatsApp / Teléfono"
          placeholderTextColor="#999"
          style={styles.input}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </View>

      <View style={styles.inputContainer}>
        <Feather name="mail" size={18} color="#00A9B9" style={styles.icon} />
        <TextInput
          placeholder="Correo electrónico"
          placeholderTextColor="#999"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.inputContainer}>
        <Feather name="lock" size={18} color="#00A9B9" style={styles.icon} />
        <TextInput
          placeholder="Contraseña"
          placeholderTextColor="#999"
          style={styles.input}
          secureTextEntry={!showPass}
          value={pass}
          onChangeText={setPass}
        />
        <TouchableOpacity onPress={() => setShowPass(!showPass)}>
          <Feather name={showPass ? 'eye' : 'eye-off'} size={18} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Feather name="lock" size={18} color="#00A9B9" style={styles.icon} />
        <TextInput
          placeholder="Confirmar contraseña"
          placeholderTextColor="#999"
          style={styles.input}
          secureTextEntry={!showPass2}
          value={pass2}
          onChangeText={setPass2}
        />
        <TouchableOpacity onPress={() => setShowPass2(!showPass2)}>
          <Feather name={showPass2 ? 'eye' : 'eye-off'} size={18} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[ButtonStyles.base, ButtonStyles.primary]} onPress={handleRegister}>
        <Text style={ButtonStyles.textLight}>Registrarme</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 32, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#00A9B9', alignSelf: 'center', marginBottom: 24, marginTop: 40 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    borderColor: '#ccc', borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, marginBottom: 16, backgroundColor: '#fafafa',
  },
  icon: { marginRight: 8 },
  input: { flex: 1, height: 48, color: '#333' },
});
