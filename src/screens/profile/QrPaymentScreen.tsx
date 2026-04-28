import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useAppTheme } from '../../theme/ThemeProvider';
import { supabase } from '../../config/supabase';

const QR_FALLBACK = require('../../../assets/icon.png');
const QR_STORAGE_BUCKET =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_QR_BUCKET?.trim()) || 'payment-assets';
const QR_STORAGE_PATH =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_QR_PATH?.trim()) || 'qr/current.png';

export default function QrPaymentScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { colors } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const qrPublicUrl = useMemo(() => {
    const { data } = supabase.storage.from(QR_STORAGE_BUCKET).getPublicUrl(QR_STORAGE_PATH);
    // Cache buster para reflejar cambios del dueño sin republicar la app.
    return `${data.publicUrl}?v=${Math.floor(Date.now() / 60000)}`;
  }, []);

  const downloadQr = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('No disponible', 'Abre esta pantalla en la app para móvil.');
      return;
    }

    setSaving(true);
    try {
      let uri: string | null = null;

      if (!imageError) {
        const target = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}qr-payment-${Date.now()}.png`;
        const dl = await FileSystem.downloadAsync(qrPublicUrl, target);
        uri = dl.uri;
      }

      // Si falla Storage, usar fallback local para no bloquear la descarga.
      if (!uri) {
        const asset = Asset.fromModule(QR_FALLBACK);
        await asset.downloadAsync();
        uri = asset.localUri;
      }

      if (!uri) {
        Alert.alert('Error', 'No se pudo cargar la imagen.');
        return;
      }

      // Android 13+: solo permiso de fotos (evita pedir audio). iOS ignora el segundo argumento.
      const perm = await MediaLibrary.requestPermissionsAsync(
        false,
        Platform.OS === 'android' ? ['photo'] : undefined
      );

      if (!perm.granted) {
        Alert.alert(
          'Permisos',
          'Para guardar el QR en la galería necesitamos permiso de fotos. Actívalo en Ajustes de la app.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Listo', 'El código QR se guardó en tu galería.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar en la galería.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [imageError, qrPublicUrl]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>Pago con QR</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={imageError ? QR_FALLBACK : { uri: qrPublicUrl }}
            style={styles.qrImage}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.downloadBtn,
            { backgroundColor: colors.primary },
            saving && styles.downloadBtnDisabled,
          ]}
          onPress={downloadQr}
          disabled={saving}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Feather name="download" size={20} color={colors.onPrimary} />
              <Text style={[styles.downloadLabel, { color: colors.onPrimary }]}>Descargar QR</Text>
            </>
          )}
        </TouchableOpacity>
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
  topTitle: { fontSize: 17, fontWeight: '700' },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
    alignItems: 'center',
  },
  qrCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    ...Platform.select({
      ios: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  qrImage: { width: 240, height: 240 },
  downloadBtn: {
    marginTop: 24,
    width: '100%',
    maxWidth: 320,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  downloadBtnDisabled: { opacity: 0.85 },
  downloadLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
});
