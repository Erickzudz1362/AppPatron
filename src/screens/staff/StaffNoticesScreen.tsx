import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import AppDialog from '../../components/AppDialog';
import { StaffScreenHeader } from '../../components/StaffScreenHeader';

type NoticeRow = {
  id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  is_active: boolean | null;
};

const NOTICE_TYPES = [
  { value: 'promo', label: 'Promoción' },
  { value: 'aviso', label: 'Aviso' },
  { value: 'sistema', label: 'Sistema' },
] as const;

export default function StaffNoticesScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rows, setRows] = useState<NoticeRow[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [noticeType, setNoticeType] = useState<(typeof NOTICE_TYPES)[number]['value']>('aviso');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NoticeRow | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, is_active')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setDialog({ title: 'Error', message: error.message });
      return;
    }
    setRows((data as NoticeRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setNoticeType('aviso');
    setEditingId(null);
  };

  const saveNotice = async () => {
    if (!title.trim() || !message.trim()) {
      setDialog({ title: 'Datos incompletos', message: 'Ingresa título y mensaje.' });
      return;
    }

    const payload = {
      type: noticeType,
      title: title.trim(),
      message: message.trim(),
      is_active: true,
    };
    const query = editingId
      ? supabase.from('notifications').update(payload).eq('id', editingId)
      : supabase.from('notifications').insert(payload);
    const { error } = await query;
    if (error) {
      setDialog({ title: editingId ? 'No se pudo actualizar' : 'No se pudo crear', message: error.message });
      return;
    }
    resetForm();
    void load();
  };

  const startEditing = (row: NoticeRow) => {
    setEditingId(row.id);
    setTitle(row.title ?? '');
    setMessage(row.message ?? '');
    setNoticeType(row.type === 'promo' || row.type === 'sistema' ? row.type : 'aviso');
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from('notifications').update({ is_active: active }).eq('id', id);
    if (error) setDialog({ title: 'Error', message: error.message });
    void load();
  };

  const removeNotice = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      setDialog({ title: 'No se pudo eliminar', message: error.message });
      return;
    }
    if (editingId === id) resetForm();
    setDialog({ title: 'Aviso eliminado', message: 'El aviso fue eliminado correctamente.' });
    void load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StaffScreenHeader title="Avisos" navigation={navigation} />
      <View style={styles.form}>
        <Text style={styles.formTitle}>{editingId ? 'Editar aviso' : 'Nuevo aviso'}</Text>
        <View style={styles.typeRow}>
          {NOTICE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[styles.typeChip, noticeType === type.value && styles.typeChipActive]}
              onPress={() => setNoticeType(type.value)}
            >
              <Text style={[styles.typeChipText, noticeType === type.value && styles.typeChipTextActive]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Título"
          placeholderTextColor={colors.subtext}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { height: 84 }]}
          multiline
          placeholder="Mensaje"
          placeholderTextColor={colors.subtext}
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.btn} onPress={saveNotice}>
          <Text style={styles.btnTxt}>{editingId ? 'Guardar cambios' : 'Publicar aviso'}</Text>
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
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.title ?? 'Sin titulo'}</Text>
                <Text style={styles.typeLabel}>{NOTICE_TYPES.find((type) => type.value === item.type)?.label ?? 'Aviso'}</Text>
                <Text style={styles.meta}>{item.message ?? '-'}</Text>
              </View>
              <View style={styles.iconRow}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => startEditing(item)}>
                  <Text style={styles.iconTxt}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => setConfirmDelete(item)}>
                  <Text style={styles.iconTxt}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.row}>
              <Text style={styles.meta}>{item.is_active ? 'Activo' : 'Inactivo'}</Text>
              <Switch value={!!item.is_active} onValueChange={(value) => toggle(item.id, value)} trackColor={{ false: colors.border, true: colors.primary }} />
            </View>
          </View>
        )}
      />
      <AppDialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} onClose={() => setDialog(null)} />
      <AppDialog
        visible={!!confirmDelete}
        title="Eliminar aviso"
        message={confirmDelete ? `¿Seguro que quieres eliminar "${confirmDelete.title ?? 'este aviso'}"?` : ''}
        actionLabel="Eliminar"
        secondaryLabel="Cancelar"
        destructive
        onSecondary={() => setConfirmDelete(null)}
        onClose={() => {
          const row = confirmDelete;
          setConfirmDelete(null);
          if (row) void removeNotice(row.id);
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
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    typeChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },
    typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    typeChipText: { color: colors.text, fontWeight: '800', fontSize: 12 },
    typeChipTextActive: { color: '#fff' },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 46,
      color: colors.text,
      marginBottom: 10,
      backgroundColor: colors.background,
      textAlignVertical: 'top',
    },
    btn: { height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    btnTxt: { color: '#fff', fontWeight: '800' },
    secondaryBtn: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    secondaryBtnTxt: { color: colors.text, fontWeight: '700' },
    card: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, marginBottom: 10, backgroundColor: colors.card },
    topRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' },
    iconRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
    iconBtn: { borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 7 },
    deleteBtn: { backgroundColor: '#d64545' },
    iconTxt: { color: '#fff', fontWeight: '800', fontSize: 11 },
    name: { color: colors.text, fontWeight: '800', fontSize: 16 },
    typeLabel: { color: colors.primary, fontWeight: '800', marginTop: 4 },
    meta: { color: colors.subtext, marginTop: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  });
}
