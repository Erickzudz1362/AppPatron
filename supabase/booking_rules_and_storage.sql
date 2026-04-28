-- Ejecuta este script en Supabase SQL Editor.
-- Cierra reglas de reservas, vencimiento de pendientes, buckets de imagenes y ajustes de app.

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'));

alter table public.notifications
  add column if not exists target_user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_notifications_target_user_id
  on public.notifications (target_user_id);

drop policy if exists "notifications_insert_targeted_system" on public.notifications;
create policy "notifications_insert_targeted_system"
  on public.notifications for insert
  to authenticated
  with check (
    type = 'sistema'
    and target_user_id is not null
    and is_active = true
  );

alter table public.profiles
  add column if not exists visit_count integer not null default 0;

create or replace function public.adjust_profile_visit_count(p_user_id uuid, p_delta integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set visit_count = greatest(0, coalesce(visit_count, 0) + coalesce(p_delta, 0))
  where id = p_user_id;
$$;

revoke all on function public.adjust_profile_visit_count(uuid, integer) from public;
grant execute on function public.adjust_profile_visit_count(uuid, integer) to authenticated;
grant execute on function public.adjust_profile_visit_count(uuid, integer) to service_role;

insert into public.app_settings(key, value)
values
  ('show_second_carousel', 'true'),
  ('min_reservation_hours', '3')
on conflict (key) do update set value = excluded.value;

create or replace function public.expire_unconfirmed_appointments()
returns void
language sql
security definer
set search_path = public
as $$
  update public.appointments
  set status = 'cancelled',
      updated_at = now()
  where status = 'pending'
    and (
      (date::text || ' ' || time::text)::timestamp <= now() + interval '1 hour'
    );
$$;

revoke all on function public.expire_unconfirmed_appointments() from public;
grant execute on function public.expire_unconfirmed_appointments() to service_role;

create or replace function public.cleanup_old_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notifications
  where created_at < now() - interval '30 days';
$$;

revoke all on function public.cleanup_old_notifications() from public;
grant execute on function public.cleanup_old_notifications() to service_role;

do $$
declare
  v_jobid int;
begin
  begin
    select jobid into v_jobid from cron.job where jobname = 'expire-unconfirmed-appointments' limit 1;
    if v_jobid is not null then
      perform cron.unschedule(v_jobid);
    end if;
    perform cron.schedule(
      'expire-unconfirmed-appointments',
      '*/10 * * * *',
      $cron$select public.expire_unconfirmed_appointments();$cron$
    );
  exception
    when undefined_table then
      raise notice 'pg_cron no esta habilitado para expire_unconfirmed_appointments';
  end;

  begin
    select jobid into v_jobid from cron.job where jobname = 'cleanup-old-notifications-30d' limit 1;
    if v_jobid is not null then
      perform cron.unschedule(v_jobid);
    end if;
    perform cron.schedule(
      'cleanup-old-notifications-30d',
      '15 3 * * *',
      $cron$select public.cleanup_old_notifications();$cron$
    );
  exception
    when undefined_table then
      raise notice 'pg_cron no esta habilitado para cleanup_old_notifications';
  end;
end $$;

insert into storage.buckets (id, name, public)
values ('barber-photos', 'barber-photos', true)
on conflict (id) do nothing;

drop policy if exists "barber_photos_public_read" on storage.objects;
create policy "barber_photos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'barber-photos');

drop policy if exists "barber_photos_authenticated_upload" on storage.objects;
create policy "barber_photos_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'barber-photos');

drop policy if exists "barber_photos_authenticated_update" on storage.objects;
create policy "barber_photos_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'barber-photos')
  with check (bucket_id = 'barber-photos');

create table if not exists public.barber_reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  barber_id uuid not null references public.barbers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (appointment_id, client_id)
);

create index if not exists idx_barber_reviews_barber_id
  on public.barber_reviews (barber_id);

create index if not exists idx_barber_reviews_client_id
  on public.barber_reviews (client_id);

alter table public.barber_reviews enable row level security;

drop policy if exists "barber_reviews_select_all" on public.barber_reviews;
create policy "barber_reviews_select_all"
  on public.barber_reviews for select
  to authenticated
  using (true);

drop policy if exists "barber_reviews_insert_own" on public.barber_reviews;
create policy "barber_reviews_insert_own"
  on public.barber_reviews for insert
  to authenticated
  with check (auth.uid() = client_id);
