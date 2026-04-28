import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, StatusBar, Easing, Text } from 'react-native';
import { LIGHT_COLORS } from '../theme/palette';

/** Pantalla de arranque mientras se restaura sesión y se carga `profiles`. */
export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const dotsLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entrance.start(({ finished }) => {
      if (!finished) return;
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();

      // Pulso muy suave en el logo (respiración)
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.04,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
    });

    // Puntos "Cargando" con brillo escalonado
    const makeDotPulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(800 - delay),
        ])
      );

    dotsLoopRef.current = Animated.parallel([
      makeDotPulse(dot1, 0),
      makeDotPulse(dot2, 200),
      makeDotPulse(dot3, 400),
    ]);
    setTimeout(() => dotsLoopRef.current?.start(), 400);

    return () => {
      pulseLoopRef.current?.stop();
      dotsLoopRef.current?.stop();
    };
  }, [opacity, scale, translateY, textOpacity, dot1, dot2, dot3]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={LIGHT_COLORS.background} />
      <Animated.Image
        source={require('../../assets/EL PATRON LOGO OFFICIAL.png')}
        style={[
          styles.logo,
          {
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
        resizeMode="contain"
      />
      <Animated.View style={[styles.footer, { opacity: textOpacity }]}>
        <Text style={styles.loadingLabel}>Cargando</Text>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { opacity: dot3 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 280,
    height: 280,
  },
  footer: {
    position: 'absolute',
    bottom: 72,
    alignItems: 'center',
  },
  loadingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: LIGHT_COLORS.subtext,
    letterSpacing: 0.3,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: LIGHT_COLORS.primary,
  },
});
