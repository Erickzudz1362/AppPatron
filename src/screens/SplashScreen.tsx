import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, StatusBar } from 'react-native';

export default function SplashScreen({ navigation }: any) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000); // 2s

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* barra de estado en claro sobre fondo turquesa */}
      <StatusBar barStyle="light-content" backgroundColor="#FFF" />
      <Animated.Image
        source={require('../../assets/EL PATRON LOGO OFFICIAL.png')}
        style={[styles.logo, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFF', // turquesa
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 350,
    height: 350,
  },
});
