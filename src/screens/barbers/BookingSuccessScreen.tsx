import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { supabase } from '../../config/supabase';
import { BARBER_WHATSAPP_URL } from '../../constants/contact';
import { useAppTheme } from '../../theme/ThemeProvider';
import AppDialog from '../../components/AppDialog';

const QR_FALLBACK = require('../../../assets/icon.png');
const QR_STORAGE_BUCKET = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_QR_BUCKET?.trim()) || 'payment-assets';
const QR_STORAGE_PATH = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_QR_PATH?.trim()) || 'qr/current.png';

export default function BookingSuccessScreen({ navigation, route }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [savingQr, setSavingQr] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [proofSent, setProofSent] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const selectedServices = (route?.params?.selectedServices ?? []) as Array<{ name: string }>;
  const selectedDay = route?.params?.selectedDay as { label: string } | undefined;
  const selectedSlot = route?.params?.selectedSlot as { label: string } | undefined;
  const finalTotal = Number(route?.params?.finalTotal ?? 0);
  const barber = route?.params?.barber as { name: string } | undefined;

  const qrPublicUrl = useMemo(() => {
    const { data } = supabase.storage.from(QR_STORAGE_BUCKET).getPublicUrl(QR_STORAGE_PATH);
    return `${data.publicUrl}?v=${Math.floor(Date.now() / 60000)}`;
  }, []);

  const downloadQr = useCallback(async () => {
    if (Platform.OS === 'web') {
      setDialog({ title: 'No disponible', message: 'Abre esta pantalla en la app movil para descargar el QR.' });
      return;
    }
    setSavingQr(true);
    try {
      let uri: string | null = null;
      if (!imageError) {
        const target = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}booking-qr-${Date.now()}.png`;
        const dl = await FileSystem.downloadAsync(qrPublicUrl, target);
        uri = dl.uri;
      }
      if (!uri) {
        const asset = Asset.fromModule(QR_FALLBACK);
        await asset.downloadAsync();
        uri = asset.localUri;
      }
      if (!uri) {
        setDialog({ title: 'Error', message: 'No se pudo cargar la imagen del QR.' });
        return;
      }

      const perm = await MediaLibrary.requestPermissionsAsync(false, Platform.OS === 'android' ? ['photo'] : undefined);
      if (!perm.granted) {
        setDialog({ title: 'Permisos', message: 'Activa el permiso de fotos para guardar el QR.' });
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      setDialog({ title: 'QR descargado', message: 'El codigo QR se guardo correctamente en tu galeria.' });
    } finally {
      setSavingQr(false);
    }
  }, [imageError, qrPublicUrl]);

  const openWhatsApp = async () => {
    const text =
      `Hola, envio comprobante de reserva.%0A` +
      `Barbero: ${encodeURIComponent(barber?.name ?? '-') }%0A` +
      `Servicios: ${encodeURIComponent(selectedServices.map((service) => service.name).join(' + '))}%0A` +
      `Fecha: ${encodeURIComponent(selectedDay?.label ?? '')}%0A` +
      `Hora: ${encodeURIComponent(selectedSlot?.label ?? '')}%0A` +
      `Total: ${encodeURIComponent(String(finalTotal))} Bs`;
    const url = `${BARBER_WHATSAPP_URL}?text=${text}`;
    await Linking.openURL(url);
    setProofSent(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.hero}>
          <Feather name="check-circle" size={68} color="#fff" />
          <Text style={styles.heroTitle}>Reserva creada</Text>
          <Text style={styles.heroSub}>Descarga el QR y envia tu comprobante para revisar el estado desde el historial.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detalle</Text>
          <Text style={styles.infoText}>Barbero: {barber?.name ?? '-'}</Text>
          <Text style={styles.infoText}>Servicios: {selectedServices.map((service) => service.name).join(' + ')}</Text>
          <Text style={styles.infoText}>Fecha: {selectedDay?.label} · {selectedSlot?.label}</Text>
          <Text style={styles.totalText}>Total: {finalTotal} Bs</Text>
        </View>

        <View style={[styles.card, { alignItems: 'center' }]}>
          <Image source={imageError ? QR_FALLBACK : { uri: qrPublicUrl }} style={styles.qrImage} onError={() => setImageError(true)} />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => void downloadQr()} disabled={savingQr}>
          {savingQr ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Descargar QR</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => void openWhatsApp()}>
          <Text style={styles.secondaryText}>Enviar comprobante por WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkBtn, !proofSent && styles.linkBtnDisabled]}
          disabled={!proofSent}
          onPress={() => navigation.getParent?.()?.navigate('History')}
        >
          <Text style={[styles.linkText, !proofSent && { opacity: 0.45 }]}>Ver estado en Historial</Text>
        </TouchableOpacity>
      </ScrollView>

      <AppDialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} onClose={() => setDialog(null)} />
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
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    hero: {
      backgroundColor: '#2f2b63',
      borderRadius: 18,
      alignItems: 'center',
      paddingVertical: 22,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 8 },
    heroSub: { color: '#E9E8FF', textAlign: 'center', marginTop: 4 },
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 10 },
    sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 },
    infoText: { color: colors.subtext, fontSize: 15, marginBottom: 4 },
    totalText: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 6 },
    qrImage: { width: 190, height: 190 },
    primaryBtn: { height: 52, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    secondaryBtn: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10, backgroundColor: colors.card },
    secondaryText: { color: colors.primary, fontWeight: '700' },
    linkBtn: { marginTop: 10, alignItems: 'center' },
    linkBtnDisabled: { opacity: 0.8 },
    linkText: { color: colors.subtext, textDecorationLine: 'underline' },
  });
}
