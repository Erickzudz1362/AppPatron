import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReservationCreatedBody = {
  kind: 'reservation_created';
  clientId: string;
  barberId: string;
  barberName: string;
  servicesLabel: string;
  dayLabel: string;
  slotLabel: string;
};

type ReservationStatusBody = {
  kind: 'reservation_status_changed';
  clientId: string;
  barberId: string;
  status: 'confirmed' | 'completed' | 'no_show' | 'cancelled';
  statusLabel: string;
  barberName?: string;
};

type RequestBody = ReservationCreatedBody | ReservationStatusBody;

type ProfilePushRow = {
  id: string;
  push_tokens: string[] | null;
  role: string | null;
};

function normalizeTokens(tokens: string[] | null | undefined): string[] {
  return Array.from(new Set((tokens ?? []).map((token) => token?.trim()).filter(Boolean)));
}

function buildMessages(body: RequestBody, barberUserId: string | null, adminIds: string[]) {
  if (body.kind === 'reservation_created') {
    const shared = `${body.servicesLabel} · ${body.dayLabel} a las ${body.slotLabel}`;
    return [
      {
        userId: body.clientId,
        title: 'Reserva creada',
        body: `Tu reserva con ${body.barberName} fue registrada para ${shared}.`,
      },
      ...(barberUserId
        ? [
            {
              userId: barberUserId,
              title: 'Nueva reserva',
              body: `Tienes una nueva reserva de ${body.servicesLabel} para ${body.dayLabel} a las ${body.slotLabel}.`,
            },
          ]
        : []),
      ...adminIds.map((adminId) => ({
        userId: adminId,
        title: 'Nueva reserva',
        body: `Se registró una nueva reserva con ${body.barberName} para ${body.dayLabel} a las ${body.slotLabel}.`,
      })),
    ];
  }

  const statusBody =
    body.status === 'completed'
      ? 'Tu corte finalizó. Entra a la app y deja tu reseña del barbero.'
      : `Tu reserva cambió a: ${body.statusLabel}.`;

  return [
    {
      userId: body.clientId,
      title: 'Actualización de reserva',
      body: statusBody,
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Faltan variables de entorno del proyecto.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userErr,
    } = await callerClient.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: userErr?.message ?? 'No autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile, error: profileErr } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !callerProfile?.role) {
      return new Response(JSON.stringify({ error: 'No se pudo validar el usuario.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as RequestBody;

    const { data: barberRow } = await adminClient.from('barbers').select('id, user_id').eq('id', body.barberId).maybeSingle();
    const barberUserId = barberRow?.user_id ?? null;
    const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin');
    const adminIds = ((admins ?? []) as { id: string }[]).map((row) => row.id);

    if (body.kind === 'reservation_status_changed' && !['admin', 'barber'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Solo admin o barbero pueden enviar este aviso.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messageRows = buildMessages(body, barberUserId, adminIds);
    const targetIds = Array.from(new Set(messageRows.map((row) => row.userId).filter(Boolean)));
    if (!targetIds.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: recipients, error: recipientsErr } = await adminClient
      .from('profiles')
      .select('id, push_tokens, role')
      .in('id', targetIds);

    if (recipientsErr) {
      return new Response(JSON.stringify({ error: recipientsErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recipientById = new Map<string, ProfilePushRow>();
    ((recipients ?? []) as ProfilePushRow[]).forEach((row) => recipientById.set(row.id, row));

    const expoMessages = messageRows.flatMap((message) => {
      const recipient = recipientById.get(message.userId);
      const tokens = normalizeTokens(recipient?.push_tokens);
      return tokens.map((token) => ({
        to: token,
        title: message.title,
        body: message.body,
        sound: 'default',
        priority: 'high',
        data: {
          kind: body.kind,
          targetUserId: message.userId,
          status: body.kind === 'reservation_status_changed' ? body.status : undefined,
        },
      }));
    });

    if (!expoMessages.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expoMessages),
    });

    if (!expoResponse.ok) {
      const expoText = await expoResponse.text();
      return new Response(JSON.stringify({ error: `Expo push error: ${expoText}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, sent: expoMessages.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
