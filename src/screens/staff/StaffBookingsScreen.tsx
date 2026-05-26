import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import AppDialog from '../../components/AppDialog';
import { StaffScreenHeader } from '../../components/StaffScreenHeader';
import { syncStaffAppointmentReminders } from '../../notifications/push';
import { triggerBookingPush } from '../../notifications/remotePush';

type Row = {
  id: string;
  client_id: string;
  barber_id: string;
  date: string;
  time: string;
  status: string;
  notes: string | null;
  total_price_snapshot: number | null;
};

type ProfileMini = { id: string; name: string | null; phone: string | null; visit_count?: number | null };
type BarberMini = { id: string; user_id: string };

const STATES = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'] as const;
const STATUS_LABEL: Record<string, string> = {
  pending: 'Reservado',
  confirmed: 'Confirmado',
  completed: 'Finalizado',
  no_show: 'No se presento',
  cancelled: 'Cancelado',
};

function digitsPhone(raw: string | null | undefined): string {
  return raw ? raw.replace(/\D/g, '') : '';
}

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function upcomingDates(): Array<{ key: string; label: string }> {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(base);
    next.setDate(base.getDate() + index);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    const label = next.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: '2-digit' });
    return { key, label };
  });
}

async function adjustVisitCount(clientId: string, delta: number) {
  const { error } = await supabase.rpc('adjust_profile_visit_count', { p_user_id: clientId, p_delta: delta });
  if (error) throw error;
}

export default function StaffBookingsScreen({ navigation }: any) {
  const route = useRoute();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { role, session } = useAuth();
  const isBarberTab = route.name === 'BarberBookings';
  const isAdmin = role === 'admin';
  const isBarber = role === 'barber';

  const [rows, setRows] = useState<Row[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, ProfileMini>>({});
  const [barberNameMap, setBarberNameMap] = useState<Record<string, string>>({});
  const [barberOptions, setBarberOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso());
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const dateOptions = useMemo(() => upcomingDates(), []);

  const load = useCallback(async (showLoader = true) => {
    if (!session?.user?.id) return;
    if (showLoader) setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select('id, client_id, barber_id, date, time, status, notes, total_price_snapshot')
        .order('time', { ascending: true })
        .limit(200);

      if (selectedDate !== 'all') query = query.eq('date', selectedDate);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      if (isBarber) {
        const { data: myBarber } = await supabase.from('barbers').select('id').eq('user_id', session.user.id).maybeSingle();
        if (!myBarber?.id) {
          setRows([]);
          return;
        }
        query = query.eq('barber_id', myBarber.id);
      } else if (isAdmin && selectedBarberId !== 'all') {
        query = query.eq('barber_id', selectedBarberId);
      }

      const { data, error } = await query;
      if (error) {
        setDialog({ title: 'Error', message: error.message });
        return;
      }

      const list = (data as Row[]) ?? [];
      setRows(list);

      const clientIds = Array.from(new Set(list.map((row) => row.client_id).filter(Boolean)));
      const barberIds = Array.from(new Set(list.map((row) => row.barber_id).filter(Boolean)));
      const [profilesRes, barbersRes] = await Promise.all([
        clientIds.length ? supabase.from('profiles').select('id, name, phone, visit_count').in('id', clientIds) : Promise.resolve({ data: [] }),
        isAdmin ? supabase.from('barbers').select('id, user_id') : Promise.resolve({ data: [] }),
      ]);

      const nextClientMap: Record<string, ProfileMini> = {};
      ((profilesRes.data as ProfileMini[]) ?? []).forEach((profile) => {
        nextClientMap[profile.id] = profile;
      });
      setClientMap(nextClientMap);

      const allBarbers = ((barbersRes.data as BarberMini[]) ?? []);
      const allUserIds = Array.from(new Set(allBarbers.map((barber) => barber.user_id)));
      const { data: barberProfiles } = allUserIds.length ? await supabase.from('profiles').select('id, name').in('id', allUserIds) : { data: [] };
      const nameByUser: Record<string, string> = {};
      ((barberProfiles ?? []) as { id: string; name: string | null }[]).forEach((profile) => {
        nameByUser[profile.id] = profile.name?.trim() || 'Barbero';
      });
      const nextBarberMap: Record<string, string> = {};
      allBarbers.forEach((barber) => {
        nextBarberMap[barber.id] = nameByUser[barber.user_id] ?? 'Barbero';
      });
      barberIds.forEach((id) => {
        if (!nextBarberMap[id]) nextBarberMap[id] = 'Barbero';
      });
      setBarberNameMap(nextBarberMap);
      setBarberOptions(allBarbers.map((barber) => ({ id: barber.id, name: nextBarberMap[barber.id] ?? 'Barbero' })));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [isAdmin, isBarber, selectedBarberId, selectedDate, session?.user?.id, statusFilter]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load])
  );

  useEffect(() => {
    if (!rows.length || (role !== 'admin' && role !== 'barber')) return;
    void syncStaffAppointmentReminders(rows.map((row) => ({ id: row.id, date: row.date, time: row.time, status: row.status })));
  }, [role, rows]);

  useEffect(() => {
    const refreshSoon = () => {
      void load(false);
    };

    const bookingsChannel = supabase
      .channel(`staff-bookings-${role ?? 'unknown'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, refreshSoon)
      .subscribe();

    const intervalId = setInterval(refreshSoon, 5000);

    return () => {
      clearInterval(intervalId);
      void supabase.removeChannel(bookingsChannel);
    };
  }, [load, role]);

  const notifyClient = async (clientId: string, message: string) => {
    const { error } = await supabase.from('notifications').insert({
      type: 'sistema',
      title: 'Actualizacion de reserva',
      message,
      target_user_id: clientId,
      is_active: true,
    });
    if (error) throw error;
  };

  const updateStatus = async (row: Row, next: 'confirmed' | 'completed' | 'no_show' | 'cancelled') => {
    const previous = row.status;
    const { error } = await supabase.from('appointments').update({ status: next }).eq('id', row.id);
    if (error) {
      setDialog({ title: 'No se pudo actualizar', message: error.message });
      return;
    }

    if (previous === 'completed' && next !== 'completed') await adjustVisitCount(row.client_id, -1);
    if (previous === 'no_show' && next !== 'no_show') await adjustVisitCount(row.client_id, 1);
    if (next === 'completed' && previous !== 'completed') await adjustVisitCount(row.client_id, 1);
    if (next === 'no_show' && previous !== 'no_show') await adjustVisitCount(row.client_id, -1);

    const message =
      next === 'completed'
        ? 'Tu corte finalizo. Ya puedes entrar a la app y dejar tu resena del barbero.'
        : `Tu reserva cambio a: ${STATUS_LABEL[next]}`;
    await notifyClient(row.client_id, message);
    await triggerBookingPush({
      kind: 'reservation_status_changed',
      clientId: row.client_id,
      barberId: row.barber_id,
      status: next,
      statusLabel: STATUS_LABEL[next],
      barberName: barberNameMap[row.barber_id] ?? 'Barbero',
    });
    void load(false);
  };

  const openWhatsApp = (phone: string | null | undefined) => {
    const digits = digitsPhone(phone);
    if (!digits) return;
    void Linking.openURL(`https://wa.me/${digits}`);
  };

  const actionButtonsForRow = (item: Row) => {
    const buttons: Array<{ key: string; label: string; onPress: () => void; primary?: boolean }> = [];
    if (item.status === 'cancelled') return buttons;
    if (item.status === 'completed') return buttons;
    if (item.status === 'no_show') return isAdmin ? [{ key: 'cancelled', label: 'Cancelar', onPress: () => void updateStatus(item, 'cancelled') }] : buttons;

    if (item.status === 'pending') {
      buttons.push({ key: 'confirmed', label: 'Confirmar', onPress: () => void updateStatus(item, 'confirmed'), primary: true });
      if (isAdmin) buttons.push({ key: 'cancelled', label: 'Cancelar', onPress: () => void updateStatus(item, 'cancelled') });
      return buttons;
    }

    if (item.status === 'confirmed') {
      buttons.push({ key: 'completed', label: 'Finalizar', onPress: () => void updateStatus(item, 'completed'), primary: true });
      if (isAdmin) buttons.push({ key: 'no_show', label: 'No se presento', onPress: () => void updateStatus(item, 'no_show') });
      if (isAdmin) buttons.push({ key: 'cancelled', label: 'Cancelar', onPress: () => void updateStatus(item, 'cancelled') });
    }

    return buttons;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {!isBarberTab && <StaffScreenHeader title="Reservas" navigation={navigation} />}
      {isBarberTab ? <Text style={styles.pageHint}>Tus reservas del dia y proximos recordatorios locales.</Text> : null}

      <View style={styles.filtersBlock}>
        <Text style={styles.filterTitle}>Fecha</Text>
        <FlatList
          data={[{ key: 'all', label: 'Todas' }, ...dateOptions]}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.filterChip, selectedDate === item.key && styles.filterChipActive]} onPress={() => setSelectedDate(item.key)}>
              <Text style={[styles.filterChipTxt, selectedDate === item.key && styles.filterChipTxtActive]}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.filtersBlock}>
        <Text style={styles.filterTitle}>Estado</Text>
        <FlatList
          data={['all', ...STATES]}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.filterChip, statusFilter === item && styles.filterChipActive]} onPress={() => setStatusFilter(item)}>
              <Text style={[styles.filterChipTxt, statusFilter === item && styles.filterChipTxtActive]}>{item === 'all' ? 'Todos' : STATUS_LABEL[item]}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isAdmin ? (
        <View style={styles.filtersBlock}>
          <Text style={styles.filterTitle}>Barbero</Text>
          <FlatList
            data={[{ id: 'all', name: 'Todos' }, ...barberOptions]}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.filterChip, selectedBarberId === item.id && styles.filterChipActive]} onPress={() => setSelectedBarberId(item.id)}>
                <Text style={[styles.filterChipTxt, selectedBarberId === item.id && styles.filterChipTxtActive]}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load(true)} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const client = clientMap[item.client_id];
          const phone = client?.phone;
          const actions = actionButtonsForRow(item);
          return (
            <View style={styles.card}>
              <Text style={styles.rowTitle}>Reserva · {item.id.slice(0, 8)}</Text>
              <Text style={styles.meta}>Barbero: {barberNameMap[item.barber_id] ?? 'Barbero'}</Text>
              <Text style={styles.meta}>Cliente: {client?.name?.trim() || '-'}</Text>
              <TouchableOpacity onPress={() => openWhatsApp(phone)} disabled={!digitsPhone(phone)}>
                <Text style={[styles.meta, digitsPhone(phone) ? styles.link : styles.metaMuted]}>
                  Celular: {phone?.trim() || '-'} {digitsPhone(phone) ? '(tocar para abrir chat)' : ''}
                </Text>
              </TouchableOpacity>
              <Text style={styles.meta}>Fecha: {item.date} · Hora: {item.time?.slice(0, 5)}</Text>
              <Text style={styles.meta}>Estado: {STATUS_LABEL[item.status] ?? item.status}</Text>
              {item.total_price_snapshot != null ? <Text style={styles.meta}>Precio: {item.total_price_snapshot} Bs</Text> : null}
              {item.notes ? <Text style={styles.meta}>{item.notes}</Text> : null}

              {actions.length ? (
                <View style={styles.actions}>
                  {actions.map((action) => (
                    <TouchableOpacity key={action.key} style={[styles.actionBtn, action.primary && styles.actionBtnPrimary]} onPress={action.onPress}>
                      <Text style={[styles.actionTxt, action.primary && styles.actionTxtPrimary]}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Sin reservas para este filtro.</Text> : null}
      />

      <AppDialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} onClose={() => setDialog(null)} />
    </SafeAreaView>
  );
}

function createStyles(colors: { primary: string; background: string; card: string; text: string; subtext: string; border: string }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    pageHint: { color: colors.subtext, fontSize: 13, marginBottom: 8 },
    filtersBlock: { marginBottom: 10 },
    filterTitle: { color: colors.text, fontWeight: '800', marginBottom: 8 },
    filterChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
    filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    filterChipTxt: { color: colors.text, fontWeight: '700', fontSize: 12 },
    filterChipTxtActive: { color: '#fff' },
    card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 10 },
    rowTitle: { color: colors.text, fontWeight: '800' },
    meta: { color: colors.subtext, marginTop: 2 },
    metaMuted: { opacity: 0.5 },
    link: { color: colors.primary, fontWeight: '600' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    actionBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, marginBottom: 8, backgroundColor: colors.background },
    actionBtnPrimary: { borderColor: colors.primary, backgroundColor: colors.primary },
    actionTxt: { color: colors.text, fontSize: 12, fontWeight: '700' },
    actionTxtPrimary: { color: '#fff' },
    empty: { color: colors.subtext, textAlign: 'center', marginTop: 24 },
  });
}
