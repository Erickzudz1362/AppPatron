import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import AppDialog from '../../components/AppDialog';
import { StaffScreenHeader } from '../../components/StaffScreenHeader';

type CouponRow = {
  id: string;
  code: string;
  discount_percent: number;
  active: boolean;
};

export default function StaffCouponsScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('10');
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('coupons').select('id, code, discount_percent, active').order('created_at', { ascending: false });
    if (error) {
      setDialog({ title: 'Tabla coupons faltante', message: `Crea la tabla coupons en Supabase. Detalle: ${error.message}` });
      return;
    }
    setRows((data as CouponRow[]) ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createCoupon = async () => {
    const p = Number(percent);
    if (!code.trim() || !Number.isFinite(p) || p <= 0 || p > 100) {
      setDialog({ title: 'Datos inválidos', message: 'Código requerido y porcentaje entre 1 y 100.' });
      return;
    }
    const { error } = await supabase.from('coupons').insert({ code: code.trim().toUpperCase(), discount_percent: p, active: true });
    if (error) {
      setDialog({ title: 'No se pudo crear', message: error.message });
      return;
    }
    setCode('');
    setPercent('10');
    void load();
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from('coupons').update({ active }).eq('id', id);
    if (error) setDialog({ title: 'Error', message: error.message });
    void load();
  };

  const removeCoupon = async (id: string) => {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) {
      setDialog({ title: 'No se pudo eliminar', message: error.message });
      return;
    }
    setDialog({ title: 'Cupón eliminado', message: 'El cupón fue eliminado correctamente.' });
    void load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StaffScreenHeader title="Cupones" navigation={navigation} />
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Código" placeholderTextColor={colors.subtext} value={code} onChangeText={setCode} autoCapitalize="characters" />
        <TextInput style={styles.input} placeholder="% descuento" placeholderTextColor={colors.subtext} value={percent} onChangeText={setPercent} keyboardType="number-pad" />
        <TouchableOpacity style={styles.btn} onPress={createCoupon}>
          <Text style={styles.btnTxt}>Crear cupón</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.name}>{item.code}</Text>
                <Text style={styles.meta}>{item.discount_percent}%</Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => void removeCoupon(item.id)}>
                <Feather name="trash-2" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <Text style={styles.meta}>{item.active ? 'Activo' : 'Inactivo'}</Text>
              <Switch value={item.active} onValueChange={(v) => toggle(item.id, v)} trackColor={{ false: colors.border, true: colors.primary }} />
            </View>
          </View>
        )}
      />
      <AppDialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} onClose={() => setDialog(null)} />
    </SafeAreaView>
  );
}

function createStyles(colors: { primary: string; background: string; card: string; text: string; subtext: string; border: string }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 10 },
    form: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, backgroundColor: colors.card, marginBottom: 10 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 44,
      color: colors.text,
      marginBottom: 8,
      backgroundColor: colors.background,
    },
    btn: { height: 46, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    btnTxt: { color: '#fff', fontWeight: '700' },
    card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: colors.card },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    name: { color: colors.text, fontWeight: '700', fontSize: 16 },
    meta: { color: colors.subtext, marginTop: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    deleteBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#d64545',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

