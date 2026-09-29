-- AppPatron professional core v1
-- Ejecutar primero en staging y luego en producción desde Supabase SQL Editor.
-- Consolida seguridad, horarios, reservas atómicas y suscripciones Web Push.

begin;

create extension if not exists pgcrypto;

alter table public.barbers
  add column if not exists photo_url text,
  add column if not exists base_schedule jsonb;

alter table public.appointments
  add column if not exists duration_minutes_snapshot integer,
  add column if not exists subtotal_price_snapshot numeric,
  add column if not exists discount_amount_snapshot numeric not null default 0,
  add column if not exists coupon_code_snapshot text;

update public.appointments a
set duration_minutes_snapshot = coalesce(a.duration_minutes_snapshot, s.duration_minutes, 30),
    subtotal_price_snapshot = coalesce(a.subtotal_price_snapshot, a.total_price_snapshot, s.price, 0)
from public.services s
where s.id = a.service_id
  and (a.duration_minutes_snapshot is null or a.subtotal_price_snapshot is null);

update public.appointments
set duration_minutes_snapshot = coalesce(duration_minutes_snapshot, 30),
    subtotal_price_snapshot = coalesce(subtotal_price_snapshot, total_price_snapshot, 0)
where duration_minutes_snapshot is null or subtotal_price_snapshot is null;

alter table public.appointments
  alter column duration_minutes_snapshot set default 30;

create index if not exists idx_appointments_barber_day_status
  on public.appointments (barber_id, date, status, time);

create table if not exists public.appointment_services (
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id),
  name_snapshot text not null,
  duration_minutes_snapshot integer not null check (duration_minutes_snapshot > 0),
  price_snapshot numeric not null check (price_snapshot >= 0),
  primary key (appointment_id, service_id)
);

alter table public.appointment_services enable row level security;

drop policy if exists "appointment_services_select_context" on public.appointment_services;
create policy "appointment_services_select_context"
  on public.appointment_services for select to authenticated
  using (
    exists (
      select 1
      from public.appointments a
      left join public.barbers b on b.id = a.barber_id
      where a.id = appointment_services.appointment_id
        and (a.client_id = auth.uid() or b.user_id = auth.uid() or public.is_admin())
    )
  );

-- Evita que un cliente cambie role/status aunque actualice su propio perfil.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'No puedes modificar el rol o estado de tu cuenta';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileged_columns on public.profiles;
create trigger trg_guard_profile_privileged_columns
before update on public.profiles
for each row execute function public.guard_profile_privileged_columns();

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Los clientes dejan de insertar/editar reservas directamente. Las mutaciones
-- pasan por funciones transaccionales SECURITY DEFINER.
drop policy if exists "appointments_insert_client" on public.appointments;
drop policy if exists "appointments_update" on public.appointments;
drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select" on public.appointments
  for select to authenticated
  using (
    client_id = auth.uid()
    or exists (
      select 1 from public.barbers b
      where b.id = appointments.barber_id and b.user_id = auth.uid() and b.active = true
    )
    or public.is_admin()
  );

create or replace function public.deactivate_barber(p_barber_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid;
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  update public.barbers set active = false where id = p_barber_id returning user_id into v_user_id;
  if v_user_id is null then raise exception 'Barbero no encontrado'; end if;
  update public.profiles set role = 'client' where id = v_user_id;
end;
$$;
revoke all on function public.deactivate_barber(uuid) from public;
grant execute on function public.deactivate_barber(uuid) to authenticated;

create or replace function public.get_staff_booking_details(
  p_date text default null,
  p_status text default null,
  p_barber_id uuid default null
)
returns table (
  id uuid, client_id uuid, barber_id uuid, "date" date, "time" time without time zone,
  status text, notes text, total_price_snapshot numeric, client_name text,
  client_phone text, client_visit_count integer, barber_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_barber_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select b.id into v_barber_id from public.barbers b
  where b.user_id = v_uid and b.active = true limit 1;
  if not v_is_admin and v_barber_id is null then raise exception 'Sin permisos'; end if;

  return query
  select a.id, a.client_id, a.barber_id, a.date, a.time, a.status, a.notes,
    a.total_price_snapshot,
    coalesce(nullif(trim(cp.name), ''), split_part(cu.email, '@', 1), 'Cliente'),
    cp.phone, coalesce(cp.visit_count, 0),
    coalesce(nullif(trim(bp.name), ''), split_part(bu.email, '@', 1), 'Barbero')
  from public.appointments a
  left join public.profiles cp on cp.id = a.client_id
  left join auth.users cu on cu.id = a.client_id
  left join public.barbers b on b.id = a.barber_id
  left join public.profiles bp on bp.id = b.user_id
  left join auth.users bu on bu.id = b.user_id
  where (v_is_admin or a.barber_id = v_barber_id)
    and (p_date is null or a.date = p_date::date)
    and (p_status is null or a.status = p_status)
    and (p_barber_id is null or a.barber_id = p_barber_id)
  order by a.date asc, a.time asc
  limit 200;
end;
$$;
revoke all on function public.get_staff_booking_details(text, text, uuid) from public;
grant execute on function public.get_staff_booking_details(text, text, uuid) to authenticated;

create or replace function public.get_barber_availability(
  p_barber_id uuid,
  p_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_schedule jsonb;
  v_day_key text;
  v_day jsonb;
  v_blocked jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(b.base_schedule, '{}'::jsonb)
  into v_schedule
  from public.barbers b
  where b.id = p_barber_id and b.active = true;

  if not found then
    raise exception 'Barbero no disponible';
  end if;

  v_day_key := (array['mon','tue','wed','thu','fri','sat','sun'])[extract(isodow from p_date)::int];
  v_day := v_schedule -> v_day_key;

  -- Compatibilidad con barberos antiguos sin horario configurado.
  if v_schedule = '{}'::jsonb then
    v_day := case
      when extract(isodow from p_date)::int = 7 then null
      when extract(isodow from p_date)::int = 6 then jsonb_build_object('start', '10:00', 'end', '14:00')
      else jsonb_build_object('start', '10:00', 'end', '20:30')
    end;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'start', to_char(a.time, 'HH24:MI'),
        'duration', coalesce(a.duration_minutes_snapshot, s.duration_minutes, 30)
      ) order by a.time
    ),
    '[]'::jsonb
  )
  into v_blocked
  from public.appointments a
  left join public.services s on s.id = a.service_id
  where a.barber_id = p_barber_id
    and a.date = p_date
    and a.status in ('pending', 'confirmed');

  return jsonb_build_object(
    'open', v_day is not null,
    'start', coalesce(v_day ->> 'start', ''),
    'end', coalesce(v_day ->> 'end', ''),
    'blocked', v_blocked
  );
end;
$$;

revoke all on function public.get_barber_availability(uuid, date) from public;
grant execute on function public.get_barber_availability(uuid, date) to authenticated;

create or replace function public.get_public_barber_directory()
returns table (
  id uuid,
  name text,
  photo_url text,
  specialties text[],
  active boolean,
  rating numeric,
  rating_count bigint,
  base_schedule jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    b.id,
    coalesce(nullif(trim(p.name), ''), 'Barbero'),
    coalesce(nullif(trim(p.photo_url), ''), nullif(trim(b.photo_url), '')),
    coalesce(b.specialties, array[]::text[]),
    coalesce(b.active, true),
    coalesce(round(avg(r.rating)::numeric, 1), 0),
    count(r.id),
    coalesce(b.base_schedule, '{}'::jsonb)
  from public.barbers b
  left join public.profiles p on p.id = b.user_id
  left join public.barber_reviews r on r.barber_id = b.id
  where b.active = true
  group by b.id, p.name, p.photo_url, b.photo_url, b.specialties, b.active, b.base_schedule
  order by coalesce(nullif(trim(p.name), ''), 'Barbero');
$$;

revoke all on function public.get_public_barber_directory() from public;
grant execute on function public.get_public_barber_directory() to authenticated;

create or replace function public.get_admin_barber_management()
returns table (
  id uuid,
  user_id uuid,
  profile_name text,
  profile_photo_url text,
  specialties text[],
  active boolean,
  base_schedule jsonb
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  return query
  select b.id, b.user_id, p.name, coalesce(p.photo_url, b.photo_url),
         coalesce(b.specialties, array[]::text[]), coalesce(b.active, true), coalesce(b.base_schedule, '{}'::jsonb)
  from public.barbers b
  left join public.profiles p on p.id = b.user_id
  order by p.name nulls last, b.id;
end;
$$;

revoke all on function public.get_admin_barber_management() from public;
grant execute on function public.get_admin_barber_management() to authenticated;

create or replace function public.get_client_history(p_limit integer default 50)
returns table (
  id uuid,
  service text,
  barber text,
  barber_id uuid,
  "date" date,
  "time" time without time zone,
  status text,
  notes text,
  total numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select a.id,
    coalesce(
      (select string_agg(x.name_snapshot, ' + ' order by x.name_snapshot)
       from public.appointment_services x where x.appointment_id = a.id),
      s.name,
      'Servicio'
    ),
    coalesce(nullif(trim(bp.name), ''), 'Barbero'),
    a.barber_id, a.date, a.time, a.status, a.notes, a.total_price_snapshot
  from public.appointments a
  left join public.services s on s.id = a.service_id
  left join public.barbers b on b.id = a.barber_id
  left join public.profiles bp on bp.id = b.user_id
  where a.client_id = auth.uid()
  order by a.date desc, a.time desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;
revoke all on function public.get_client_history(integer) from public;
grant execute on function public.get_client_history(integer) to authenticated;

create or replace function public.create_appointment(
  p_barber_id uuid,
  p_service_ids uuid[],
  p_date date,
  p_time time,
  p_coupon_code text default null
)
returns table (
  appointment_id uuid,
  subtotal numeric,
  discount numeric,
  total numeric,
  duration_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
  v_duration integer;
  v_subtotal numeric;
  v_discount numeric := 0;
  v_total numeric;
  v_coupon text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  v_discount_percent integer := 0;
  v_min_hours numeric := 3;
  v_schedule jsonb;
  v_day jsonb;
  v_day_key text;
  v_start time;
  v_end time;
  v_appointment_id uuid;
  v_barber_user_id uuid;
  v_services_label text;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
  if p_date is null or p_time is null then raise exception 'Fecha y hora requeridas'; end if;
  if coalesce(array_length(p_service_ids, 1), 0) = 0 then raise exception 'Selecciona al menos un servicio'; end if;

  -- Serializa todas las reservas del mismo barbero/día y evita carreras.
  perform pg_advisory_xact_lock(hashtextextended(p_barber_id::text || ':' || p_date::text, 0));

  select b.user_id, coalesce(b.base_schedule, '{}'::jsonb)
  into v_barber_user_id, v_schedule
  from public.barbers b
  where b.id = p_barber_id and b.active = true
  for update;
  if not found then raise exception 'Barbero no disponible'; end if;

  select count(*), coalesce(sum(s.duration_minutes), 0), coalesce(sum(s.price), 0), string_agg(s.name, ' + ' order by s.name)
  into v_count, v_duration, v_subtotal, v_services_label
  from public.services s
  where s.id = any(p_service_ids) and s.active = true;

  if v_count <> cardinality(p_service_ids) then raise exception 'Uno de los servicios ya no está disponible'; end if;
  if v_duration <= 0 then raise exception 'Duración de servicios inválida'; end if;

  select coalesce(nullif(value, '')::numeric, 3)
  into v_min_hours
  from public.app_settings where key = 'min_reservation_hours';
  v_min_hours := coalesce(v_min_hours, 3);

  if (p_date + p_time) < ((now() at time zone 'America/La_Paz') + make_interval(hours => v_min_hours::int)) then
    raise exception 'La reserva no cumple las horas mínimas de anticipación';
  end if;

  v_day_key := (array['mon','tue','wed','thu','fri','sat','sun'])[extract(isodow from p_date)::int];
  v_day := v_schedule -> v_day_key;
  if v_schedule = '{}'::jsonb then
    v_day := case
      when extract(isodow from p_date)::int = 7 then null
      when extract(isodow from p_date)::int = 6 then jsonb_build_object('start', '10:00', 'end', '14:00')
      else jsonb_build_object('start', '10:00', 'end', '20:30')
    end;
  end if;
  if v_day is null then raise exception 'El barbero no trabaja ese día'; end if;

  v_start := (v_day ->> 'start')::time;
  v_end := (v_day ->> 'end')::time;
  if p_time < v_start or p_time + make_interval(mins => v_duration) > v_end then
    raise exception 'El horario está fuera de la jornada del barbero';
  end if;

  if exists (
    select 1 from public.appointments a
    left join public.services s on s.id = a.service_id
    where a.barber_id = p_barber_id
      and a.date = p_date
      and a.status in ('pending', 'confirmed')
      and p_time < a.time + make_interval(mins => coalesce(a.duration_minutes_snapshot, s.duration_minutes, 30))
      and p_time + make_interval(mins => v_duration) > a.time
  ) then
    raise exception 'Ese horario acaba de ser reservado';
  end if;

  if v_coupon is not null then
    select c.discount_percent into v_discount_percent
    from public.coupons c where upper(c.code) = v_coupon and c.active = true;
    if not found then raise exception 'Cupón no válido o inactivo'; end if;
    v_discount := round(v_subtotal * v_discount_percent / 100.0);
  end if;
  v_total := greatest(0, v_subtotal - v_discount);

  insert into public.appointments (
    client_id, barber_id, service_id, date, time, status, notes,
    total_price_snapshot, subtotal_price_snapshot, discount_amount_snapshot,
    coupon_code_snapshot, duration_minutes_snapshot
  ) values (
    v_uid, p_barber_id, p_service_ids[1], p_date, p_time, 'pending',
    case when cardinality(p_service_ids) > 1 then 'Servicios: ' || v_services_label else null end,
    v_total, v_subtotal, v_discount, v_coupon, v_duration
  ) returning id into v_appointment_id;

  insert into public.appointment_services (
    appointment_id, service_id, name_snapshot, duration_minutes_snapshot, price_snapshot
  )
  select v_appointment_id, s.id, s.name, s.duration_minutes, s.price
  from public.services s where s.id = any(p_service_ids);

  insert into public.notifications(type, title, message, target_user_id, is_active)
  values ('sistema', 'Reserva creada', 'Tu reserva de ' || v_services_label || ' fue registrada.', v_uid, true);

  if v_barber_user_id is not null then
    insert into public.notifications(type, title, message, target_user_id, is_active)
    values ('sistema', 'Nueva reserva', 'Tienes una nueva reserva de ' || v_services_label || '.', v_barber_user_id, true);
  end if;

  return query select v_appointment_id, v_subtotal, v_discount, v_total, v_duration;
end;
$$;

revoke all on function public.create_appointment(uuid, uuid[], date, time, text) from public;
grant execute on function public.create_appointment(uuid, uuid[], date, time, text) to authenticated;

create or replace function public.update_appointment_status(
  p_appointment_id uuid,
  p_new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.appointments%rowtype;
  v_is_assigned_barber boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_new_status not in ('confirmed', 'completed', 'no_show', 'cancelled') then raise exception 'Estado inválido'; end if;

  select * into v_row from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'Reserva no encontrada'; end if;

  select exists(select 1 from public.barbers b where b.id = v_row.barber_id and b.user_id = v_uid)
  into v_is_assigned_barber;
  if not public.is_admin() and not v_is_assigned_barber then raise exception 'Sin permisos'; end if;

  if v_row.status in ('completed', 'cancelled', 'no_show') then raise exception 'La reserva ya está cerrada'; end if;

  update public.appointments set status = p_new_status, updated_at = now() where id = p_appointment_id;
  if p_new_status = 'completed' and v_row.status <> 'completed' then
    update public.profiles set visit_count = coalesce(visit_count, 0) + 1 where id = v_row.client_id;
  end if;

  insert into public.notifications(type, title, message, target_user_id, is_active)
  values (
    'sistema', 'Actualización de reserva',
    case when p_new_status = 'completed' then 'Tu servicio finalizó. Ya puedes dejar una reseña.'
         else 'Tu reserva cambió a: ' || p_new_status end,
    v_row.client_id, true
  );
end;
$$;

revoke all on function public.update_appointment_status(uuid, text) from public;
grant execute on function public.update_appointment_status(uuid, text) to authenticated;

-- Solo admin puede crear avisos desde el cliente. Las funciones SECURITY DEFINER
-- crean las notificaciones transaccionales del sistema.
drop policy if exists "notifications_insert_targeted_system" on public.notifications;

drop policy if exists "settings_select_authenticated" on public.app_settings;
create policy "settings_select_authenticated" on public.app_settings
  for select to authenticated using (true);

drop policy if exists "coupons_select_active" on public.coupons;
create policy "coupons_select_active" on public.coupons
  for select to authenticated using (active = true);

-- Una reseña debe corresponder a una cita finalizada del propio cliente y barbero.
drop policy if exists "barber_reviews_insert_own" on public.barber_reviews;
create policy "barber_reviews_insert_own_completed"
  on public.barber_reviews for insert to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and a.client_id = auth.uid()
        and a.barber_id = barber_id
        and a.status = 'completed'
    )
  );

create table if not exists public.web_push_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

alter table public.web_push_subscriptions enable row level security;
drop policy if exists "web_push_own_all" on public.web_push_subscriptions;
create policy "web_push_own_all" on public.web_push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.push_delivery_events (
  event_key text primary key,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.push_delivery_events enable row level security;

-- Protege fotos: usuario normal solo su archivo profiles/<uid>.*, admin cualquier foto.
drop policy if exists "barber_photos_authenticated_insert" on storage.objects;
drop policy if exists "barber_photos_authenticated_update" on storage.objects;
create policy "barber_photos_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'barber-photos'
    and (public.is_admin() or name like ('profiles/' || auth.uid()::text || '.%'))
  );
create policy "barber_photos_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'barber-photos'
    and (public.is_admin() or owner = auth.uid())
  )
  with check (
    bucket_id = 'barber-photos'
    and (public.is_admin() or owner = auth.uid())
  );

commit;
