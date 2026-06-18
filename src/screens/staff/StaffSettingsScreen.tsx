import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import AppDialog from '../../components/AppDialog';
import { StaffScreenHeader } from '../../components/StaffScreenHeader';

const SETTINGS_KEYS = ['whatsapp_contact', 'instagram_url', 'facebook_url', 'maps_url', 'min_reservation_hours'] as const;

export default function StaffSettingsScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [maps, setMaps] = useState('');
  const [minHours, setMinHours] = useState('3');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [...SETTINGS_KEYS]);
      if (!mounted) return;
      if (error) {
        setDialog({ title: 'Tabla app_settings faltante', message: `Crea app_settings en Supabase. Detalle: ${error.message}` });
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as Array<{ key: string; value: string }>;
      const pick = (key: string) => rows.find((r) => r.key === key)?.value ?? '';
      setWhatsapp(pick('whatsapp_contact'));
      setInstagram(pick('instagram_url'));
      setFacebook(pick('facebook_url'));
      setMaps(pick('maps_url'));
      setMinHours(pick('min_reservation_hours') || '3');
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const save = async () => {
    const hours = Number(minHours);
    if (!Number.isFinite(hours) || hours < 0) {
      setDialog({ title: 'Valor inválido', message: 'Las horas mínimas deben ser un número válido.' });
      return;
    }
    setSaving(true);
    const rows = [
      { key: 'whatsapp_contact', value: whatsapp.trim() },
      { key: 'instagram_url', value: instagram.trim() },
      { key: 'facebook_url', value: facebook.trim() },
      { key: 'maps_url', value: maps.trim() },
      { key: 'min_reservation_hours', value: String(hours) },
    ];
    const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
    setSaving(false);
    if (error) {
      setDialog({ title: 'No se pudo guardar', message: error.message });
      return;
    }
    setDialog({ title: 'Guardado', message: 'Ajustes actualizados correctamente.' });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]} edges={['top', 'left', 'right']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StaffScreenHeader title="Ajustes" navigation={navigation} />

      <View style={styles.form}>
        <Text style={styles.sectionLabel}>Redes sociales y contacto</Text>

        <Text style={styles.label}>WhatsApp (URL completa)</Text>
        <TextInput
          style={styles.input}
          value={whatsapp}
          onChangeText={setWhatsapp}
          placeholder="https://wa.me/591XXXXXXXX"
          placeholderTextColor={colors.subtext}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>Instagram (URL)</Text>
        <TextInput
          style={styles.input}
          value={instagram}
          onChangeText={setInstagram}
          placeholder="https://www.instagram.com/elpatronbol"
          placeholderTextColor={colors.subtext}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>Facebook (URL)</Text>
        <TextInput
          style={styles.input}
          value={facebook}
          onChangeText={setFacebook}
          placeholder="https://facebook.com/elpatron"
          placeholderTextColor={colors.subtext}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>Google Maps (URL)</Text>
        <TextInput
          style={styles.input}
          value={maps}
          onChangeText={setMaps}
          placeholder="https://maps.app.goo.gl/..."
          placeholderTextColor={colors.subtext}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionLabel}>Reservas</Text>
        <Text style={styles.label}>Horas mínimas de anticipación</Text>
        <TextInput
          style={styles.input}
          value={minHours}
          onChangeText={setMinHours}
          keyboardType="number-pad"
          placeholderTextColor={colors.subtext}
        />
      </View>

      <TouchableOpacity style={[styles.btn, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnTxt}>Guardar ajustes</Text>}
      </TouchableOpacity>

      <AppDialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} onClose={() => setDialog(null)} />
    </SafeAreaView>
  );
}

function createStyles(colors: { primary: string; background: string; card: string; text: string; subtext: string; border: string }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    form: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.card, marginBottom: 12 },
    sectionLabel: { color: colors.primary, fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
    label: { color: colors.text, fontWeight: '700', marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 44,
      color: colors.text,
      marginBottom: 10,
      backgroundColor: colors.background,
    },
    btn: { height: 46, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    btnTxt: { color: '#fff', fontWeight: '700' },
  });
}

