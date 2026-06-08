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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CouponRow | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('coupons').select('id, code, discount_percent, active').order('created_at', { ascending: false });
    if (error) {
      setDialog({ title: 'No se pudieron cargar cupones', message: error.message });
      return;
    }
    setRows((data as CouponRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setCode('');
    setPercent('10');
    setEditingId(null);
  };

  const saveCoupon = async () => {
    const discount = Number(percent);
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !Number.isFinite(discount) || discount <= 0 || discount > 100) {
      setDialog({ title: 'Datos inválidos', message: 'Código requerido y porcentaje entre 1 y 100.' });
      return;
    }

    const payload = { code: cleanCode, discount_percent: discount, active: true };
    const query = editingId
      ? supabase.from('coupons').update(payload).eq('id', editingId)
      : supabase.from('coupons').insert(payload);
    const { error } = await query;
    if (error) {
      const duplicated = /duplicate key|unique constraint/i.test(error.message);
      setDialog({
        title: editingId ? 'No se pudo actualizar' : 'No se pudo crear',
        message: duplicated ? 'Ya existe un cupón con ese código.' : error.message,
      });
      return;
    }
    resetForm();
    void load();
  };

  const startEditing = (row: CouponRow) => {
    setEditingId(row.id);
    setCode(row.code);
    setPercent(String(row.discount_percent));
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
    if (editingId === id) resetForm();
    setDialog({ title: 'Cupón eliminado', message: 'El cupón fue eliminado correctamente.' });
    void load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StaffScreenHeader title="Cupones" navigation={navigation} />
      <View style={styles.form}>
        <Text style={styles.formTitle}>{editingId ? 'Editar cupón' : 'Nuevo cupón'}</Text>
        <TextInput style={styles.input} placeholder="Código, ej: PATRON10" placeholderTextColor={colors.subtext} value={code} onChangeText={setCode} autoCapitalize="characters" />
        <TextInput style={styles.input} placeholder="% descuento" placeholderTextColor={colors.subtext} value={percent} onChangeText={setPercent} keyboardType="number-pad" />
        <TouchableOpacity style={styles.btn} onPress={saveCoupon}>
          <Text style={styles.btnTxt}>{editingId ? 'Guardar cambios' : 'Crear cupón'}</Text>
        </TouchableOpacity>
        {editingId ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={resetForm}>
            <Text style={styles.secondaryBtnTxt}>Cancelar edición</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.name}>{item.code}</Text>
                <Text style={styles.meta}>{item.discount_percent}% de descuento</Text>
              </View>
              <View style={styles.iconRow}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => startEditing(item)}>
                  <Feather name="edit-2" size={15} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => setConfirmDelete(item)}>
                  <Feather name="trash-2" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.row}>
              <Text style={styles.meta}>{item.active ? 'Activo' : 'Inactivo'}</Text>
              <Switch value={item.active} onValueChange={(value) => toggle(item.id, value)} trackColor={{ false: colors.border, true: colors.primary }} />
            </View>
          </View>
        )}
      />
      <AppDialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} onClose={() => setDialog(null)} />
      <AppDialog
        visible={!!confirmDelete}
        title="Eliminar cupón"
        message={confirmDelete ? `¿Seguro que quieres eliminar el cupón ${confirmDelete.code}?` : ''}
        actionLabel="Eliminar"
        secondaryLabel="Cancelar"
        destructive
        onSecondary={() => setConfirmDelete(null)}
        onClose={() => {
          const row = confirmDelete;
          setConfirmDelete(null);
          if (row) void removeCoupon(row.id);
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: { primary: string; background: string; card: string; text: string; subtext: string; border: string }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    form: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, backgroundColor: colors.card, marginBottom: 12 },
    formTitle: { color: colors.text, fontWeight: '800', fontSize: 18, marginBottom: 10 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 46,
      color: colors.text,
      marginBottom: 10,
      backgroundColor: colors.background,
    },
    btn: { height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    btnTxt: { color: '#fff', fontWeight: '800' },
    secondaryBtn: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    secondaryBtnTxt: { color: colors.text, fontWeight: '700' },
    card: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, marginBottom: 10, backgroundColor: colors.card },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    iconRow: { flexDirection: 'row', gap: 8 },
    iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { backgroundColor: '#d64545' },
    name: { color: colors.text, fontWeight: '800', fontSize: 16 },
    meta: { color: colors.subtext, marginTop: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  });
}
