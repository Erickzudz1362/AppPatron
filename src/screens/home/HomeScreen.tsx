import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  RefreshControl,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import PromoCarousel from '../../components/PromoCarousel';
import { HomeSkeleton } from '../../components/skeleton/HomeSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { fetchHomeBundle } from '../../api/supabaseData';
import { DEFAULT_BARBER_AVATAR } from '../../api/fallbackData';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const MODAL_IMAGE_SIZE = Math.min(width - 24, 420);
const SECOND_CAROUSEL_BUCKET =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_HOME_CAROUSEL_BUCKET?.trim()) ||
  'home-carousel';
const SECOND_CAROUSEL_FOLDER = 'PromoCarousel';
const HOME_GALLERY = [
  require('../../../assets/avatars/avatar-01.png'),
  require('../../../assets/avatars/avatar-02.png'),
  require('../../../assets/avatars/avatar-03.png'),
  require('../../../assets/avatars/avatar-04.png'),
];

export default function HomeScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const { profile } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tabBarHeight = useBottomTabBarHeight();
  const { data, error, refresh, refreshSilently, showSkeleton, isRefreshing } = useAsyncResource(fetchHomeBundle);

  const barbers = data?.barbers ?? [];
  const services = data?.services ?? [];
  const galleryUrls = data?.galleryUrls ?? [];
  const galleryVisibleCount = data?.galleryVisibleCount ?? 4;
  const storyText =
    data?.story ??
    'EL PATRON BARBERIA\nSince 2022\nDedicado a los hombres que huyen de los estereotipos, alejados de los roles de masculinidad que tan poco se llevan en esta epoca, El Patron es un concept store ubicado en el corazon de Bolivia que auna en un solo espacio barberia y tienda de moda y complementos. La idea es que el cliente se sienta como en casa, por eso el local esta decorado como si fuera un apartamento de soltero, donde se mezcla con otros espacios como (Futbol TV, Buena Musica, Barra Bar, Videojuegos, PlayStation). Entre los servicios de barberia, mejor con cita previa, la carta ofrece corte de pelo premium + lavado y peinado, hasta afeitado clasico a navaja, sin olvidar los packs, como el corte de pelo y arreglo de barba premium, entre otros servicios mas.';
  const testimonialText =
    data?.testimonial ?? 'Atención profesional, puntual y con excelente ambiente.';
  const showSecondCarousel = data?.showSecondCarousel !== false;

  const gallerySources: ImageSourcePropType[] = useMemo(
    () =>
      galleryUrls.length
        ? galleryUrls.slice(0, galleryVisibleCount).map((url) => ({ uri: url }))
        : HOME_GALLERY.slice(0, galleryVisibleCount),
    [galleryUrls, galleryVisibleCount]
  );

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState(0);
  const [galleryFailed, setGalleryFailed] = useState<boolean[]>([false, false, false, false]);
  const [secondCarouselUrls, setSecondCarouselUrls] = useState<string[]>([]);

  const loadSecondCarousel = useMemo(
    () => async () => {
      const { data: files, error: listError } = await supabase.storage
        .from(SECOND_CAROUSEL_BUCKET)
        .list(SECOND_CAROUSEL_FOLDER, {
          limit: 12,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (listError) return;

      const urls = (files ?? [])
        .filter((file) => !!file.name && !file.name.endsWith('/'))
        .map((file) => {
          const { data: publicUrl } = supabase.storage
            .from(SECOND_CAROUSEL_BUCKET)
            .getPublicUrl(`${SECOND_CAROUSEL_FOLDER}/${file.name}`);
          return publicUrl.publicUrl;
        })
        .filter(Boolean);

      setSecondCarouselUrls(urls);
    },
    []
  );

  const firstName = useMemo(() => {
    const raw = profile?.name?.trim();
    if (!raw) return '';
    return raw.split(/\s+/)[0] ?? '';
  }, [profile?.name]);

  const getEstimatedTime = (serviceName: string) => {
    const lower = serviceName.toLowerCase();
    if (lower.includes('barba')) return '20-30 min';
    if (lower.includes('color') || lower.includes('tint')) return '50-70 min';
    if (lower.includes('ceja')) return '15-20 min';
    return '30-40 min';
  };

  const openMap = () => Linking.openURL('https://maps.app.goo.gl/Mbdp1fUKbBgX7m336');
  const openLink = (url: string) => Linking.openURL(url);

  useEffect(() => {
    void loadSecondCarousel();
  }, [loadSecondCarousel]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshSilently();
      void loadSecondCarousel();
    }, [loadSecondCarousel, refreshSilently])
  );

  useEffect(() => {
    const refreshSoon = () => {
      void refreshSilently();
      void loadSecondCarousel();
    };

    const homeChannel = supabase
      .channel('home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, refreshSoon)
      .subscribe();

    const intervalId = setInterval(refreshSoon, 5000);

    return () => {
      clearInterval(intervalId);
      void supabase.removeChannel(homeChannel);
    };
  }, [loadSecondCarousel, refreshSilently]);

  const secondCarouselSources: ImageSourcePropType[] = useMemo(
    () => secondCarouselUrls.map((url) => ({ uri: url })),
    [secondCarouselUrls]
  );

  if (showSkeleton) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: tabBarHeight + 16 }}>
          <HomeSkeleton mutedColor={colors.mutedBg} cardColor={colors.card} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}
        edges={['top', 'left', 'right']}
      >
        <EmptyState
          icon="wifi-off"
          title="Sin conexión o error al cargar"
          subtitle={error}
          onRetry={refresh}
          color={colors}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24, padding: 16, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Hola{firstName ? `, ${firstName}` : ''}</Text>
            <Text style={styles.sub}>¿Qué te hacemos hoy?</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <Feather name="bell" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <PromoCarousel />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Barberos disponibles</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Barbers', { screen: 'BarbersList' })}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {barbers.map((barber) => (
            <TouchableOpacity
              key={barber.id}
              style={styles.barberCard}
              onPress={() =>
                navigation.navigate('Barbers', {
                  screen: 'BarbersList',
                  params: {
                    barberFromHome: {
                      id: barber.id,
                      name: barber.name,
                      specialties: ['Corte', 'Barba', 'Afeitado'],
                    },
                  },
                })
              }
              activeOpacity={0.85}
            >
              <Image
                source={barber.avatarUrl ? { uri: barber.avatarUrl } : DEFAULT_BARBER_AVATAR}
                style={[styles.avatar, !barber.available && { opacity: 0.5 }]}
              />
              <Text style={styles.barberName}>{barber.name}</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: barber.available ? colors.success : colors.border },
                ]}
              >
                <Text style={{ color: barber.available ? '#fff' : colors.subtext, fontSize: 11 }}>
                  {barber.available ? 'Disponible' : 'No disponible'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.quickRow}>
          {[
            { label: 'Corte', icon: 'scissors' as const, spec: 'Corte' },
            { label: 'Barba', icon: 'user' as const, spec: 'Barba' },
            { label: 'Afeitado', icon: 'droplet' as const, spec: 'Afeitado' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickItem}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('Barbers', {
                  screen: 'BarbersList',
                  params: { initialSpec: item.spec },
                })
              }
            >
              <Feather name={item.icon} size={18} color={colors.primary} />
              <Text style={styles.quickText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showSecondCarousel && secondCarouselSources.length ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Promociones de la semana</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.secondCarousel}>
              {secondCarouselSources.map((source, index) => (
                <View key={`promo-slide-${index}`} style={styles.promoCard}>
                  <Image source={source} style={styles.promoImage} resizeMode="cover" />
                  {!secondCarouselUrls.length ? (
                    <View style={styles.promoOverlay}>
                      <Text style={styles.promoTitle}>Promoción destacada</Text>
                      <Text style={styles.promoSubtitle}>Configurable desde el panel admin</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

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

        <Text style={styles.sectionTitle}>Nuestros servicios</Text>
        <View style={styles.servicesGrid}>
          {services.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <Feather name={service.icon} size={24} color={colors.primary} />
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.servicePrice}>{service.priceLabel}</Text>
              <Text style={styles.serviceEta}>Tiempo estimado: {getEstimatedTime(service.name)}</Text>
              <TouchableOpacity
                style={styles.serviceBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Barbers', { screen: 'BarbersList' })}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Reservar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Galeria</Text>
        <View style={styles.galleryGrid}>
          {gallerySources.map((image, index) => (
            <TouchableOpacity
              key={`gallery-${index}`}
              activeOpacity={0.9}
              style={[styles.galleryItem, galleryVisibleCount === 3 && index === 2 ? styles.galleryItemWide : null]}
              onPress={() => {
                setSelectedGallery(index);
                setGalleryOpen(true);
              }}
            >
              {galleryFailed[index] ? (
                <View style={styles.galleryFallback}>
                  <Feather name="image" size={18} color={colors.subtext} />
                  <Text style={styles.galleryFallbackText}>Imagen</Text>
                </View>
              ) : (
                <Image
                  source={image}
                  style={styles.galleryImage}
                  onError={() =>
                    setGalleryFailed((prev) => {
                      const next = [...prev];
                      next[index] = true;
                      return next;
                    })
                  }
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.testimonialCard}>
          <Text style={styles.testimonialLabel}>Acerca de nosotros</Text>
          <Text style={styles.testimonialText}>{storyText}</Text>
          <Text style={styles.testimonialAuthor}>- {testimonialText}</Text>
        </View>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Barbers', { screen: 'BarbersList' })}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Reservar ahora</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={galleryOpen} transparent animationType="fade" onRequestClose={() => setGalleryOpen(false)}>
        <Pressable style={styles.galleryModalBackdrop} onPress={() => setGalleryOpen(false)}>
          <Pressable style={styles.galleryModalCard} onPress={() => {}}>
            <TouchableOpacity style={styles.galleryCloseBtn} onPress={() => setGalleryOpen(false)}>
              <Feather name="x" size={18} color="#fff" />
            </TouchableOpacity>
            <Image
              source={gallerySources[selectedGallery] ?? HOME_GALLERY[0]}
              style={styles.galleryModalImage}
              resizeMode="cover"
            />
          </Pressable>
        </Pressable>
      </Modal>
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
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    hello: { fontSize: 18, fontWeight: '700', color: colors.text },
    sub: { color: colors.subtext, marginTop: 2 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionTitle: { fontWeight: '700', color: colors.text, marginBottom: 8, fontSize: 16 },
    seeAll: { color: colors.primary, fontWeight: '600' },
    barberCard: {
      width: 110,
      marginRight: 12,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: { width: 64, height: 64, borderRadius: 64, marginBottom: 8, backgroundColor: colors.mutedBg },
    barberName: { color: colors.text, fontWeight: '600', textAlign: 'center', minHeight: 38, paddingHorizontal: 6 },
    badge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
    quickItem: {
      width: '32%',
      backgroundColor: colors.mutedBg,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 6,
    },
    quickText: { color: colors.text, fontWeight: '500' },
    secondCarousel: { marginTop: 2, marginBottom: 10 },
    promoCard: {
      width: width * 0.72,
      height: 142,
      borderRadius: 14,
      overflow: 'hidden',
      marginRight: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    promoImage: { width: '100%', height: '100%' },
    promoOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 10,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    promoTitle: { color: '#fff', fontWeight: '700' },
    promoSubtitle: { color: '#F4F4F4', fontSize: 12, marginTop: 2 },
    socialCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 8,
      marginBottom: 12,
    },
    socialRow: { flexDirection: 'row', gap: 14 },
    mapLink: { color: colors.primary, fontWeight: '600' },
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
    serviceEta: { color: colors.subtext, marginTop: 4, fontSize: 12, textAlign: 'center' },
    serviceBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    galleryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    galleryItem: { width: '48.5%' },
    galleryItemWide: { width: '100%' },
    galleryImage: {
      width: '100%',
      height: 130,
      borderRadius: 12,
      marginBottom: 10,
      backgroundColor: colors.mutedBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    galleryFallback: {
      width: '100%',
      height: 130,
      borderRadius: 12,
      marginBottom: 10,
      backgroundColor: colors.mutedBg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    galleryFallbackText: { color: colors.subtext, fontSize: 12, fontWeight: '600' },
    testimonialCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    testimonialLabel: { color: colors.primary, fontWeight: '700', marginBottom: 6 },
    testimonialText: { color: colors.text, lineHeight: 20 },
    testimonialAuthor: { color: colors.subtext, marginTop: 8, fontWeight: '600' },
    cta: {
      marginTop: 8,
      backgroundColor: colors.primary,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    galleryModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    galleryModalCard: {
      width: MODAL_IMAGE_SIZE,
      height: MODAL_IMAGE_SIZE,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      position: 'relative',
    },
    galleryCloseBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    galleryModalImage: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.mutedBg,
    },
  });
}
