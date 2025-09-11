import React, { useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';

// Datos ficticios de historial
const historyData = [
  { id: '1', service: 'Corte de Cabello', barber: 'Carlos', date: '2025-08-10', price: '30 Bs' },
  { id: '2', service: 'Corte + Barba', barber: 'Miguel', date: '2025-07-28', price: '45 Bs' },
  { id: '3', service: 'Arreglo de Barba', barber: 'Andrés', date: '2025-06-15', price: '20 Bs' },
];

export default function HistoryScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Gutter/margen lateral responsivo
  const gutter = width < 360 ? 12 : width < 400 ? 16 : width < 768 ? 20 : 24;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={historyData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        ListHeaderComponent={
          <Text style={[styles.title, { marginBottom: 16 }]}>
            Historial de Servicios
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.service}>{item.service}</Text>
              <Text style={styles.detail}>Barbero: {item.barber}</Text>
              <Text style={styles.detail}>Fecha: {item.date}</Text>
            </View>
            <Text style={styles.price}>{item.price}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No tienes servicios realizados aún.</Text>
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: {
  primary: string;
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
}) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
        },
        android: { elevation: 2 },
      }),
    },
    service: { fontSize: 16, fontWeight: '600', color: colors.text },
    detail: { fontSize: 13, color: colors.subtext, marginTop: 2 },
    price: { fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: 12 },
    empty: { textAlign: 'center', color: colors.subtext, marginTop: 40 },
  });
}
