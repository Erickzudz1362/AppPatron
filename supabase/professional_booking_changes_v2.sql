-- AppPatron professional booking changes v2
-- Requiere professional_core_v1.sql.
-- Agrega cancelacion y reprogramacion atomicas con 3 horas de anticipacion.
-- No agrega tiempo de limpieza: la ocupacion es la suma exacta de los servicios.

begin;

insert into public.app_settings(key, value)
values ('appointment_change_min_hours', '3')
on conflict (key) do nothing;

create table if not exists public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'status_changed', 'rescheduled')),
  previous_status text,
  next_status text,
  previous_date date,
  next_date date,
  previous_time time without time zone,
  next_time time without time zone,
  created_at timestamptz not null default now()
);

create index if not exists idx_appointment_events_appointment_created
  on public.appointment_events(appointment_id, created_at desc);

alter table public.appointment_events enable row level security;

drop policy if exists "appointment_events_select_context" on public.appointment_events;
create policy "appointment_events_select_context"
  on public.appointment_events for select to authenticated
  using (
    exists (
      select 1
      from public.appointments a
      left join public.barbers b on b.id = a.barber_id
      where a.id = appointment_events.appointment_id
        and (a.client_id = auth.uid() or b.user_id = auth.uid() or public.is_admin())
    )
  );

create or replace function public.audit_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_events(
      appointment_id, actor_user_id, event_type, next_status, next_date, next_time
    ) values (
      new.id, auth.uid(), 'created', new.status, new.date, new.time
    );
    return new;
  end if;

  if new.date is distinct from old.date or new.time is distinct from old.time then
    insert into public.appointment_events(
      appointment_id, actor_user_id, event_type,
      previous_status, next_status, previous_date, next_date, previous_time, next_time
    ) values (
      new.id, auth.uid(), 'rescheduled',
      old.status, new.status, old.date, new.date, old.time, new.time
    );
  elsif new.status is distinct from old.status then
    insert into public.appointment_events(
      appointment_id, actor_user_id, event_type,
      previous_status, next_status, previous_date, next_date, previous_time, next_time
    ) values (
      new.id, auth.uid(), 'status_changed',
      old.status, new.status, old.date, new.date, old.time, new.time
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_appointment_change on public.appointments;
create trigger trg_audit_appointment_change
after insert or update of status, date, time on public.appointments
for each row execute function public.audit_appointment_change();

create or replace function public.appointment_change_min_hours()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select case
        when trim(value) ~ '^[0-9]+$' then greatest(3, least(trim(value)::integer, 72))
        else null
      end
      from public.app_settings
      where key = 'appointment_change_min_hours'
      limit 1
    ),
    3
  );
$$;

revoke all on function public.appointment_change_min_hours() from public;
grant execute on function public.appointment_change_min_hours() to authenticated;

create or replace function public.get_client_history_v2(p_limit integer default 50)
returns table (
  id uuid,
  service text,
  service_ids uuid[],
  barber text,
  barber_id uuid,
  "date" date,
  "time" time without time zone,
  status text,
  notes text,
  total numeric,
  duration_minutes integer,
  modify_min_hours integer,
  can_modify boolean,
  modify_deadline timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id,
    coalesce(
      (select string_agg(x.name_snapshot, ' + ' order by x.name_snapshot)
       from public.appointment_services x where x.appointment_id = a.id),
      s.name,
      'Servicio'
    ),
    coalesce(
      (select array_agg(x.service_id order by x.name_snapshot)
       from public.appointment_services x where x.appointment_id = a.id),
      array[a.service_id]::uuid[]
    ),
    coalesce(nullif(trim(bp.name), ''), 'Barbero'),
    a.barber_id,
    a.date,
    a.time,
    a.status,
    a.notes,
    a.total_price_snapshot,
    coalesce(a.duration_minutes_snapshot, s.duration_minutes, 30),
    public.appointment_change_min_hours(),
    (
      a.status in ('pending', 'confirmed')
      and (a.date + a.time) >= (
        (now() at time zone 'America/La_Paz')
        + make_interval(hours => public.appointment_change_min_hours())
      )
    ),
    ((a.date + a.time) at time zone 'America/La_Paz')
      - make_interval(hours => public.appointment_change_min_hours())
  from public.appointments a
  left join public.services s on s.id = a.service_id
  left join public.barbers b on b.id = a.barber_id
  left join public.profiles bp on bp.id = b.user_id
  where a.client_id = auth.uid()
  order by a.date desc, a.time desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.get_client_history_v2(integer) from public;
grant execute on function public.get_client_history_v2(integer) to authenticated;

create or replace function public.get_barber_availability_v2(
  p_barber_id uuid,
  p_date date,
  p_exclude_appointment_id uuid default null
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
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;

  if p_exclude_appointment_id is not null and not exists (
    select 1 from public.appointments a
    where a.id = p_exclude_appointment_id and a.client_id = auth.uid()
  ) then
    raise exception 'No puedes modificar esta reserva';
  end if;

  select coalesce(b.base_schedule, '{}'::jsonb)
  into v_schedule
  from public.barbers b
  where b.id = p_barber_id and b.active = true;
  if not found then raise exception 'Barbero no disponible'; end if;

  v_day_key := (array['mon','tue','wed','thu','fri','sat','sun'])[extract(isodow from p_date)::int];
  v_day := v_schedule -> v_day_key;
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
    and a.status in ('pending', 'confirmed')
    and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id);

  return jsonb_build_object(
    'open', v_day is not null,
    'start', coalesce(v_day ->> 'start', ''),
    'end', coalesce(v_day ->> 'end', ''),
    'blocked', v_blocked
  );
end;
$$;

revoke all on function public.get_barber_availability_v2(uuid, date, uuid) from public;
grant execute on function public.get_barber_availability_v2(uuid, date, uuid) to authenticated;

create or replace function public.cancel_my_appointment(p_appointment_id uuid)
returns table (
  appointment_id uuid,
  barber_user_id uuid,
  appointment_date date,
  appointment_time time without time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.appointments%rowtype;
  v_barber_user_id uuid;
  v_min_hours integer := public.appointment_change_min_hours();
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;

  select * into v_row
  from public.appointments
  where id = p_appointment_id and client_id = v_uid
  for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  if v_row.status not in ('pending', 'confirmed') then
    raise exception 'Esta reserva ya no puede cancelarse';
  end if;
  if (v_row.date + v_row.time) < (
    (now() at time zone 'America/La_Paz') + make_interval(hours => v_min_hours)
  ) then
    raise exception 'Solo puedes cancelar con al menos % horas de anticipación', v_min_hours;
  end if;

  select b.user_id into v_barber_user_id
  from public.barbers b where b.id = v_row.barber_id;

  update public.appointments
  set status = 'cancelled', updated_at = now()
  where id = v_row.id;

  insert into public.notifications(type, title, message, target_user_id, is_active)
  values ('sistema', 'Reserva cancelada', 'Tu reserva fue cancelada correctamente.', v_uid, true);

  if v_barber_user_id is not null then
    insert into public.notifications(type, title, message, target_user_id, is_active)
    values (
      'sistema', 'Reserva cancelada por el cliente',
      'La cita del ' || to_char(v_row.date, 'DD/MM/YYYY') || ' a las ' || to_char(v_row.time, 'HH24:MI') || ' fue cancelada.',
      v_barber_user_id, true
    );
  end if;

  return query select v_row.id, v_barber_user_id, v_row.date, v_row.time;
end;
$$;

revoke all on function public.cancel_my_appointment(uuid) from public;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;

create or replace function public.reschedule_my_appointment(
  p_appointment_id uuid,
  p_date date,
  p_time time without time zone
)
returns table (
  appointment_id uuid,
  appointment_date date,
  appointment_time time without time zone,
  duration_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.appointments%rowtype;
  v_duration integer;
  v_schedule jsonb;
  v_day_key text;
  v_day jsonb;
  v_start time;
  v_end time;
  v_min_hours integer := public.appointment_change_min_hours();
  v_barber_user_id uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
  if p_date is null or p_time is null then raise exception 'Fecha y hora requeridas'; end if;

  select * into v_row
  from public.appointments
  where id = p_appointment_id and client_id = v_uid
  for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  if v_row.status not in ('pending', 'confirmed') then
    raise exception 'Esta reserva ya no puede reprogramarse';
  end if;
  if (v_row.date + v_row.time) < (
    (now() at time zone 'America/La_Paz') + make_interval(hours => v_min_hours)
  ) then
    raise exception 'Solo puedes reprogramar con al menos % horas de anticipación', v_min_hours;
  end if;
  if (p_date + p_time) < (
    (now() at time zone 'America/La_Paz') + make_interval(hours => v_min_hours)
  ) then
    raise exception 'El nuevo horario debe tener al menos % horas de anticipación', v_min_hours;
  end if;
  if p_date = v_row.date and p_time = v_row.time then
    raise exception 'Selecciona un horario diferente';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_row.barber_id::text || ':' || p_date::text, 0));

  select b.user_id, coalesce(b.base_schedule, '{}'::jsonb)
  into v_barber_user_id, v_schedule
  from public.barbers b
  where b.id = v_row.barber_id and b.active = true
  for update;
  if not found then raise exception 'Barbero no disponible'; end if;

  v_duration := coalesce(v_row.duration_minutes_snapshot, 30);
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
    select 1
    from public.appointments a
    left join public.services s on s.id = a.service_id
    where a.id <> v_row.id
      and a.barber_id = v_row.barber_id
      and a.date = p_date
      and a.status in ('pending', 'confirmed')
      and p_time < a.time + make_interval(mins => coalesce(a.duration_minutes_snapshot, s.duration_minutes, 30))
      and p_time + make_interval(mins => v_duration) > a.time
  ) then
    raise exception 'Ese horario acaba de ser reservado';
  end if;

  update public.appointments
  set date = p_date, time = p_time, status = 'pending', updated_at = now()
  where id = v_row.id;

  insert into public.notifications(type, title, message, target_user_id, is_active)
  values (
    'sistema', 'Reserva reprogramada',
    'Tu nueva cita es el ' || to_char(p_date, 'DD/MM/YYYY') || ' a las ' || to_char(p_time, 'HH24:MI') || '.',
    v_uid, true
  );

  if v_barber_user_id is not null then
    insert into public.notifications(type, title, message, target_user_id, is_active)
    values (
      'sistema', 'Reserva reprogramada',
      'Una cita cambió al ' || to_char(p_date, 'DD/MM/YYYY') || ' a las ' || to_char(p_time, 'HH24:MI') || '.',
      v_barber_user_id, true
    );
  end if;

  return query select v_row.id, p_date, p_time, v_duration;
end;
$$;

revoke all on function public.reschedule_my_appointment(uuid, date, time without time zone) from public;
grant execute on function public.reschedule_my_appointment(uuid, date, time without time zone) to authenticated;

alter table public.push_delivery_events
  add column if not exists status text not null default 'pending',
  add column if not exists attempts integer not null default 1,
  add column if not exists last_error text,
  add column if not exists delivered_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

commit;
