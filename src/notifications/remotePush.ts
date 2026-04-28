import { supabase } from '../config/supabase';

type ReservationCreatedPushPayload = {
  kind: 'reservation_created';
  clientId: string;
  barberId: string;
  barberName: string;
  servicesLabel: string;
  dayLabel: string;
  slotLabel: string;
};

type ReservationStatusPushPayload = {
  kind: 'reservation_status_changed';
  clientId: string;
  barberId: string;
  status: 'confirmed' | 'completed' | 'no_show' | 'cancelled';
  statusLabel: string;
  barberName?: string;
};

type PushPayload = ReservationCreatedPushPayload | ReservationStatusPushPayload;

export async function triggerBookingPush(payload: PushPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('send-booking-push', {
    body: payload,
  });

  if (error) {
    console.warn('[remotePush]', error.message);
  }
}
