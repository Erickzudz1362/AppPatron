import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import AppDialog from '../../components/AppDialog';
import { StaffScreenHeader } from '../../components/StaffScreenHeader';

export default function StaffSettingsScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [whatsapp, setWhatsapp] = useState('');
  const [minHours, setMinHours] = useState('3');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.from('app_settings').select('key, value').in('key', ['whatsapp_contact', 'min_reservation_hours']);
      if (!mounted) return;
      if (error) {
        setDialog({ title: 'Tabla app_settings faltante', message: `Crea app_settings en Supabase. Detalle: ${error.message}` });
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as Array<{ key: string; value: string }>;
      setWhatsapp(rows.find((r) => r.key === 'whatsapp_contact')?.value ?? '');
      setMinHours(rows.find((r) => r.key === 'min_reservation_hours')?.value ?? '3');
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const save = async () => {
    const hours = Number(minHours);
    if (!Number.isFinite(hours) || hours < 0) {
      setDialog({ title: 'Valor inválido', message: 'Las horas mínimas deben ser un número válido.' });
      return;
    }
    const rows = [
      { key: 'whatsapp_contact', value: whatsapp.trim() },
      { key: 'min_reservation_hours', value: String(hours) },
    ];
    const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
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
        <Text style={styles.label}>WhatsApp de contacto</Text>
        <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="https://wa.me/591..." placeholderTextColor={colors.subtext} />
        <Text style={styles.label}>Horas mínimas de anticipación</Text>
        <TextInput style={styles.input} value={minHours} onChangeText={setMinHours} keyboardType="number-pad" placeholderTextColor={colors.subtext} />
        <TouchableOpacity style={styles.btn} onPress={save}>
          <Text style={styles.btnTxt}>Guardar ajustes</Text>
        </TouchableOpacity>
      </View>
      <AppDialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} onClose={() => setDialog(null)} />
    </SafeAreaView>
  );
}

function createStyles(colors: { primary: string; background: string; card: string; text: string; subtext: string; border: string }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 10 },
    form: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, backgroundColor: colors.card, marginBottom: 10 },
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

