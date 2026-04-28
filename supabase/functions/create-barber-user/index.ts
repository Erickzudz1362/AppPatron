import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CreateBarberBody = {
  email?: string;
  password?: string;
  name?: string | null;
  specialties?: string[];
  photo_url?: string | null;
  base_schedule?: Record<string, unknown> | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let createdUserId: string | null = null;

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

    if (profileErr || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo un administrador puede crear barberos.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as CreateBarberBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    const name = body.name?.trim() || null;
    const photo_url = body.photo_url?.trim() || null;
    const base_schedule = body.base_schedule && typeof body.base_schedule === 'object' ? body.base_schedule : null;
    const specialties = Array.isArray(body.specialties)
      ? body.specialties.map((item) => item.trim()).filter(Boolean)
      : [];

    if (!email) {
      return new Response(JSON.stringify({ error: 'Correo requerido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!/[A-ZÁÉÍÓÚÑ]/.test(password)) {
      return new Response(JSON.stringify({ error: 'La contraseña debe incluir al menos una letra mayúscula.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!specialties.length) {
      return new Response(JSON.stringify({ error: 'Selecciona al menos un servicio para el barbero.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? 'No se pudo crear el usuario.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = created.user.id;
    createdUserId = userId;

    const { error: profileUpsertErr } = await adminClient.from('profiles').upsert({
      id: userId,
      role: 'barber',
      name,
      photo_url,
    });

    if (profileUpsertErr) {
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: `Usuario creado, pero falló el perfil: ${profileUpsertErr.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: barberInsertErr } = await adminClient.from('barbers').insert({
      user_id: userId,
      specialties,
      active: true,
      base_schedule,
    });

    if (barberInsertErr) {
      await adminClient.from('profiles').delete().eq('id', userId);
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Usuario creado, pero falló la tabla barbers: ${barberInsertErr.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (createdUserId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && serviceRoleKey) {
          const adminClient = createClient(supabaseUrl, serviceRoleKey);
          await adminClient.from('profiles').delete().eq('id', createdUserId);
          await adminClient.auth.admin.deleteUser(createdUserId);
        }
      } catch {
        // Evita ocultar el error principal si también falla el rollback.
      }
    }

    const message = error instanceof Error ? error.message : 'Error inesperado';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
