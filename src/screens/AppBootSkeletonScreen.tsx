import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeSkeleton } from '../components/skeleton/HomeSkeleton';
import { useAppTheme } from '../theme/ThemeProvider';

/**
 * Esqueleto gris mientras llega el perfil (sin red, lento, etc.).
 * No es el splash animado; no incluye barra de tabs hasta saber el rol.
 */
export default function AppBootSkeletonScreen() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <HomeSkeleton mutedColor={colors.mutedBg} cardColor={colors.card} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingTop: 8, paddingBottom: 32 },
});
