import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
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
  client_name?: string | null;
  client_phone?: string | null;
  client_visit_count?: number | null;
  barber_name?: string | null;
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

const STATUS_TONE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  pending: { bg: 'rgba(214, 158, 46, 0.16)', border: 'rgba(214, 158, 46, 0.34)', text: '#D69E2E', dot: '#D69E2E' },
  confirmed: { bg: 'rgba(17, 194, 214, 0.16)', border: 'rgba(17, 194, 214, 0.34)', text: '#11C2D6', dot: '#11C2D6' },
  completed: { bg: 'rgba(52, 211, 153, 0.16)', border: 'rgba(52, 211, 153, 0.34)', text: '#34D399', dot: '#34D399' },
  no_show: { bg: 'rgba(248, 113, 113, 0.16)', border: 'rgba(248, 113, 113, 0.34)', text: '#F87171', dot: '#F87171' },
  cancelled: { bg: 'rgba(148, 163, 184, 0.18)', border: 'rgba(148, 163, 184, 0.34)', text: '#94A3B8', dot: '#94A3B8' },
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
  const { role, session, profile } = useAuth();
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
  const today = useMemo(() => todayIso(), []);
  const barberPhotoUrl = profile?.photo_url?.trim() || null;

  const load = useCallback(async (showLoader = true) => {
    if (!session?.user?.id) return;
    if (showLoader) setLoading(true);

    try {
      const rpcParams = {
        p_date: selectedDate === 'all' ? null : selectedDate,
        p_status: statusFilter === 'all' ? null : statusFilter,
        p_barber_id: isAdmin && selectedBarberId !== 'all' ? selectedBarberId : null,
      };
      const rpcRes = await supabase.rpc('get_staff_booking_details', rpcParams);
      if (!rpcRes.error && Array.isArray(rpcRes.data)) {
        const list = (rpcRes.data as Row[]) ?? [];
        setRows(list);

        const nextClientMap: Record<string, ProfileMini> = {};
        const nextBarberMap: Record<string, string> = {};
        list.forEach((row) => {
          nextClientMap[row.client_id] = {
            id: row.client_id,
            name: row.client_name ?? null,
            phone: row.client_phone ?? null,
            visit_count: row.client_visit_count ?? null,
          };
          nextBarberMap[row.barber_id] = row.barber_name?.trim() || 'Barbero';
        });
        setClientMap(nextClientMap);
        setBarberNameMap(nextBarberMap);

        if (isAdmin) {
          const { data: allBarbers } = await supabase.rpc('get_admin_barber_directory');
          const options = ((allBarbers ?? []) as Array<{ id: string; name: string | null }>).map((barber) => ({
            id: barber.id,
            name: barber.name?.trim() || nextBarberMap[barber.id] || 'Barbero',
          }));
          setBarberOptions(options);
        }
        return;
      }

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
      ((profilesRes.data as ProfileMini[]) ?? []).forEach((entry) => {
        nextClientMap[entry.id] = entry;
      });
      setClientMap(nextClientMap);

      const allBarbers = ((barbersRes.data as BarberMini[]) ?? []);
      const allUserIds = Array.from(new Set(allBarbers.map((barber) => barber.user_id)));
      const { data: barberProfiles } = allUserIds.length ? await supabase.from('profiles').select('id, name').in('id', allUserIds) : { data: [] };
      const nameByUser: Record<string, string> = {};
      ((barberProfiles ?? []) as { id: string; name: string | null }[]).forEach((entry) => {
        nameByUser[entry.id] = entry.name?.trim() || 'Barbero';
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

  const summary = useMemo(() => {
    return {
      total: rows.length,
      todayCount: rows.filter((row) => row.date === today).length,
      pending: rows.filter((row) => row.status === 'pending').length,
      confirmed: rows.filter((row) => row.status === 'confirmed').length,
      completed: rows.filter((row) => row.status === 'completed').length,
      nextAppointment: rows.find((row) => row.status === 'pending' || row.status === 'confirmed') ?? null,
    };
  }, [rows, today]);

  const actionButtonsForRow = (item: Row) => {
    const buttons: Array<{ key: string; label: string; onPress: () => void; primary?: boolean }> = [];
    if (item.status === 'cancelled') return buttons;
    if (item.status === 'completed') return buttons;
    if (item.status === 'no_show') {
      return isAdmin
        ? [{ key: 'cancelled', label: 'Cancelar', onPress: () => void updateStatus(item, 'cancelled') }]
        : buttons;
    }

    if (item.status === 'pending') {
      buttons.push({
        key: 'confirmed',
        label: 'Confirmar',
        onPress: () => void updateStatus(item, 'confirmed'),
        primary: true,
      });
      if (isAdmin) {
        buttons.push({ key: 'cancelled', label: 'Cancelar', onPress: () => void updateStatus(item, 'cancelled') });
      }
      return buttons;
    }

    if (item.status === 'confirmed') {
      buttons.push({
        key: 'completed',
        label: 'Finalizar',
        onPress: () => void updateStatus(item, 'completed'),
        primary: true,
      });
      if (isAdmin) {
        buttons.push({ key: 'no_show', label: 'No se presento', onPress: () => void updateStatus(item, 'no_show') });
        buttons.push({ key: 'cancelled', label: 'Cancelar', onPress: () => void updateStatus(item, 'cancelled') });
      }
    }

    return buttons;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {!isBarberTab && <StaffScreenHeader title="Reservas" navigation={navigation} />}
      {isBarberTab ? (
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroAvatar}>
              {barberPhotoUrl ? (
                <Image source={{ uri: barberPhotoUrl }} style={styles.heroAvatarImage} />
              ) : (
                <Feather name="scissors" size={22} color="#11C2D6" />
              )}
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroKicker}>Panel barbero</Text>
              <Text style={styles.heroTitle}>Hola, {profile?.name?.trim()?.split(/\s+/)[0] || 'Patron'}</Text>
              <Text style={styles.heroSubtitle}>Tu agenda del dia, estados y clientes en una sola vista.</Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{summary.todayCount}</Text>
              <Text style={styles.heroStatLabel}>Citas de hoy</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{summary.pending}</Text>
              <Text style={styles.heroStatLabel}>Pendientes</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{summary.confirmed}</Text>
              <Text style={styles.heroStatLabel}>Confirmadas</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{summary.completed}</Text>
              <Text style={styles.heroStatLabel}>Finalizadas</Text>
            </View>
          </View>

          {summary.nextAppointment ? (
            <View style={styles.nextCard}>
              <View style={styles.nextTimeWrap}>
                <Text style={styles.nextLabel}>Siguiente cita</Text>
                <Text style={styles.nextTime}>{summary.nextAppointment.time?.slice(0, 5)}</Text>
              </View>
              <View style={styles.nextTextWrap}>
                <Text style={styles.nextClient}>
                  {clientMap[summary.nextAppointment.client_id]?.name?.trim() || 'Cliente'}
                </Text>
                <Text style={styles.nextMeta}>
                  {STATUS_LABEL[summary.nextAppointment.status] ?? summary.nextAppointment.status}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.pageHint}>Gestiona las reservas, estados y clientes desde un solo panel.</Text>
      )}

      <View style={styles.filtersBlock}>
        <Text style={styles.filterTitle}>Fecha</Text>
        <FlatList
          data={[{ key: 'all', label: 'Todas' }, ...dateOptions]}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, selectedDate === item.key && styles.filterChipActive]}
              onPress={() => setSelectedDate(item.key)}
            >
              <Text style={[styles.filterChipTxt, selectedDate === item.key && styles.filterChipTxtActive]}>
                {item.label}
              </Text>
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
            <TouchableOpacity
              style={[styles.filterChip, statusFilter === item && styles.filterChipActive]}
              onPress={() => setStatusFilter(item)}
            >
              <Text style={[styles.filterChipTxt, statusFilter === item && styles.filterChipTxtActive]}>
                {item === 'all' ? 'Todos' : STATUS_LABEL[item]}
              </Text>
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
              <TouchableOpacity
                style={[styles.filterChip, selectedBarberId === item.id && styles.filterChipActive]}
                onPress={() => setSelectedBarberId(item.id)}
              >
                <Text style={[styles.filterChipTxt, selectedBarberId === item.id && styles.filterChipTxtActive]}>
                  {item.name}
                </Text>
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
          const tone = STATUS_TONE[item.status] ?? STATUS_TONE.pending;

          return (
            <View style={[styles.card, isBarberTab && styles.cardBarber]}>
              <View style={styles.cardTop}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeValue}>{item.time?.slice(0, 5)}</Text>
                  <View style={[styles.timeDot, { backgroundColor: tone.dot }]} />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.rowTitle}>{client?.name?.trim() || 'Cliente sin nombre'}</Text>
                      <Text style={styles.metaStrong}>
                        {isBarberTab ? 'Reserva del dia' : `Reserva · ${item.id.slice(0, 8)}`}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                      <Text style={[styles.statusBadgeText, { color: tone.text }]}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaGrid}>
                    {!isBarberTab ? (
                      <View style={styles.metaPill}>
                        <Feather name="user-check" size={13} color={colors.primary} />
                        <Text style={styles.metaPillText}>{barberNameMap[item.barber_id] ?? 'Barbero'}</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={[styles.metaPill, !digitsPhone(phone) && styles.metaPillMuted]}
                      onPress={() => openWhatsApp(phone)}
                      disabled={!digitsPhone(phone)}
                    >
                      <Feather name="phone" size={13} color={digitsPhone(phone) ? colors.primary : colors.subtext} />
                      <Text style={styles.metaPillText}>{phone?.trim() || 'Sin celular'}</Text>
                    </TouchableOpacity>

                    <View style={styles.metaPill}>
                      <Feather name="calendar" size={13} color={colors.primary} />
                      <Text style={styles.metaPillText}>{item.date}</Text>
                    </View>

                    {item.total_price_snapshot != null ? (
                      <View style={styles.metaPill}>
                        <Feather name="credit-card" size={13} color={colors.primary} />
                        <Text style={styles.metaPillText}>{item.total_price_snapshot} Bs</Text>
                      </View>
                    ) : null}
                  </View>

                  {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
                </View>
              </View>

              {actions.length ? (
                <View style={styles.actions}>
                  {actions.map((action) => (
                    <TouchableOpacity
                      key={action.key}
                      style={[styles.actionBtn, action.primary && styles.actionBtnPrimary]}
                      onPress={action.onPress}
                    >
                      <Text style={[styles.actionTxt, action.primary && styles.actionTxtPrimary]}>
                        {action.label}
                      </Text>
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

function createStyles(colors: {
  primary: string;
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
}) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    pageHint: { color: colors.subtext, fontSize: 13, marginBottom: 10 },
    hero: {
      borderRadius: 28,
      padding: 18,
      marginBottom: 14,
      backgroundColor: '#111316',
      borderWidth: 1,
      borderColor: '#1E232B',
      overflow: 'hidden',
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    heroAvatar: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      backgroundColor: 'rgba(17,194,214,0.12)',
      borderWidth: 2,
      borderColor: 'rgba(17,194,214,0.5)',
    },
    heroAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 32,
    },
    heroText: { flex: 1 },
    heroKicker: {
      color: '#D5A021',
      fontWeight: '800',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    heroTitle: { color: '#fff', fontSize: 27, fontWeight: '900', marginTop: 4 },
    heroSubtitle: { color: '#A6B0BD', marginTop: 6, lineHeight: 19 },
    heroStats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
    heroStatCard: {
      width: '48.5%',
      borderRadius: 18,
      padding: 14,
      marginBottom: 10,
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    heroStatValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
    heroStatLabel: { color: '#A6B0BD', marginTop: 4, fontWeight: '700', fontSize: 12 },
    nextCard: {
      borderRadius: 18,
      padding: 14,
      backgroundColor: 'rgba(17,194,214,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(17,194,214,0.22)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    nextTimeWrap: { minWidth: 96 },
    nextTextWrap: { flex: 1 },
    nextLabel: {
      color: '#8EDAE5',
      fontWeight: '700',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    nextTime: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 2 },
    nextClient: { color: '#fff', fontWeight: '800', fontSize: 16 },
    nextMeta: { color: '#A6E7F0', marginTop: 4, fontSize: 12, fontWeight: '700' },
    filtersBlock: { marginBottom: 10 },
    filterTitle: { color: colors.text, fontWeight: '800', marginBottom: 8 },
    filterChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
    },
    filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    filterChipTxt: { color: colors.text, fontWeight: '700', fontSize: 12 },
    filterChipTxtActive: { color: '#fff' },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    cardBarber: { borderRadius: 20, padding: 14 },
    cardTop: { flexDirection: 'row', alignItems: 'stretch' },
    timeColumn: { width: 54, alignItems: 'center', marginRight: 12 },
    timeValue: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 4 },
    timeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 12 },
    cardBody: { flex: 1 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardHeaderText: { flex: 1 },
    rowTitle: { color: colors.text, fontWeight: '900', fontSize: 18 },
    metaStrong: { color: colors.subtext, marginTop: 3, fontWeight: '700' },
    statusBadge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    },
    statusBadgeText: { fontWeight: '800', fontSize: 11 },
    metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaPillMuted: { opacity: 0.75 },
    metaPillText: { color: colors.text, fontSize: 12, fontWeight: '700' },
    notes: { color: colors.subtext, marginTop: 10, lineHeight: 18 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, marginLeft: 66 },
    actionBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: colors.background,
      minWidth: 106,
      alignItems: 'center',
    },
    actionBtnPrimary: { borderColor: colors.primary, backgroundColor: colors.primary },
    actionTxt: { color: colors.text, fontSize: 12, fontWeight: '700' },
    actionTxtPrimary: { color: '#fff' },
    empty: { color: colors.subtext, textAlign: 'center', marginTop: 24 },
  });
}
