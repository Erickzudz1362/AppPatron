import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import { showLocalNoticeNotification, scheduleClientAppointmentReminder } from '../../notifications/push';
import { triggerBookingPush } from '../../notifications/remotePush';

type SelectedService = { id: string; name: string; duration: number; price: number };

export default function BookingSummaryScreen({ navigation, route }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponValidated, setCouponValidated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);
  const savingRef = React.useRef(false);

  const barber = route?.params?.barber as { id: string; name: string } | undefined;
  const selectedDay = route?.params?.selectedDay as { key: string; label: string } | undefined;
  const selectedSlot = route?.params?.selectedSlot as { label: string } | undefined;
  const selectedServices = (route?.params?.selectedServices ?? []) as SelectedService[];
  const durationMin = Number(route?.params?.durationMin ?? 0);
  const totalPrice = Number(route?.params?.totalPrice ?? 0);

  const discount = couponDiscount;
  const finalTotal = Math.max(0, totalPrice - discount);

  const getFriendlyReservationError = (message: string) => {
    if (/appointments_barber_id_date_time_key/i.test(message) || /duplicate key value/i.test(message)) {
      return 'Ese horario acaba de ser reservado por otro cliente. Actualiza los horarios disponibles y elige otro horario.';
    }
    return message;
  };

  const resolveCoupon = async () => {
    const trimmed = coupon.trim().toUpperCase();
    if (!trimmed) {
      setCouponDiscount(0);
      setCouponMessage(null);
      setCouponValidated(false);
      return 0;
    }

    setValidatingCoupon(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('discount_percent, active')
      .eq('code', trimmed)
      .maybeSingle();

    if (error) {
      setCouponDiscount(0);
      setCouponValidated(false);
      setCouponMessage(
        /row-level security|permission denied|not authorized/i.test(error.message)
          ? 'Los cupones aun no estan habilitados para clientes en Supabase.'
          : 'No se pudo validar el cupon.'
      );
      setValidatingCoupon(false);
      return 0;
    }

    if (!data || data.active === false) {
      setCouponDiscount(0);
      setCouponValidated(false);
      setCouponMessage('Cupon no valido o inactivo.');
      setValidatingCoupon(false);
      return 0;
    }

    const nextDiscount = Math.round(totalPrice * (Number(data.discount_percent ?? 0) / 100));
    setCouponDiscount(nextDiscount);
    setCouponValidated(true);
    setCouponMessage(`Cupon aplicado: ${Number(data.discount_percent ?? 0)}% de descuento.`);
    setValidatingCoupon(false);
    return nextDiscount;
  };

  const handleConfirm = async () => {
    if (savingRef.current) return;
    if (!barber || !selectedDay || !selectedSlot || !selectedServices.length) {
      setDialog({ title: 'Datos incompletos', message: 'Faltan datos para confirmar la reserva.' });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) {
        setDialog({ title: 'Sesión requerida', message: 'Inicia sesión nuevamente para reservar.' });
        return;
      }

      const resolvedDiscount = await resolveCoupon();
      const resolvedTotal = Math.max(0, totalPrice - resolvedDiscount);

      const payload = {
        client_id: uid,
        barber_id: barber.id,
        service_id: selectedServices[0].id,
        date: selectedDay.key,
        time: `${selectedSlot.label}:00`,
        status: 'pending',
        notes:
          selectedServices.length > 1
            ? `Servicios: ${selectedServices.map((s) => s.name).join(' + ')}`
            : null,
        total_price_snapshot: resolvedTotal,
      };

      const { data, error } = await supabase.from('appointments').insert(payload).select('id').single();
      if (error) {
        setDialog({ title: 'No se pudo reservar', message: getFriendlyReservationError(error.message) });
        return;
      }

      const apptId = data?.id as string | undefined;
      if (apptId && selectedDay?.key && selectedSlot?.label) {
        const at = new Date(`${selectedDay.key}T${selectedSlot.label}:00`);
        if (!Number.isNaN(at.getTime())) {
          await scheduleClientAppointmentReminder({
            appointmentId: apptId,
            at,
            barberName: barber.name,
            servicesLabel: selectedServices.map((s) => s.name).join(' + '),
          });
        }
      }

      await showLocalNoticeNotification(
        'Reserva creada',
        `${selectedServices.map((s) => s.name).join(' + ')} el ${selectedDay.label} a las ${selectedSlot.label}.`
      );

      const servicesLabel = selectedServices.map((s) => s.name).join(' + ');
      const { data: barberRow } = await supabase.from('barbers').select('user_id').eq('id', barber.id).maybeSingle();
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      const notificationRows = [
        {
          type: 'sistema',
          title: 'Reserva creada',
          message: `Tu reserva de ${servicesLabel} fue registrada para el ${selectedDay.label} a las ${selectedSlot.label}.`,
          target_user_id: uid,
          is_active: true,
        },
        barberRow?.user_id
          ? {
              type: 'sistema',
              title: 'Nueva reserva',
              message: `Tienes una nueva reserva de ${servicesLabel} para el ${selectedDay.label} a las ${selectedSlot.label}.`,
              target_user_id: barberRow.user_id,
              is_active: true,
            }
          : null,
        ...((admins ?? []) as { id: string }[]).map((admin) => ({
          type: 'sistema',
          title: 'Nueva reserva',
          message: `Se registro una nueva reserva con ${barber.name} para el ${selectedDay.label} a las ${selectedSlot.label}.`,
          target_user_id: admin.id,
          is_active: true,
        })),
      ].filter(Boolean);

      if (notificationRows.length) {
        await supabase.from('notifications').insert(notificationRows as never);
      }

      await triggerBookingPush({
        kind: 'reservation_created',
        clientId: uid,
        barberId: barber.id,
        barberName: barber.name,
        servicesLabel,
        dayLabel: selectedDay.label,
        slotLabel: selectedSlot.label,
      });

      navigation.replace('BookingSuccess', {
        appointmentId: data?.id,
        barber,
        selectedDay,
        selectedSlot,
        selectedServices,
        durationMin,
        finalTotal: resolvedTotal,
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Tu reserva</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fecha y hora</Text>
          <Text style={styles.infoText}>{selectedDay?.label} · {selectedSlot?.label}</Text>
          <Text style={styles.infoText}>Barbero: {barber?.name ?? '—'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Servicios</Text>
          {selectedServices.map((s) => (
            <View key={s.id} style={styles.rowBetween}>
              <Text style={styles.infoText}>{s.name}</Text>
              <Text style={styles.infoText}>{s.price} Bs</Text>
            </View>
          ))}
          <Text style={[styles.infoText, { marginTop: 6 }]}>Duración estimada: {durationMin} min</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cupón</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="DISC20PERCEN"
              placeholderTextColor={colors.subtext}
              value={coupon}
              onChangeText={(value) => {
                setCoupon(value);
                setCouponMessage(null);
                setCouponDiscount(0);
                setCouponValidated(false);
              }}
              autoCapitalize="characters"
            />
            {coupon.trim() ? (
              <TouchableOpacity style={styles.validateBtn} onPress={() => void resolveCoupon()} disabled={validatingCoupon || saving}>
                {validatingCoupon ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.validateBtnText}>{couponValidated ? 'Validado' : 'Validar'}</Text>}
              </TouchableOpacity>
            ) : null}
          </View>
          {couponMessage ? (
            <Text style={[styles.couponHelper, { color: couponDiscount > 0 ? colors.primary : colors.subtext }]}>
              {couponMessage}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumen de pago</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.infoText}>Subtotal</Text>
            <Text style={styles.infoText}>{totalPrice} Bs</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.infoText}>Descuento</Text>
            <Text style={styles.infoText}>-{discount} Bs</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 6 }]}>
            <Text style={styles.totalText}>Total</Text>
            <Text style={styles.totalText}>{finalTotal} Bs</Text>
          </View>
        </View>

        <Text style={styles.legal}>
          Puntualidad: si no te presentas, tienes hasta 10 minutos de tolerancia respecto a la hora reservada. Pasado ese tiempo la cita puede
          considerarse no asistida.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirm} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Pagar ahora</Text>}
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{dialog?.title}</Text>
            <Text style={styles.modalMessage}>{dialog?.message}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setDialog(null)}>
              <Text style={styles.modalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    title: { color: colors.text, fontSize: 22, fontWeight: '800' },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 },
    infoText: { color: colors.subtext, fontSize: 15, marginBottom: 4 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    couponRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    couponHelper: { marginTop: 8, fontSize: 13 },
    couponInput: {
      flex: 1,
      height: 46,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      color: colors.text,
      backgroundColor: colors.background,
    },
    validateBtn: {
      minWidth: 86,
      height: 46,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    validateBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    totalText: { color: colors.text, fontWeight: '800', fontSize: 17 },
    primaryBtn: {
      height: 54,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    legal: { color: colors.subtext, fontSize: 11, lineHeight: 15, marginTop: 6, marginBottom: 8, paddingHorizontal: 2 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.48)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    modalTitle: { color: colors.text, fontWeight: '800', fontSize: 19, marginBottom: 8 },
    modalMessage: { color: colors.subtext, fontSize: 15, lineHeight: 21 },
    modalBtn: {
      marginTop: 16,
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    modalBtnText: { color: '#fff', fontWeight: '700' },
  });
}

