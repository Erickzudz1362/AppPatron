import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import { cancelAppointmentReminders, scheduleClientAppointmentReminder } from '../../notifications/push';
import { triggerBookingPush } from '../../notifications/remotePush';
import { createAppointment, rescheduleAppointment } from '../../api/bookingApi';
import { notificationsEnabled } from '../../notifications/registration';

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
  const rescheduleAppointmentId = typeof route?.params?.rescheduleAppointmentId === 'string'
    ? route.params.rescheduleAppointmentId
    : null;
  const isRescheduling = !!rescheduleAppointmentId;

  const discount = couponDiscount;
  const finalTotal = Math.max(0, totalPrice - discount);

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

      if (rescheduleAppointmentId) {
        const changed = await rescheduleAppointment({
          appointmentId: rescheduleAppointmentId,
          date: selectedDay.key,
          time: selectedSlot.label,
        });
        const servicesLabel = selectedServices.map((service) => service.name).join(' + ');

        navigation.replace('BookingSuccess', {
          mode: 'rescheduled',
          appointmentId: changed.appointment_id,
          barber,
          selectedDay,
          selectedSlot,
          selectedServices,
          durationMin: changed.duration_minutes,
          finalTotal: totalPrice,
        });

        void (async () => {
          try {
            await cancelAppointmentReminders(changed.appointment_id);
            const at = new Date(`${selectedDay.key}T${selectedSlot.label}:00`);
            if (!Number.isNaN(at.getTime()) && await notificationsEnabled(uid)) {
              await scheduleClientAppointmentReminder({
                appointmentId: changed.appointment_id,
                at,
                barberName: barber.name,
                servicesLabel,
              });
            }
            await triggerBookingPush({
              kind: 'appointment_rescheduled',
              appointmentId: changed.appointment_id,
            });
          } catch {
            // La reprogramación ya fue confirmada; los avisos no deben bloquearla.
          }
        })();
        return;
      }

      const booking = await createAppointment({
        barberId: barber.id,
        serviceIds: selectedServices.map((service) => service.id),
        date: selectedDay.key,
        time: selectedSlot.label,
        couponCode: coupon,
      });

      const apptId = booking.appointment_id;
      const servicesLabel = selectedServices.map((s) => s.name).join(' + ');

      navigation.replace('BookingSuccess', {
        appointmentId: apptId,
        barber,
        selectedDay,
        selectedSlot,
        selectedServices,
        durationMin: booking.duration_minutes,
        finalTotal: booking.total,
        discountAmount: booking.discount,
        couponCode: coupon.trim().toUpperCase() || null,
      });

      void (async () => {
        try {
          if (apptId && selectedDay?.key && selectedSlot?.label) {
            const at = new Date(`${selectedDay.key}T${selectedSlot.label}:00`);
            if (!Number.isNaN(at.getTime()) && await notificationsEnabled(uid)) {
              await scheduleClientAppointmentReminder({
                appointmentId: apptId,
                at,
                barberName: barber.name,
                servicesLabel,
              });
            }
          }

          await triggerBookingPush({
            kind: 'reservation_created',
            appointmentId: apptId,
          });
        } catch {
          // La reserva ya fue creada; las notificaciones no deben bloquear ni duplicar el pago.
        }
      })();
    } catch (error) {
      setDialog({
        title: 'No se pudo reservar',
        message: error instanceof Error ? error.message : 'Ocurrió un error al crear la reserva.',
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
          <Text style={styles.title}>{isRescheduling ? 'Reprogramar cita' : 'Tu reserva'}</Text>
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

        {!isRescheduling ? <><View style={styles.card}>
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
        </View></> : null}

        <Text style={styles.legal}>
          {isRescheduling
            ? 'Al confirmar, la cita volverá al estado reservado para que el equipo valide el nuevo horario. Los cambios se permiten únicamente con 3 horas de anticipación.'
            : 'Puntualidad: si no te presentas, tienes hasta 10 minutos de tolerancia respecto a la hora reservada. Pasado ese tiempo la cita puede considerarse no asistida.'}
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirm} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{isRescheduling ? 'Confirmar nuevo horario' : 'Pagar ahora'}</Text>}
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

