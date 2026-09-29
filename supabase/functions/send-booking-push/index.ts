import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  kind: 'reservation_created' | 'reservation_status_changed' | 'appointment_cancelled' | 'appointment_rescheduled';
  appointmentId: string;
};

type AppointmentRow = {
  id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  date: string;
  time: string;
  status: string;
  notes: string | null;
};

type OutgoingMessage = { userId: string; title: string; body: string; url: string };

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json(500, { error: 'Configuración incompleta.' });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(401, { error: 'No autorizado.' });

    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) return json(401, { error: 'Sesión inválida.' });

    const body = (await req.json()) as RequestBody;
    if (!body?.appointmentId || !['reservation_created', 'reservation_status_changed', 'appointment_cancelled', 'appointment_rescheduled'].includes(body.kind)) {
      return json(400, { error: 'Solicitud inválida.' });
    }

    const { data: appointment, error: appointmentError } = await adminClient
      .from('appointments')
      .select('id, client_id, barber_id, service_id, date, time, status, notes')
      .eq('id', body.appointmentId)
      .maybeSingle();
    if (appointmentError || !appointment) return json(404, { error: 'Reserva no encontrada.' });
    const appt = appointment as AppointmentRow;

    const [{ data: callerProfile }, { data: barber }, { data: service }, { data: appointmentServices }] = await Promise.all([
      adminClient.from('profiles').select('role').eq('id', authData.user.id).maybeSingle(),
      adminClient.from('barbers').select('user_id, active').eq('id', appt.barber_id).maybeSingle(),
      adminClient.from('services').select('name').eq('id', appt.service_id).maybeSingle(),
      adminClient.from('appointment_services').select('name_snapshot').eq('appointment_id', appt.id),
    ]);

    const isAdmin = callerProfile?.role === 'admin';
    const isAssignedBarber = barber?.active === true && barber?.user_id === authData.user.id;
    const isClientBookingEvent = ['reservation_created', 'appointment_cancelled', 'appointment_rescheduled'].includes(body.kind);
    if (isClientBookingEvent && appt.client_id !== authData.user.id) {
      return json(403, { error: 'La reserva no pertenece al usuario.' });
    }
    if (body.kind === 'reservation_status_changed' && !isAdmin && !isAssignedBarber) {
      return json(403, { error: 'Sin permisos para notificar este cambio.' });
    }
    if (body.kind === 'appointment_cancelled' && appt.status !== 'cancelled') {
      return json(409, { error: 'La reserva todavía no está cancelada.' });
    }
    if (body.kind === 'appointment_rescheduled') {
      const recentThreshold = new Date(Date.now() - 10 * 60_000).toISOString();
      const { data: recentEvent } = await adminClient
        .from('appointment_events')
        .select('id')
        .eq('appointment_id', appt.id)
        .eq('actor_user_id', authData.user.id)
        .eq('event_type', 'rescheduled')
        .gte('created_at', recentThreshold)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!recentEvent) {
        return json(409, { error: 'No existe una reprogramación reciente para notificar.' });
      }
    }

    const eventVersion = body.kind === 'reservation_status_changed' || body.kind === 'appointment_cancelled'
      ? appt.status
      : body.kind === 'appointment_rescheduled'
        ? `${appt.date}:${String(appt.time).slice(0, 5)}`
        : 'created';
    const eventKey = `${body.kind}:${appt.id}:${eventVersion}`;
    const { error: eventError } = await adminClient.from('push_delivery_events').insert({
      event_key: eventKey,
      appointment_id: appt.id,
      status: 'pending',
      attempts: 1,
      updated_at: new Date().toISOString(),
    });
    if (eventError?.code === '23505') {
      const { data: previous } = await adminClient
        .from('push_delivery_events')
        .select('status, attempts, updated_at')
        .eq('event_key', eventKey)
        .maybeSingle();
      if (previous?.status === 'delivered') return json(200, { ok: true, duplicate: true, sent: 0 });
      const updatedAt = previous?.updated_at ? new Date(previous.updated_at).getTime() : 0;
      if (previous?.status === 'pending' && Date.now() - updatedAt < 120_000) {
        return json(202, { ok: true, pending: true, sent: 0 });
      }
      const { error: retryEventError } = await adminClient.from('push_delivery_events').update({
        status: 'pending',
        attempts: Number(previous?.attempts ?? 1) + 1,
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq('event_key', eventKey);
      if (retryEventError) return json(500, { error: retryEventError.message });
    } else if (eventError) {
      return json(400, { error: eventError.message });
    }

    const serviceNames = ((appointmentServices ?? []) as Array<{ name_snapshot: string }>).map((row) => row.name_snapshot);
    const servicesLabel = serviceNames.join(' + ') || service?.name || 'servicio';
    const time = String(appt.time).slice(0, 5);
    const messages: OutgoingMessage[] = [];

    if (body.kind === 'reservation_created') {
      const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin');
      messages.push({
        userId: appt.client_id,
        title: 'Reserva creada',
        body: `Tu reserva de ${servicesLabel} fue registrada para ${appt.date} a las ${time}.`,
        url: '/?screen=History',
      });
      if (barber?.user_id) messages.push({
        userId: barber.user_id,
        title: 'Nueva reserva',
        body: `${servicesLabel} · ${appt.date} a las ${time}.`,
        url: '/?screen=Bookings',
      });
      ((admins ?? []) as Array<{ id: string }>).forEach((admin) => messages.push({
        userId: admin.id,
        title: 'Nueva reserva',
        body: `${servicesLabel} · ${appt.date} a las ${time}.`,
        url: '/?screen=Bookings',
      }));
    } else if (body.kind === 'reservation_status_changed') {
      messages.push({
        userId: appt.client_id,
        title: 'Actualización de reserva',
        body: appt.status === 'completed' ? 'Tu servicio finalizó. Ya puedes dejar una reseña.' : `Tu reserva cambió a: ${appt.status}.`,
        url: '/?screen=History',
      });
    } else {
      const changedTitle = body.kind === 'appointment_cancelled' ? 'Reserva cancelada' : 'Reserva reprogramada';
      const clientBody = body.kind === 'appointment_cancelled'
        ? `Cancelaste tu reserva de ${servicesLabel}.`
        : `Tu nueva cita es el ${appt.date} a las ${time}.`;
      const staffBody = body.kind === 'appointment_cancelled'
        ? `${servicesLabel} · ${appt.date} a las ${time} fue cancelada por el cliente.`
        : `${servicesLabel} cambió al ${appt.date} a las ${time}.`;
      messages.push({ userId: appt.client_id, title: changedTitle, body: clientBody, url: '/?screen=History' });
      if (barber?.user_id) {
        messages.push({ userId: barber.user_id, title: changedTitle, body: staffBody, url: '/?screen=Bookings' });
      }
      const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin');
      ((admins ?? []) as Array<{ id: string }>).forEach((admin) => messages.push({
        userId: admin.id,
        title: changedTitle,
        body: staffBody,
        url: '/?screen=Bookings',
      }));
    }

    const messageByUser = new Map<string, OutgoingMessage>();
    messages.forEach((message) => messageByUser.set(message.userId, message));
    const uniqueMessages = Array.from(messageByUser.values());
    const targetIds = unique(uniqueMessages.map((message) => message.userId));
    const [{ data: profiles }, { data: webSubscriptions }] = await Promise.all([
      adminClient.from('profiles').select('id, push_tokens').in('id', targetIds),
      adminClient.from('web_push_subscriptions').select('user_id, endpoint, subscription').in('user_id', targetIds),
    ]);

    const profileById = new Map(((profiles ?? []) as Array<{ id: string; push_tokens: string[] | null }>).map((row) => [row.id, row]));
    const expoEntries = uniqueMessages.flatMap((message) =>
      unique(profileById.get(message.userId)?.push_tokens ?? []).map((token) => ({
        userId: message.userId,
        token,
        payload: {
          to: token,
          title: message.title,
          body: message.body,
          sound: 'default',
          priority: 'high',
          data: { kind: body.kind, appointmentId: appt.id },
        },
      }))
    );

    let expoSent = 0;
    let deliveryError: string | null = null;
    if (expoEntries.length) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expoEntries.map((entry) => entry.payload)),
      });
      if (response.ok) {
        const responseBody = await response.json().catch(() => ({})) as {
          data?: Array<{ status?: string; details?: { error?: string } }>;
        };
        const tickets = Array.isArray(responseBody.data) ? responseBody.data : [];
        expoSent = tickets.length ? tickets.filter((ticket) => ticket.status === 'ok').length : expoEntries.length;
        const invalidByUser = new Map<string, Set<string>>();
        tickets.forEach((ticket, index) => {
          if (ticket.details?.error !== 'DeviceNotRegistered') return;
          const entry = expoEntries[index];
          if (!entry) return;
          const set = invalidByUser.get(entry.userId) ?? new Set<string>();
          set.add(entry.token);
          invalidByUser.set(entry.userId, set);
        });
        await Promise.all(Array.from(invalidByUser.entries()).map(async ([userId, invalidTokens]) => {
          const current = profileById.get(userId)?.push_tokens ?? [];
          await adminClient.from('profiles').update({
            push_tokens: current.filter((token) => !invalidTokens.has(token)),
          }).eq('id', userId);
        }));
      } else {
        deliveryError = `Expo Push HTTP ${response.status}`;
      }
    }

    let webSent = 0;
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@elpatron.app';
    if (vapidPublic && vapidPrivate && webSubscriptions?.length) {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
      const results = await Promise.allSettled(
        (webSubscriptions as Array<{ user_id: string; endpoint: string; subscription: unknown }>).map(async (row) => {
          const message = messageByUser.get(row.user_id);
          if (!message) return;
          try {
            await webpush.sendNotification(row.subscription, JSON.stringify({
              title: message.title,
              body: message.body,
              data: { url: message.url, appointmentId: appt.id },
              tag: eventKey,
            }));
            webSent += 1;
          } catch (error) {
            const statusCode = Number((error as { statusCode?: number })?.statusCode ?? 0);
            if (statusCode === 404 || statusCode === 410) {
              await adminClient.from('web_push_subscriptions').delete().eq('user_id', row.user_id).eq('endpoint', row.endpoint);
            }
          }
        })
      );
      void results;
    }

    await adminClient.from('push_delivery_events').update({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      last_error: deliveryError,
      updated_at: new Date().toISOString(),
    }).eq('event_key', eventKey);

    return json(200, { ok: true, expoSent, webSent, warning: deliveryError });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Error inesperado' });
  }
});
