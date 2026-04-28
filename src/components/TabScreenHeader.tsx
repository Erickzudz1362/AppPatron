import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  title: string;
  titleColor: string;
};

/**
 * Título consistente en pantallas con bottom tabs (alineación y tamaño iguales en Android/iOS).
 */
export function TabScreenHeader({ title, titleColor }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingTop: 2,
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
});
