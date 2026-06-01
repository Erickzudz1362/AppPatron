-- Ejecutar en Supabase SQL Editor.
-- Devuelve reservas con nombre/celular del cliente sin depender de RLS de profiles.

create or replace function public.get_staff_booking_details(
  p_date text default null,
  p_status text default null,
  p_barber_id uuid default null
)
returns table (
  id uuid,
  client_id uuid,
  barber_id uuid,
  date date,
  time time,
  status text,
  notes text,
  total_price_snapshot numeric,
  client_name text,
  client_phone text,
  client_visit_count integer,
  barber_name text
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
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select b.id into v_barber_id
  from public.barbers b
  where b.user_id = v_uid
  limit 1;

  if not v_is_admin and v_barber_id is null then
    raise exception 'Sin permisos';
  end if;

  return query
  select
    a.id,
    a.client_id,
    a.barber_id,
    a.date,
    a.time,
    a.status,
    a.notes,
    a.total_price_snapshot,
    coalesce(nullif(trim(cp.name), ''), split_part(cu.email, '@', 1), 'Cliente') as client_name,
    cp.phone as client_phone,
    coalesce(cp.visit_count, 0) as client_visit_count,
    coalesce(nullif(trim(bp.name), ''), split_part(bu.email, '@', 1), 'Barbero') as barber_name
  from public.appointments a
  left join public.profiles cp on cp.id = a.client_id
  left join auth.users cu on cu.id = a.client_id
  left join public.barbers b on b.id = a.barber_id
  left join public.profiles bp on bp.id = b.user_id
  left join auth.users bu on bu.id = b.user_id
  where
    (v_is_admin or a.barber_id = v_barber_id)
    and (p_date is null or a.date = p_date::date)
    and (p_status is null or a.status = p_status)
    and (p_barber_id is null or a.barber_id = p_barber_id)
  order by a.date asc, a.time asc
  limit 200;
end;
$$;

revoke all on function public.get_staff_booking_details(text, text, uuid) from public;
grant execute on function public.get_staff_booking_details(text, text, uuid) to authenticated;
grant execute on function public.get_staff_booking_details(text, text, uuid) to service_role;
