import { supabase } from '../config/supabase';

export type AvailabilityBlock = { start: string; duration: number };
export type BarberAvailability = {
  open: boolean;
  start: string;
  end: string;
  blocked: AvailabilityBlock[];
};

export type CreateAppointmentResult = {
  appointment_id: string;
  subtotal: number;
  discount: number;
  total: number;
  duration_minutes: number;
};

export type RescheduleAppointmentResult = {
  appointment_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
};

function asMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error);
  if (/get_barber_availability|create_appointment|cancel_my_appointment|reschedule_my_appointment|schema cache|could not find/i.test(message)) {
    return 'La actualización profesional de reservas todavía no fue aplicada en Supabase.';
  }
  if (/acaba de ser reservado/i.test(message)) {
    return 'Ese horario acaba de ser reservado. Actualiza y elige otro.';
  }
  return message || 'No se pudo completar la operación.';
}

export async function getBarberAvailability(
  barberId: string,
  date: string,
  excludeAppointmentId?: string | null
): Promise<BarberAvailability> {
  const functionName = excludeAppointmentId ? 'get_barber_availability_v2' : 'get_barber_availability';
  const params = excludeAppointmentId
    ? {
        p_barber_id: barberId,
        p_date: date,
        p_exclude_appointment_id: excludeAppointmentId,
      }
    : {
        p_barber_id: barberId,
        p_date: date,
      };
  const { data, error } = await supabase.rpc(functionName, params);
  if (error) throw new Error(asMessage(error));

  const raw = (data ?? {}) as Partial<BarberAvailability>;
  return {
    open: raw.open === true,
    start: typeof raw.start === 'string' ? raw.start : '',
    end: typeof raw.end === 'string' ? raw.end : '',
    blocked: Array.isArray(raw.blocked)
      ? raw.blocked
          .map((item) => ({ start: String(item?.start ?? ''), duration: Number(item?.duration ?? 30) }))
          .filter((item) => /^\d{2}:\d{2}$/.test(item.start) && Number.isFinite(item.duration) && item.duration > 0)
      : [],
  };
}

export async function cancelAppointment(appointmentId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_my_appointment', {
    p_appointment_id: appointmentId,
  });
  if (error) throw new Error(asMessage(error));
}

export async function rescheduleAppointment(params: {
  appointmentId: string;
  date: string;
  time: string;
}): Promise<RescheduleAppointmentResult> {
  const { data, error } = await supabase.rpc('reschedule_my_appointment', {
    p_appointment_id: params.appointmentId,
    p_date: params.date,
    p_time: params.time,
  });
  if (error) throw new Error(asMessage(error));

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.appointment_id) throw new Error('Supabase no confirmó la reprogramación.');
  return {
    appointment_id: String(row.appointment_id),
    appointment_date: String(row.appointment_date ?? params.date),
    appointment_time: String(row.appointment_time ?? params.time).slice(0, 5),
    duration_minutes: Number(row.duration_minutes ?? 0),
  };
}

export async function createAppointment(params: {
  barberId: string;
  serviceIds: string[];
  date: string;
  time: string;
  couponCode?: string | null;
}): Promise<CreateAppointmentResult> {
  const { data, error } = await supabase.rpc('create_appointment', {
    p_barber_id: params.barberId,
    p_service_ids: params.serviceIds,
    p_date: params.date,
    p_time: params.time,
    p_coupon_code: params.couponCode?.trim() || null,
  });
  if (error) throw new Error(asMessage(error));

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.appointment_id) throw new Error('Supabase no devolvió la reserva creada.');
  return {
    appointment_id: String(row.appointment_id),
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    total: Number(row.total ?? 0),
    duration_minutes: Number(row.duration_minutes ?? 0),
  };
}
