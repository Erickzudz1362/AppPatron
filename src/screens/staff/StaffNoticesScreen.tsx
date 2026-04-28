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

export default function StaffNoticesScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rows, setRows] = useState<NoticeRow[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

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

  useEffect(() => { void load(); }, [load]);

  const createNotice = async () => {
    if (!title.trim() || !message.trim()) {
      setDialog({ title: 'Datos incompletos', message: 'Ingresa título y mensaje.' });
      return;
    }
    const { error } = await supabase.from('notifications').insert({
      type: 'aviso',
      title: title.trim(),
      message: message.trim(),
      is_active: true,
    });
    if (error) {
      setDialog({ title: 'No se pudo crear', message: error.message });
      return;
    }
    setTitle('');
    setMessage('');
    void load();
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from('notifications').update({ is_active: active }).eq('id', id);
    if (error) setDialog({ title: 'Error', message: error.message });
    void load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StaffScreenHeader title="Avisos" navigation={navigation} />
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Título" placeholderTextColor={colors.subtext} value={title} onChangeText={setTitle} />
        <TextInput style={[styles.input, { height: 84 }]} multiline placeholder="Mensaje" placeholderTextColor={colors.subtext} value={message} onChangeText={setMessage} />
        <TouchableOpacity style={styles.btn} onPress={createNotice}>
          <Text style={styles.btnTxt}>Publicar aviso</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.title ?? 'Sin título'}</Text>
            <Text style={styles.meta}>{item.message ?? '—'}</Text>
            <View style={styles.row}>
              <Text style={styles.meta}>{item.is_active ? 'Activo' : 'Inactivo'}</Text>
              <Switch value={!!item.is_active} onValueChange={(v) => toggle(item.id, v)} trackColor={{ false: colors.border, true: colors.primary }} />
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
      paddingVertical: 10,
      minHeight: 44,
      color: colors.text,
      marginBottom: 8,
      backgroundColor: colors.background,
      textAlignVertical: 'top',
    },
    btn: { height: 46, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    btnTxt: { color: '#fff', fontWeight: '700' },
    card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: colors.card },
    name: { color: colors.text, fontWeight: '700', fontSize: 16 },
    meta: { color: colors.subtext, marginTop: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  });
}

