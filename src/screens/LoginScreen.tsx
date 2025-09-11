import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { ButtonStyles } from '../styles/components/ButtonStyles'; // 👈 importamos botón global

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    console.log('Login:', email, password);
    // Aquí irá la lógica real (Supabase / Firebase)
     navigation.replace('Main');
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register'); // 👈 Aquí redirige a tu pantalla de registro
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image
        source={require('../../assets/EL PATRON LOGO OFFICIAL.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Iniciar Sesión</Text>

      <View style={styles.inputContainer}>
        <Icon name="user" size={18} color="#00A9B9" style={styles.icon} />
        <TextInput
          placeholder="Correo Electrónico"
          placeholderTextColor="#999"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="lock" size={18} color="#00A9B9" style={styles.icon} />
        <TextInput
          placeholder="Contraseña"
          placeholderTextColor="#999"
          style={styles.input}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Icon name={showPassword ? 'eye' : 'eye-off'} size={18} color="#666" />
        </TouchableOpacity>
      </View>

      {/* ✅ Botón global */}
      <TouchableOpacity style={[ButtonStyles.base, ButtonStyles.primary]} onPress={handleLogin}>
        <Text style={ButtonStyles.textLight}>Entrar</Text>
      </TouchableOpacity>

      {/* Enlaces */}
      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.link}>¿Olvidó su contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRegister}>
        <Text style={styles.register}>Registrarse</Text>
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
    alignItems: 'center',
  },
  logo: {
    width: 230,
    height: 230,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00A9B9',
    marginBottom: 24,
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
  link: {
    marginTop: 16,
    color: '#555',
    fontSize: 14,
  },
  register: {
    marginTop: 8,
    color: '#00A9B9',
    fontSize: 15,
    fontWeight: '600',
  },
});
