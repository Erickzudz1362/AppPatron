import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeProvider';

type Notice = {
  id: string;
  type: 'promo' | 'aviso' | 'sistema';
  title: string;
  message: string;
  date: string;   // ISO yyyy-mm-dd
  read: boolean;
  link?: string;  // opcional: abrir URL
};

// Datos ficticios
const MOCK: Notice[] = [
  {
    id: 'n1',
    type: 'promo',
    title: 'Promo Fin de Semana',
    message: '10% de descuento pagando el 100% por QR. Solo este sábado y domingo.',
    date: '2025-08-20',
    read: false,
    link: 'https://wa.me/59170000000',
  },
  {
    id: 'n2',
    type: 'aviso',
    title: 'Feriado 6 de Agosto',
    message: 'La barbería cerrará por feriado cívico. Reprograma tu cita desde la app.',
    date: '2025-08-05',
    read: true,
  },
  {
    id: 'n3',
    type: 'sistema',
    title: 'Tu cita fue confirmada',
    message: 'Carlos confirmó tu cita del 28/07 a las 16:00.',
    date: '2025-07-28',
    read: false,
  },
  {
    id: 'n4',
    type: 'aviso',
    title: 'Nuevo Barbero',
    message: '¡Andrés se une al equipo! Especialista en combo y color.',
    date: '2025-07-15',
    read: true,
  },
];

const FILTERS = ['Todos', 'Promos', 'Avisos', 'Sistema'] as const;
type FilterKey = typeof FILTERS[number];

// mapa tipado de íconos y labels
const ICONS: Record<Notice['type'], keyof typeof Feather.glyphMap> = {
  promo: 'tag',
  aviso: 'volume-2',  // en lugar de megaphone
  sistema: 'bell',
};

const LABELS: Record<Notice['type'], 'Promo' | 'Aviso' | 'Sistema'> = {
  promo: 'Promo',
  aviso: 'Aviso',
  sistema: 'Sistema',
};

export default function NotificationsScreen() {
  const { width } = useWindowDimensions();
  const gutter = width < 360 ? 12 : width < 400 ? 16 : width < 768 ? 20 : 24;

  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [data, setData] = useState<Notice[]>(MOCK);
  const [filter, setFilter] = useState<FilterKey>('Todos');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'Promos':
        return data.filter(d => d.type === 'promo');
      case 'Avisos':
        return data.filter(d => d.type === 'aviso');
      case 'Sistema':
        return data.filter(d => d.type === 'sistema');
      default:
        return data;
    }
  }, [data, filter]);

  const toggleRead = (id: string) => {
    setData(prev => prev.map(n => (n.id === id ? { ...n, read: !n.read } : n)));
  };

  const openLink = (url?: string) => {
    if (!url) return;
    Linking.openURL(url);
  };

  const renderItem = ({ item }: { item: Notice }) => (
    <View style={[styles.card, !item.read && styles.unreadShadow]}>
      {/* Icono + etiqueta */}
      <View style={styles.rowBetween}>
        <View style={styles.rowLeft}>
          <View style={styles.iconWrap}>
            <Feather name={ICONS[item.type]} size={16} color={colors.primary} />
          </View>
          <View style={styles.typeChip}>
            <Text style={styles.typeTxt}>{LABELS[item.type]}</Text>
          </View>
        </View>

        <Text style={styles.date}>{item.date}</Text>
      </View>

      {/* Título */}
      <Text style={styles.title}>{item.title}</Text>

      {/* Mensaje */}
      <Text style={styles.msg}>{item.message}</Text>

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => toggleRead(item.id)} style={styles.linkBtn}>
          <Feather name={item.read ? 'check' : 'mail'} size={14} color={item.read ? colors.subtext : colors.primary} />
          <Text style={[styles.linkTxt, { color: item.read ? colors.subtext : colors.primary }]}>
            {item.read ? 'Marcar como no leído' : 'Marcar como leído'}
          </Text>
        </TouchableOpacity>

        {item.link && (
          <TouchableOpacity onPress={() => openLink(item.link)} style={styles.ctaBtn}>
            <Feather name="external-link" size={14} color="#fff" />
            <Text style={styles.ctaTxt}>Abrir</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={n => n.id}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 16, paddingBottom: 24 }}
        ListHeaderComponent={
          <>
            <Text style={styles.header}>Avisos</Text>
            {/* Filtros */}
            <FlatList
              data={FILTERS as unknown as string[]}
              keyExtractor={(i) => i}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item }) => {
                const active = filter === (item as FilterKey);
                return (
                  <TouchableOpacity
                    onPress={() => setFilter(item as FilterKey)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        }
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<Text style={styles.empty}>No hay avisos por ahora.</Text>}
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
  mutedBg: string;
}) {
  return StyleSheet.create({
    safe: { flex: 1 },

    header: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 8 },

    chip: {
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipTxt: { color: colors.text, fontWeight: '500' },
    chipTxtActive: { color: '#fff' },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
        android: { elevation: 2 },
      }),
    },
    unreadShadow: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      ...Platform.select({
        ios: { shadowOpacity: 0.12 },
        android: { elevation: 3 },
      }),
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.mutedBg, alignItems: 'center', justifyContent: 'center' },

    typeChip: { backgroundColor: '#E6FAFC10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    typeTxt: { color: colors.primary, fontWeight: '700', fontSize: 11 },

    date: { color: colors.subtext, fontSize: 12 },

    title: { marginTop: 8, fontSize: 16, fontWeight: '700', color: colors.text },
    msg: { marginTop: 4, color: colors.text, opacity: 0.9, lineHeight: 20 },

    actions: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    linkTxt: { fontWeight: '700' },

    ctaBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },

    empty: { textAlign: 'center', color: colors.subtext, marginTop: 40 },
  });
}
