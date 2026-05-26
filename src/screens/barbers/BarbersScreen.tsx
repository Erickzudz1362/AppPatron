import React, { useMemo, useState } from 'react';
import { FlatList, Image, Platform, RefreshControl, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { TabScreenHeader } from '../../components/TabScreenHeader';
import { BarbersListSkeleton } from '../../components/skeleton/BarbersListSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { fetchBarbersFull } from '../../api/supabaseData';
import type { BarberListItem } from '../../api/fallbackData';
import { useAppTheme } from '../../theme/ThemeProvider';
import { supabase } from '../../config/supabase';

const SPECIALTIES = ['Todos', 'Corte', 'Barba', 'Afeitado', 'Cejas', 'Color'];

export default function BarbersScreen({ navigation, route }: any) {
  const { width } = useWindowDimensions();
  const gutter = width < 360 ? 12 : width < 400 ? 16 : width < 768 ? 20 : 24;
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tabBarHeight = useBottomTabBarHeight();

  const { data: barbersData, error, refresh, refreshSilently, showSkeleton, isRefreshing } = useAsyncResource(fetchBarbersFull);
  const allBarbers = barbersData ?? [];

  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [selectedSpec, setSelectedSpec] = useState<string>('Todos');

  React.useEffect(() => {
    const initialSpec = typeof route?.params?.initialSpec === 'string' ? route.params.initialSpec.trim() : '';
    if (initialSpec && SPECIALTIES.includes(initialSpec)) {
      setSelectedSpec(initialSpec);
      navigation.setParams?.({ initialSpec: undefined });
    }
  }, [navigation, route?.params?.initialSpec]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshSilently();
    }, [refreshSilently])
  );

  useFocusEffect(
    React.useCallback(() => {
      const barberFromHome = route?.params?.barberFromHome;
      if (barberFromHome?.id) {
        navigation.setParams?.({ barberFromHome: undefined });
        navigation.navigate('BarberCalendar', { barber: barberFromHome });
      }
      return () => {
        setQuery('');
        setOnlyAvailable(true);
        setSelectedSpec('Todos');
      };
    }, [navigation, route?.params?.barberFromHome])
  );

  React.useEffect(() => {
    const refreshSoon = () => {
      void refreshSilently();
    };

    const barbersChannel = supabase
      .channel('barbers-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barber_reviews' }, refreshSoon)
      .subscribe();

    const intervalId = setInterval(refreshSoon, 5000);

    return () => {
      clearInterval(intervalId);
      void supabase.removeChannel(barbersChannel);
    };
  }, [refreshSilently]);

  const filtered = useMemo(() => {
    return allBarbers.filter((barber) => {
      if (onlyAvailable && !barber.isAvailable) return false;
      if (selectedSpec !== 'Todos' && !barber.specialties.includes(selectedSpec)) return false;
      if (query.trim()) {
        const normalized = query.trim().toLowerCase();
        if (!barber.name.toLowerCase().includes(normalized)) return false;
      }
      return true;
    });
  }, [allBarbers, onlyAvailable, query, selectedSpec]);

  const goToDetail = (barber: BarberListItem) => {
    navigation.navigate('BarberCalendar', { barber });
  };

  const renderBarber = ({ item }: { item: BarberListItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => goToDetail(item)} activeOpacity={0.85}>
      <Image source={item.avatar} style={[styles.avatar, !item.isAvailable && { opacity: 0.55 }]} />
      <View style={styles.infoWrap}>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{item.name}</Text>
          {item.ratingCount && item.ratingCount > 0 ? (
            <View style={styles.rating}>
              <Feather name="star" size={14} color="#f5a623" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          ) : (
            <Text style={styles.ratingEmpty}>Nuevo</Text>
          )}
        </View>

        <View style={[styles.badge, { backgroundColor: item.isAvailable ? colors.success : colors.border }]}>
          <Text style={{ color: item.isAvailable ? '#fff' : colors.subtext, fontSize: 11, fontWeight: '700' }}>
            {item.isAvailable ? 'Disponible' : 'No disponible'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (showSkeleton) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={[styles.container, { paddingHorizontal: gutter }]}>
          <BarbersListSkeleton mutedColor={colors.mutedBg} cardColor={colors.card} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !barbersData) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background, justifyContent: 'center' }]} edges={['top', 'left', 'right']}>
        <EmptyState icon="wifi-off" title="No pudimos cargar barberos" subtitle={error} onRetry={refresh} color={colors} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.container, { paddingHorizontal: gutter }]}>
        <TabScreenHeader title="Barberos" titleColor={colors.primary} />

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
            <Switch value={onlyAvailable} onValueChange={setOnlyAvailable} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
          </View>
        </View>

        <FlatList
          data={SPECIALTIES}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 6 }}
          renderItem={({ item }) => {
            const active = selectedSpec === item;
            return (
              <TouchableOpacity onPress={() => setSelectedSpec(item)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderBarber}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 20, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="users" title="Sin resultados" subtitle="Prueba otro filtro o busca por otro nombre." color={colors} />}
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
    container: { flex: 1 },
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
    infoWrap: { flex: 1, justifyContent: 'center' },
    name: { fontSize: 16, fontWeight: '700', color: colors.text },
    rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { color: colors.text, fontWeight: '600' },
    ratingEmpty: { color: colors.subtext, fontWeight: '600', fontSize: 12 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    availTxt: { fontSize: 13, color: colors.text, fontWeight: '500' },
  });
}
