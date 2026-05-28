import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LIGHT_COLORS } from '../theme/palette';

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.35)).current;
  const dot2 = useRef(new Animated.Value(0.35)).current;
  const dot3 = useRef(new Animated.Value(0.35)).current;
  const dotsLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 180,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const makeDotPulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.35,
            duration: 280,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(420),
        ])
      );

    dotsLoopRef.current = Animated.parallel([makeDotPulse(dot1, 0), makeDotPulse(dot2, 140), makeDotPulse(dot3, 280)]);
    dotsLoopRef.current.start();

    return () => {
      dotsLoopRef.current?.stop();
    };
  }, [dot1, dot2, dot3, opacity, scale, textOpacity, translateY]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={LIGHT_COLORS.background} />
      <Animated.Image
        source={require('../../assets/EL PATRON LOGO OFFICIAL.png')}
        style={[styles.logo, { opacity, transform: [{ translateY }, { scale }] }]}
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
    width: 260,
    height: 260,
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
