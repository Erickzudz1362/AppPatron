import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppTheme } from '../../theme/ThemeProvider';
import { supabase } from '../../config/supabase';
import AppDialog from '../../components/AppDialog';
import { getBarberAvailability } from '../../api/bookingApi';

type BarberParam = {
  id: string;
  name: string;
  specialties?: string[];
};

type Slot = {
  key: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
  available: boolean;
};

type ServiceCatalogRow = {
  id: string;
  name: string | null;
  duration_minutes: number | null;
  price: number | null;
  active?: boolean | null;
};

type SelectableService = {
  id: string;
  name: string;
  duration: number;
  price: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLabel(d: Date): string {
  return d.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function parseMinutes(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const m = v.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function normalizeText(v: string): string {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function BarberCalendarScreen({ navigation, route }: any) {
  const barber = (route?.params?.barber ?? null) as BarberParam | null;
  const rescheduleAppointmentId = typeof route?.params?.rescheduleAppointmentId === 'string'
    ? route.params.rescheduleAppointmentId
    : null;
  const initialServiceIds = useMemo<string[]>(
    () => Array.isArray(route?.params?.initialServiceIds)
      ? route.params.initialServiceIds.map((value: unknown) => String(value))
      : [],
    [route?.params?.initialServiceIds]
  );
  const isRescheduling = !!rescheduleAppointmentId;
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const serviceOptions = useMemo(
    () =>
      (barber?.specialties?.length ? barber.specialties : ['Corte', 'Barba', 'Afeitado'])
        .filter(Boolean)
        .filter((s) => s.toLowerCase() !== 'combo'),
    [barber?.specialties]
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogRow[]>([]);
  const [minLeadHours, setMinLeadHours] = useState(3);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const weekDays = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return { key: toDateOnly(d), label: toLabel(d), date: d };
    });
  }, []);

  const selectedDay = weekDays[Math.min(dayOffset, weekDays.length - 1)] ?? weekDays[0];
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data, error }, settingsRes] = await Promise.all([
        supabase.from('services').select('id, name, duration_minutes, price, active').eq('active', true).limit(100),
        supabase
          .from('app_settings')
          .select('key, value')
          .in('key', ['min_reservation_hours', 'appointment_change_min_hours']),
      ]);
      if (!alive) return;
      if (error) {
        console.warn('[BarberCalendar] services:', error.message);
        setServiceCatalog([]);
      } else {
        setServiceCatalog((data as ServiceCatalogRow[]) ?? []);
      }
      const settings = (settingsRes.data ?? []) as Array<{ key: string; value: string }>;
      const settingKey = isRescheduling ? 'appointment_change_min_hours' : 'min_reservation_hours';
      const h = Number(settings.find((row) => row.key === settingKey)?.value ?? 3);
      if (Number.isFinite(h) && h > 0) setMinLeadHours(h);
    })();
    return () => {
      alive = false;
    };
  }, [isRescheduling, serviceOptions]);

  const serviceByName = useMemo(() => {
    const map = new Map<string, ServiceCatalogRow>();
    serviceCatalog.forEach((s) => {
      const n = (s.name ?? '').trim();
      if (n) map.set(n, s);
    });
    return map;
  }, [serviceCatalog]);

  const resolveServiceRowBySpecialty = useCallback(
    (selectedName: string): ServiceCatalogRow | null => {
      if (!selectedName.trim()) return null;
      const direct = serviceByName.get(selectedName);
      if (direct) return direct;

      const needle = normalizeText(selectedName);
      const all = Array.from(serviceByName.values());

      // 1) "corte" -> "corte moderno"
      const byContains = all.find((s) => {
        const n = normalizeText((s.name ?? '').trim());
        return !!n && (n.includes(needle) || needle.includes(n));
      });
      if (byContains) return byContains;

      // 2) fallback por palabra (barba/ceja/afeitado/color/corte)
      const byKeyword = all.find((s) => {
        const n = normalizeText((s.name ?? '').trim());
        if (needle.includes('barba')) return n.includes('barba');
        if (needle.includes('ceja')) return n.includes('ceja');
        if (needle.includes('afeitad')) return n.includes('afeitad');
        if (needle.includes('color') || needle.includes('tint')) return n.includes('color') || n.includes('tint');
        if (needle.includes('corte')) return n.includes('corte');
        return false;
      });
      return byKeyword ?? null;
    },
    [serviceByName]
  );

  const selectableServices = useMemo<SelectableService[]>(() => {
    if (!serviceCatalog.length) return [];

    // Mapear especialidades del barbero -> servicios reales de la tabla services.
    const picked: ServiceCatalogRow[] = [];
    for (const spec of serviceOptions) {
      const n = normalizeText(spec);
      let row: ServiceCatalogRow | null = null;
      if (n.includes('corte')) {
        row =
          serviceCatalog.find((s) => normalizeText(s.name ?? '') === 'corte de cabello') ??
          serviceCatalog.find((s) => normalizeText(s.name ?? '').includes('corte de cabello')) ??
          serviceCatalog.find((s) => normalizeText(s.name ?? '').includes('corte')) ??
          null;
      } else if (n.includes('barba')) {
        row =
          serviceCatalog.find((s) => normalizeText(s.name ?? '').includes('arreglo de barba')) ??
          serviceCatalog.find((s) => normalizeText(s.name ?? '').includes('barba')) ??
          null;
      } else if (n.includes('afeitad')) {
        row = serviceCatalog.find((s) => normalizeText(s.name ?? '').includes('afeitado')) ?? null;
      } else if (n.includes('ceja')) {
        row = serviceCatalog.find((s) => normalizeText(s.name ?? '').includes('ceja')) ?? null;
      } else if (n.includes('color') || n.includes('tint')) {
        row =
          serviceCatalog.find((s) => normalizeText(s.name ?? '').includes('color') || normalizeText(s.name ?? '').includes('tint')) ??
          null;
      } else {
        row = resolveServiceRowBySpecialty(spec);
      }
      if (row) picked.push(row);
    }

    const unique = new Map<string, SelectableService>();
    const rescheduleServices = isRescheduling
      ? serviceCatalog.filter((row) => initialServiceIds.includes(row.id))
      : [];
    const source = rescheduleServices.length ? rescheduleServices : picked.length ? picked : serviceCatalog;
    for (const row of source) {
      const name = (row.name ?? '').trim();
      if (!name) continue;
      unique.set(row.id, {
        id: row.id,
        name,
        duration: typeof row.duration_minutes === 'number' && row.duration_minutes > 0 ? row.duration_minutes : 30,
        price: typeof row.price === 'number' ? row.price : 0,
      });
    }
    return Array.from(unique.values());
  }, [initialServiceIds, isRescheduling, resolveServiceRowBySpecialty, serviceCatalog, serviceOptions]);

  React.useEffect(() => {
    if (!selectableServices.length) return;
    setSelectedServiceIds((prev) => {
      if (prev.length) return prev.filter((id) => selectableServices.some((service) => service.id === id));
      const initial = initialServiceIds.filter((id) => selectableServices.some((service) => service.id === id));
      return initial.length ? initial : [selectableServices[0].id];
    });
  }, [initialServiceIds, selectableServices]);

  const selectedServices = useMemo(
    () => selectedServiceIds.map((id) => selectableServices.find((s) => s.id === id)).filter(Boolean) as SelectableService[],
    [selectedServiceIds, selectableServices]
  );

  const totalPriceSnapshot = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices]
  );

  const durationMin = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.duration, 0);
  }, [selectedServices]);

  const loadDayData = useCallback(async () => {
    if (!barber?.id || !selectedDay?.key) return null;
    if (!UUID_RE.test(barber.id)) {
      return null;
    }
    return getBarberAvailability(barber.id, selectedDay.key, rescheduleAppointmentId);
  }, [barber?.id, rescheduleAppointmentId, selectedDay?.key]);

  const { data, error, refresh, showSkeleton } = useAsyncResource(loadDayData);

  const slots = useMemo<Slot[]>(() => {
    if (!data?.open) return [];
    const openingMin = parseMinutes(data.start);
    const closingMin = parseMinutes(data.end);
    if (openingMin === null || closingMin === null || closingMin <= openingMin) return [];
    const step = 30;
    const rows: Slot[] = [];

    const booked = data.blocked
      .map((row) => {
        const start = parseMinutes(row.start);
        if (start === null) return null;
        return { start, end: start + row.duration };
      })
      .filter(Boolean) as Array<{ start: number; end: number }>;

    for (let start = openingMin; start + durationMin <= closingMin; start += step) {
      const end = start + durationMin;
      const now = new Date();
      const minStart = new Date(now.getTime() + minLeadHours * 60 * 60 * 1000);
      const dayDate = new Date(selectedDay.date);
      dayDate.setHours(Math.floor(start / 60), start % 60, 0, 0);
      const withAnticipation = dayDate.getTime() >= minStart.getTime();
      const overlaps = booked.some((b) => start < b.end && end > b.start);
      rows.push({
        key: `${selectedDay.key}-${start}`,
        label: `${pad(Math.floor(start / 60))}:${pad(start % 60)}`,
        startMinutes: start,
        endMinutes: end,
        available: withAnticipation && !overlaps,
      });
    }
    return rows;
  }, [data, durationMin, minLeadHours, selectedDay.date, selectedDay.key]);

  const selectedSlotObj = useMemo(
    () => slots.find((s) => s.key === selectedSlot) ?? null,
    [selectedSlot, slots]
  );

  const handleReserve = useCallback(async () => {
    if (!barber?.id) return;
    if (!UUID_RE.test(barber.id)) {
      setDialog({
        title: 'Barbero no disponible',
        message: 'Este barbero aun no esta conectado con la base real. Actualiza la lista e intenta de nuevo.',
      });
      return;
    }
    if (!selectedServices.length) {
      setDialog({ title: 'Selecciona servicios', message: 'Debes elegir al menos un servicio.' });
      return;
    }
    const chosen = slots.find((s) => s.key === selectedSlot);
    if (!chosen || !chosen.available) {
      setDialog({ title: 'Selecciona horario', message: 'Elige una hora disponible para continuar.' });
      return;
    }
    const primaryServiceId = selectedServices[0]?.id ?? null;
    if (!primaryServiceId) {
      setDialog({
        title: 'Servicio no configurado',
        message: 'No encontramos este servicio en la tabla services. Revisa que el nombre coincida exactamente.',
      });
      return;
    }

    navigation.navigate('BookingSummary', {
      barber: { id: barber.id, name: barber.name },
      selectedDay: { key: selectedDay.key, label: selectedDay.label },
      selectedSlot: { label: chosen.label },
      selectedServices,
      durationMin,
      totalPrice: totalPriceSnapshot,
      primaryServiceId,
      rescheduleAppointmentId,
    });
  }, [barber?.id, barber?.name, durationMin, navigation, rescheduleAppointmentId, selectedDay.key, selectedDay.label, selectedServices, selectedSlot, slots, totalPriceSnapshot]);

  if (!barber) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>No se encontró el barbero seleccionado.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isRescheduling ? 'Reprogramar con' : 'Agenda de barbero:'} {barber.name}</Text>
          <Text style={styles.sub}>Reserva con al menos {minLeadHours} horas de anticipación</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Servicio</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
        {selectableServices.map((item) => {
          const active = selectedServiceIds.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.chip, active && styles.chipActive]}
              disabled={isRescheduling}
              onPress={() => {
                setSelectedServiceIds((prev) => {
                  if (prev.includes(item.id)) {
                    if (prev.length === 1) return prev;
                    return prev.filter((p) => p !== item.id);
                  }
                  return [...prev, item.id];
                });
                setSelectedSlot(null);
              }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      </View>

      <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Semana</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {weekDays.map((item, index) => {
          const active = index === dayOffset;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.dayChip, active && styles.dayChipActive]}
              onPress={() => {
                setDayOffset(index);
                setSelectedSlot(null);
              }}
            >
              <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      </View>

      <View style={styles.sectionCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Horarios disponibles</Text>
        <TouchableOpacity onPress={refresh}>
          <Feather name="refresh-cw" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showSkeleton ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={{ paddingTop: 4 }}>
          {slots.length === 0 ? (
            <Text style={styles.errorText}>No hay horarios para este día.</Text>
          ) : (
            Array.from({ length: Math.ceil(slots.length / 2) }).map((_, row) => {
              const left = slots[row * 2];
              const right = slots[row * 2 + 1];
              return (
                <View key={`row-${row}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {[left, right].map((item, idx) => {
                    if (!item) return <View key={`empty-${row}-${idx}`} style={styles.slot} />;
                    const active = selectedSlot === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        disabled={!item.available}
                        style={[
                          styles.slot,
                          !item.available && styles.slotDisabled,
                          active && styles.slotActive,
                        ]}
                        onPress={() => setSelectedSlot(item.key)}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            !item.available && styles.slotTextDisabled,
                            active && styles.slotTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>
      )}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen</Text>
        <Text style={styles.summaryLine}>Servicios: {selectedServices.map((s) => s.name).join(' + ')}</Text>
        <Text style={styles.summaryLine}>Duración estimada: {durationMin} min</Text>
        <Text style={styles.summaryLine}>
          Fecha: {selectedDay.label}
          {selectedSlotObj ? ` · ${selectedSlotObj.label}` : ''}
        </Text>
      </View>

      <TouchableOpacity style={styles.reserveBtn} onPress={handleReserve}>
        <Text style={styles.reserveText}>{isRescheduling ? 'Revisar reprogramación' : 'Continuar'}</Text>
      </TouchableOpacity>
      </ScrollView>
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
  mutedBg: string;
  success: string;
}) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    title: { color: colors.text, fontWeight: '700', fontSize: 18 },
    sub: { color: colors.subtext, marginTop: 3 },
    sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 10 },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 12,
    },
    chip: {
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.text, fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    dayChip: {
      height: 34,
      borderRadius: 17,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dayChipText: { color: colors.text, fontWeight: '600' },
    dayChipTextActive: { color: '#fff' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    centerBox: { minHeight: 90, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: colors.subtext, textAlign: 'center' },
    slot: {
      width: '48%',
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    slotDisabled: { backgroundColor: colors.mutedBg, borderColor: colors.border, opacity: 0.5 },
    slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    slotText: { color: colors.text, fontWeight: '700' },
    slotTextDisabled: { color: colors.subtext },
    slotTextActive: { color: '#fff' },
    reserveBtn: {
      height: 54,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    reserveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    summaryCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 12,
    },
    summaryTitle: { color: colors.text, fontWeight: '700', marginBottom: 6 },
    summaryLine: { color: colors.subtext, marginBottom: 2 },
    backBtn: {
      marginTop: 10,
      backgroundColor: colors.primary,
      height: 44,
      minWidth: 120,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnText: { color: '#fff', fontWeight: '700' },
  });
}

