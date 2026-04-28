import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, ViewStyle } from 'react-native';

type Props = {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  /** Color base (usar colors.mutedBg del tema) */
  color: string;
  style?: ViewStyle;
};

/** Rectángulo con pulso suave (esqueleto tipo “skeleton”). */
export function Skeleton({ width, height, borderRadius = 8, color, style }: Props) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width,
          height,
          borderRadius,
          backgroundColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: { overflow: 'hidden' },
});
