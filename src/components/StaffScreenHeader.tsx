import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = {
  title: string;
  navigation: { canGoBack: () => boolean; goBack: () => void };
  /** Si es false, no muestra flecha (p. ej. raíz del panel). */
  showBack?: boolean;
};

export function StaffScreenHeader({ title, navigation, showBack = true }: Props) {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const canBack = showBack && navigation.canGoBack();

  return (
    <View style={styles.row}>
      {canBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <TouchableOpacity onPress={toggleTheme} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cambiar tema">
        <Feather name={isDark ? 'sun' : 'moon'} size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: { text: string }) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 8,
    },
    title: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    placeholder: { width: 22, height: 22 },
  });
}
