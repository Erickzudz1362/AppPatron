-- Ejecutar en Supabase SQL Editor (una vez).
-- Visitas, reseñas, estados de cita, foto de barbero.

-- Contador de visitas completadas (la app lo incrementa al finalizar / ajusta en no_show).
alter table public.profiles
  add column if not exists visit_count integer not null default 0;

-- Foto pública del barbero (URL en Storage o externa).
alter table public.barbers
  add column if not exists photo_url text;

-- Estado "no se presentó" (y otros si ya existían).
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments
  add constraint appointments_status_check
  check (status in ('pending', 'confirmed', 'finished', 'no_show', 'cancelled'));

-- Reseñas tras servicio finalizado (una por cita y cliente).
create table if not exists public.barber_reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  barber_id uuid not null references public.barbers (id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (appointment_id, client_id)
);

create index if not exists idx_barber_reviews_barber_id on public.barber_reviews (barber_id);

alter table public.barber_reviews enable row level security;

drop policy if exists "barber_reviews_select_all" on public.barber_reviews;
create policy "barber_reviews_select_all"
  on public.barber_reviews for select
  using (true);

drop policy if exists "barber_reviews_insert_own" on public.barber_reviews;
create policy "barber_reviews_insert_own"
  on public.barber_reviews for insert
  with check (auth.uid() = client_id);

-- Cuentas inactivas 180 días sin ninguna reserva:
-- No se borra auth.users desde SQL de forma segura en todos los proyectos.
-- Opciones: (1) Edge Function con service_role que liste clientes sin citas en 180d y llame Admin API,
-- (2) pg_cron + función solo si tu equipo revisa impacto y backups.
-- Vista útil para el panel web:
create or replace view public.inactive_client_candidates as
select p.id, p.name, p.phone, max(a.created_at) as last_appointment_at
from public.profiles p
left join public.appointments a on a.client_id = p.id
where p.role = 'client'
group by p.id, p.name, p.phone
having coalesce(max(a.created_at), 'epoch'::timestamptz) < now() - interval '180 days';

comment on view public.inactive_client_candidates is 'Clientes sin citas en 180 días (revisar antes de borrar cuenta).';

-- Ver teléfono/nombre del cliente en reservas (barbero asignado o admin).
-- SECURITY DEFINER evita recursión RLS al comprobar rol admin.
create or replace function public.auth_is_admin_profile()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

grant execute on function public.auth_is_admin_profile() to authenticated;

drop policy if exists "profiles_select_booking_context" on public.profiles;
create policy "profiles_select_booking_context"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.appointments a
      join public.barbers b on b.id = a.barber_id
      where a.client_id = profiles.id
        and b.user_id = auth.uid()
    )
    or (
      exists (select 1 from public.appointments a2 where a2.client_id = profiles.id)
      and public.auth_is_admin_profile()
    )
  );
