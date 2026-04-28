import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  backgroundColor?: string;
  style?: object;
};

/**
 * Contenedor con márgenes seguros (notch, barra de estado, home indicator) en Android e iOS.
 */
export default function SafeAreaContainer({ children, backgroundColor = '#fff', style }: Props) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={['top', 'right', 'left', 'bottom']}>
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 20 },
});
