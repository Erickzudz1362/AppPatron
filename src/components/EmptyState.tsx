import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Props = {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  /** Botón reintentar (p. ej. tras error de red) */
  onRetry?: () => void;
  retryLabel?: string;
  color: { subtext: string; text: string; primary: string };
};

export function EmptyState({
  icon = 'inbox',
  title,
  subtitle,
  onRetry,
  retryLabel = 'Reintentar',
  color,
}: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Feather name={icon} size={40} color={color.subtext} />
      <Text style={[styles.title, { color: color.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sub, { color: color.subtext }]}>{subtitle}</Text> : null}
      {onRetry ? (
        <TouchableOpacity style={[styles.btn, { borderColor: color.primary }]} onPress={onRetry} activeOpacity={0.85}>
          <Feather name="refresh-cw" size={16} color={color.primary} />
          <Text style={[styles.btnTxt, { color: color.primary }]}>{retryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  title: { fontSize: 17, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  sub: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  btn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnTxt: { fontWeight: '700', fontSize: 15 },
});
