import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { HELP_CONTENT, PRIVACY_POLICY, TERMS_AND_CONDITIONS } from '../../constants/legalContent';
import { useAppTheme } from '../../theme/ThemeProvider';

export type LegalDocType = 'terms' | 'privacy' | 'help';

type Props = {
  navigation: { goBack: () => void };
  route: { params: { document: LegalDocType } };
};

export default function LegalDocumentScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const doc = route.params?.document ?? 'terms';

  const { title, body } = useMemo(() => {
    switch (doc) {
      case 'privacy':
        return { title: 'Política de Privacidad', body: PRIVACY_POLICY };
      case 'help':
        return { title: 'Ayuda', body: HELP_CONTENT };
      default:
        return { title: 'Términos y Condiciones', body: TERMS_AND_CONDITIONS };
    }
  }, [doc]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
      >
        <Text style={[styles.body, { color: colors.text }]}>{body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backBtn: { padding: 8 },
  topTitle: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  body: { fontSize: 14, lineHeight: 22 },
});
