import { supabase } from '../config/supabase';

type ReservationCreatedPushPayload = {
  kind: 'reservation_created';
  appointmentId: string;
};

type ReservationStatusPushPayload = {
  kind: 'reservation_status_changed';
  appointmentId: string;
};

type ClientBookingChangePushPayload = {
  kind: 'appointment_cancelled' | 'appointment_rescheduled';
  appointmentId: string;
};

type PushPayload = ReservationCreatedPushPayload | ReservationStatusPushPayload | ClientBookingChangePushPayload;

export async function triggerBookingPush(payload: PushPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('send-booking-push', {
    body: payload,
  });

  if (error) {
    console.warn('[remotePush]', error.message);
  }
}
