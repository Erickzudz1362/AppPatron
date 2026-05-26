import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import AppDialog from '../../components/AppDialog';
import { StaffScreenHeader } from '../../components/StaffScreenHeader';

type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  active: boolean;
};

const INITIAL_FORM = {
  name: '',
  minutes: '30',
  price: '30',
  visibleOnApp: true,
};

export default function StaffServicesScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [name, setName] = useState(INITIAL_FORM.name);
  const [minutes, setMinutes] = useState(INITIAL_FORM.minutes);
  const [price, setPrice] = useState(INITIAL_FORM.price);
  const [visibleOnApp, setVisibleOnApp] = useState(INITIAL_FORM.visibleOnApp);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price, active')
      .order('created_at', { ascending: false });

    if (error) {
      setDialog({ title: 'Error', message: error.message });
      return;
    }
    setRows((data as ServiceRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setName(INITIAL_FORM.name);
    setMinutes(INITIAL_FORM.minutes);
    setPrice(INITIAL_FORM.price);
    setVisibleOnApp(INITIAL_FORM.visibleOnApp);
    setEditingId(null);
  };

  const saveService = async () => {
    const duration = Number(minutes);
    const finalPrice = Number(price);

    if (!name.trim()) {
      setDialog({ title: 'Nombre requerido', message: 'Escribe el nombre del servicio.' });
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setDialog({ title: 'Duracion invalida', message: 'La duracion debe ser mayor a 0 minutos.' });
      return;
    }
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      setDialog({ title: 'Precio invalido', message: 'El precio debe ser mayor a 0 Bs.' });
      return;
    }

    const payload = {
      name: name.trim(),
      duration_minutes: duration,
      price: finalPrice,
      active: visibleOnApp,
    };

    const query = editingId
      ? supabase.from('services').update(payload).eq('id', editingId)
      : supabase.from('services').insert(payload);

    const { error } = await query;

    if (error) {
      setDialog({ title: editingId ? 'No se pudo actualizar' : 'No se pudo crear', message: error.message });
      return;
    }

    resetForm();
    setDialog({
      title: editingId ? 'Servicio actualizado' : 'Servicio guardado',
      message: editingId ? 'Los cambios del servicio fueron guardados correctamente.' : 'El servicio fue creado correctamente.',
    });
    void load();
  };

  const toggleActive = async (row: ServiceRow, next: boolean) => {
    const { error } = await supabase.from('services').update({ active: next }).eq('id', row.id);
    if (error) {
      setDialog({ title: 'Error', message: error.message });
      return;
    }
    void load();
  };

  const startEditing = (row: ServiceRow) => {
    setEditingId(row.id);
    setName(row.name);
    setMinutes(String(row.duration_minutes));
    setPrice(String(row.price));
    setVisibleOnApp(row.active);
  };

  const removeService = (row: ServiceRow) => {
    Alert.alert(
      'Eliminar servicio',
      `Se eliminara "${row.name}". Esta accion no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('services').delete().eq('id', row.id);
            if (error) {
              setDialog({ title: 'No se pudo eliminar', message: error.message });
              return;
            }
            if (editingId === row.id) resetForm();
            setDialog({ title: 'Servicio eliminado', message: 'El servicio fue eliminado correctamente.' });
            void load();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StaffScreenHeader title="Servicios" navigation={navigation} />

      <View style={styles.form}>
        <Text style={styles.formTitle}>{editingId ? 'Editar servicio' : 'Agregar servicio'}</Text>
        <Text style={styles.formHelper}>
          Completa el nombre, el tiempo estimado y el precio final. Si esta visible, los clientes lo podran reservar desde la app.
        </Text>

        <Text style={styles.label}>Nombre del servicio</Text>
        <TextInput
          style={styles.input}
          placeholder="Ejemplo: Corte de cabello"
          placeholderTextColor={colors.subtext}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Duracion estimada (minutos)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ejemplo: 30"
          placeholderTextColor={colors.subtext}
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Precio en bolivianos</Text>
        <TextInput
          style={styles.input}
          placeholder="Ejemplo: 30"
          placeholderTextColor={colors.subtext}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Visible para clientes</Text>
            <Text style={styles.switchHelper}>
              Si esta desactivado, el servicio seguira guardado pero no aparecera para nuevas reservas.
            </Text>
          </View>
          <Switch value={visibleOnApp} onValueChange={setVisibleOnApp} trackColor={{ false: colors.border, true: colors.primary }} />
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity style={styles.btn} onPress={saveService}>
            <Text style={styles.btnTxt}>{editingId ? 'Actualizar servicio' : 'Guardar servicio'}</Text>
          </TouchableOpacity>
          {editingId ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={resetForm}>
              <Text style={styles.secondaryBtnTxt}>Cancelar edicion</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>Duracion: {item.duration_minutes} min</Text>
                <Text style={styles.meta}>Precio: {item.price} Bs</Text>
              </View>
              <View style={styles.iconRow}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => startEditing(item)}>
                  <Feather name="edit-2" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => removeService(item)}>
                  <Feather name="trash-2" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.meta}>{item.active ? 'Visible en la app' : 'Oculto en la app'}</Text>
              <Switch value={item.active} onValueChange={(value) => toggleActive(item, value)} trackColor={{ false: colors.border, true: colors.primary }} />
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
    form: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      backgroundColor: colors.card,
      marginBottom: 12,
    },
    formTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
    formHelper: { color: colors.subtext, marginBottom: 12, lineHeight: 18 },
    label: { color: colors.text, fontWeight: '700', marginBottom: 6 },
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
    switchRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      marginBottom: 12,
    },
    formActions: { gap: 10 },
    switchHelper: { color: colors.subtext, fontSize: 12, lineHeight: 16 },
    btn: {
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnTxt: { color: '#fff', fontWeight: '800' },
    secondaryBtn: {
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    secondaryBtnTxt: { color: colors.text, fontWeight: '700' },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      backgroundColor: colors.card,
    },
    cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    iconRow: { flexDirection: 'row', gap: 8 },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    deleteBtn: { backgroundColor: '#d64545' },
    name: { color: colors.text, fontWeight: '800', fontSize: 16 },
    meta: { color: colors.subtext, marginTop: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  });
}
