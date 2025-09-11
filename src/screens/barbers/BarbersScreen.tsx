import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
  Linking,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeProvider';

type Barber = {
  id: string;
  name: string;
  avatar: any;
  phone: string;           // WhatsApp
  rating: number;          // 0..5
  isAvailable: boolean;
  specialties: string[];   // ['Corte','Barba','Color',...]
};

// Datos ficticios
const ALL_BARBERS: Barber[] = [
  {
    id: 'b1',
    name: 'Carlos R.',
    avatar: require('../../../assets/barbers/icon.png'),
    phone: '59170000001',
    rating: 4.8,
    isAvailable: true,
    specialties: ['Corte', 'Barba', 'Combo'],
  },
  {
    id: 'b2',
    name: 'Miguel A.',
    avatar: require('../../../assets/barbers/icon.png'),
    phone: '59170000002',
    rating: 4.5,
    isAvailable: false,
    specialties: ['Corte'],
  },
  {
    id: 'b3',
    name: 'Andrés V.',
    avatar: require('../../../assets/barbers/icon.png'),
    phone: '59170000003',
    rating: 4.9,
    isAvailable: true,
    specialties: ['Combo', 'Color'],
  },
];

const SPECIALTIES = ['Todos', 'Corte', 'Barba', 'Combo', 'Color'];

export default function BarbersScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const gutter = width < 360 ? 12 : width < 400 ? 16 : width < 768 ? 20 : 24;

  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [selectedSpec, setSelectedSpec] = useState<string>('Todos');

  const filtered = useMemo(() => {
    return ALL_BARBERS.filter((b) => {
      if (onlyAvailable && !b.isAvailable) return false;
      if (selectedSpec !== 'Todos' && !b.specialties.includes(selectedSpec)) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!b.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [query, onlyAvailable, selectedSpec]);

  const openWhats = (phone: string) => {
    Linking.openURL(`https://wa.me/${phone}`);
  };

  const goToDetail = (barber: Barber) => {
    navigation.navigate('BarberDetail', { barber }); // asegúrate de registrar esta ruta cuando uses el detalle
  };

  const renderBarber = ({ item }: { item: Barber }) => (
    <TouchableOpacity style={styles.card} onPress={() => goToDetail(item)} activeOpacity={0.85}>
      <Image source={item.avatar} style={[styles.avatar, !item.isAvailable && { opacity: 0.55 }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.rating}>
            <Feather name="star" size={14} color="#f5a623" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.specWrap}>
          {item.specialties.map((s) => (
            <View key={s} style={styles.specChip}>
              <Text style={styles.specText}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rowBetween}>
          <View
            style={[
              styles.badge,
              { backgroundColor: item.isAvailable ? colors.success : colors.border },
            ]}
          >
            <Text
              style={{ color: item.isAvailable ? '#fff' : colors.subtext, fontSize: 11 }}
            >
              {item.isAvailable ? 'Disponible' : 'No disponible'}
            </Text>
          </View>
          <TouchableOpacity style={styles.waBtn} onPress={() => openWhats(item.phone)}>
            <Feather name="message-circle" size={16} color="#fff" />
            <Text style={styles.waTxt}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingHorizontal: gutter }]}>
        <Text style={styles.title}>Barberos</Text>

        {/* Buscador + Toggle */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={colors.subtext} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre"
              placeholderTextColor={colors.subtext}
              value={query}
              onChangeText={setQuery}
            />
          </View>
          <View style={styles.availRow}>
            <Text style={styles.availTxt}>Solo disponibles</Text>
            <Switch
              value={onlyAvailable}
              onValueChange={setOnlyAvailable}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Chips de especialidad */}
        <FlatList
          data={SPECIALTIES}
          keyExtractor={(s) => s}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 6 }}
          renderItem={({ item }) => {
            const active = selectedSpec === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedSpec(item)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* Lista de barberos */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderBarber}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No se encontraron barberos con esos filtros.</Text>
          }
        />
      </View>
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
  success: string;
}) {
  return StyleSheet.create({
    safe: { flex: 1 },
    container: { flex: 1, paddingTop: 8 },
    title: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 12 },

    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    searchBox: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
    },
    searchInput: { flex: 1, color: colors.text },
    availRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

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
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
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
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 64,
      marginRight: 12,
      backgroundColor: colors.mutedBg,
    },
    name: { fontSize: 16, fontWeight: '700', color: colors.text },
    rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { color: colors.text, fontWeight: '600' },

    specWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 8 },
    specChip: {
      backgroundColor: colors.mutedBg,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    specText: { color: colors.text, fontSize: 11 },

    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },

    waBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    waTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },

    empty: { textAlign: 'center', color: colors.subtext, marginTop: 40 },
    availTxt: { fontSize: 13, color: colors.text, fontWeight: '500' },
  });
}
