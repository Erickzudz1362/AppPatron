import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import PromoCarousel from '../../components/PromoCarousel';
import { useAppTheme } from '../../theme/ThemeProvider';

const barbers = [
  { id: 'b1', name: 'Carlos', avatar: require('../../../assets/barbers/icon.png'), available: true },
  { id: 'b2', name: 'Miguel', avatar: require('../../../assets/barbers/icon.png'), available: false },
  { id: 'b3', name: 'Andrés', avatar: require('../../../assets/barbers/icon.png'), available: true },
];

export default function HomeScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const openMap = () => Linking.openURL('https://maps.app.goo.gl/Mbdp1fUKbBgX7m336');
  const openLink = (url: string) => Linking.openURL(url);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 24, padding: 16, paddingTop: 16 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hola, Patrón</Text>
          <Text style={styles.sub}>¿Qué te hacemos hoy?</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Feather name="bell" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Buscador (visual) */}
      <View style={styles.search}>
        <Feather name="search" size={18} color={colors.subtext} />
        <Text style={styles.searchText}>Buscar servicios o barbero</Text>
      </View>

      {/* Carrusel de promos */}
      <PromoCarousel />

      {/* Barberos disponibles */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Barberos disponibles</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Barbers')}>
          <Text style={styles.seeAll}>Ver todos</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {barbers.map(b => (
          <TouchableOpacity
            key={b.id}
            style={styles.barberCard}
            onPress={() => navigation.navigate('Barbers')} // futuro: BarberDetail
            activeOpacity={0.85}
          >
            <Image source={b.avatar} style={[styles.avatar, !b.available && { opacity: 0.5 }]} />
            <Text style={styles.barberName}>{b.name}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: b.available ? colors.success : colors.border },
              ]}
            >
              <Text style={{ color: b.available ? '#fff' : colors.subtext, fontSize: 11 }}>
                {b.available ? 'Disponible' : 'No disponible'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Accesos rápidos */}
      <View style={styles.quickRow}>
        {[
          { label: 'Corte', icon: 'scissors' as const },
          { label: 'Barba', icon: 'user' as const },
          { label: 'Combo', icon: 'layers' as const },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.quickItem} activeOpacity={0.85}>
            <Feather name={item.icon} size={18} color={colors.primary} />
            <Text style={styles.quickText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ubicación + Redes */}
      <View style={styles.socialCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Encuéntranos</Text>
          <TouchableOpacity onPress={openMap}>
            <Text style={styles.mapLink}>Ver en Google Maps</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.socialRow}>
          <TouchableOpacity onPress={() => openLink('https://www.instagram.com/elpatronbol?utm_source=ig_web_button_share_sheet&igsh=cmwyYTg5aXdmOTh1')}>
            <Feather name="instagram" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLink('https://facebook.com')}>
            <Feather name="facebook" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLink('https://wa.me/59165358449')}>
            <Feather name="message-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Servicios que ofrecemos */}
      <Text style={styles.sectionTitle}>Nuestros Servicios</Text>
      <View style={styles.servicesGrid}>
        {[
          { id: 1, name: 'Corte', price: '30 Bs', icon: 'scissors' as const },
          { id: 2, name: 'Barba', price: '20 Bs', icon: 'user' as const },
          { id: 3, name: 'Corte + Barba', price: '45 Bs', icon: 'layers' as const },
          { id: 4, name: 'Tintura', price: '50 Bs', icon: 'droplet' as const },
        ].map(service => (
          <View key={service.id} style={styles.serviceCard}>
            <Feather name={service.icon} size={24} color={colors.primary} />
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.servicePrice}>{service.price}</Text>
            <TouchableOpacity style={styles.serviceBtn} activeOpacity={0.85}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Reservar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* CTA reservar */}
      <TouchableOpacity style={styles.cta} activeOpacity={0.9}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Reservar ahora</Text>
      </TouchableOpacity>
    </ScrollView>
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
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    hello: { fontSize: 18, fontWeight: '700', color: colors.text },
    sub: { color: colors.subtext, marginTop: 2 },

    search: {
      height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.card,
    },
    searchText: { color: colors.subtext },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionTitle: { fontWeight: '700', color: colors.text, marginBottom: 8, fontSize: 16 },
    seeAll: { color: colors.primary, fontWeight: '600' },

    barberCard: {
      width: 110, marginRight: 12, alignItems: 'center', backgroundColor: colors.card,
      borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border,
    },
    avatar: { width: 64, height: 64, borderRadius: 64, marginBottom: 8, backgroundColor: colors.mutedBg },
    barberName: { color: colors.text, fontWeight: '600' },
    badge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },

    quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
    quickItem: { width: '32%', backgroundColor: colors.mutedBg, borderRadius: 12, paddingVertical: 14, alignItems: 'center', gap: 6 },
    quickText: { color: colors.text, fontWeight: '500' },

    socialCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
      padding: 14, marginTop: 8, marginBottom: 12,
    },
    socialRow: { flexDirection: 'row', gap: 14 },
    mapLink: { color: colors.primary, fontWeight: '600' },

    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    cardTitle: { fontWeight: '700', color: colors.text },
    cardSub: { color: colors.subtext, marginTop: 2, marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },

    servicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    serviceCard: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
      alignItems: 'center',
    },
    serviceName: { fontWeight: '600', color: colors.text, marginTop: 8 },
    servicePrice: { color: colors.subtext, marginTop: 4 },
    serviceBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },

    cta: {
      marginTop: 8, backgroundColor: colors.primary, height: 52,
      borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    },
  });
}
