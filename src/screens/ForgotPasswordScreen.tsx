import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { ButtonStyles } from '../styles/components/ButtonStyles'; // 👈 Importamos estilos globales

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');

  const handleSendReset = () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa tu correo');
      return;
    }

    // Aquí irá la lógica real con Supabase o Firebase
    console.log('Enviar email de recuperación a:', email);
    Alert.alert(
      'Solicitud enviada',
      'Si el correo existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña.'
    );

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Flecha de retroceso */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={24} color="#00A9B9" />
      </TouchableOpacity>

      <Text style={styles.title}>Recuperar Contraseña</Text>

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

      {/* ✅ Botón global */}
      <TouchableOpacity style={[ButtonStyles.base, ButtonStyles.primary]} onPress={handleSendReset}>
        <Text style={ButtonStyles.textLight}>Enviar enlace</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    color: '#00A9B9',
    alignSelf: 'center',
    marginTop: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#333',
  },
});
