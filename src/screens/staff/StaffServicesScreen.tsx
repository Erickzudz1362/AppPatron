import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

export default function StaffServicesScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [price, setPrice] = useState('30');
  const [visibleOnApp, setVisibleOnApp] = useState(true);
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

  const createService = async () => {
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

    const { error } = await supabase.from('services').insert({
      name: name.trim(),
      duration_minutes: duration,
      price: finalPrice,
      active: visibleOnApp,
    });

    if (error) {
      setDialog({ title: 'No se pudo crear', message: error.message });
      return;
    }

    setName('');
    setMinutes('30');
    setPrice('30');
    setVisibleOnApp(true);
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StaffScreenHeader title="Servicios" navigation={navigation} />

      <View style={styles.form}>
        <Text style={styles.formTitle}>Agregar servicio</Text>
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

        <TouchableOpacity style={styles.btn} onPress={createService}>
          <Text style={styles.btnTxt}>Guardar servicio</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>Duracion: {item.duration_minutes} min</Text>
            <Text style={styles.meta}>Precio: {item.price} Bs</Text>
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
    switchHelper: { color: colors.subtext, fontSize: 12, lineHeight: 16 },
    btn: {
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnTxt: { color: '#fff', fontWeight: '800' },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      backgroundColor: colors.card,
    },
    name: { color: colors.text, fontWeight: '800', fontSize: 16 },
    meta: { color: colors.subtext, marginTop: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  });
}
