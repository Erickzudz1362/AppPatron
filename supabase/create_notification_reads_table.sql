-- Tabla para guardar "leído/no leído" por usuario y por aviso.
-- Ejecutar una sola vez en Supabase SQL Editor.

create table if not exists public.notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create index if not exists idx_notification_reads_user on public.notification_reads(user_id);
create index if not exists idx_notification_reads_notification on public.notification_reads(notification_id);

alter table public.notification_reads enable row level security;

drop policy if exists "notification_reads_select_own" on public.notification_reads;
drop policy if exists "notification_reads_insert_own" on public.notification_reads;
drop policy if exists "notification_reads_delete_own" on public.notification_reads;

create policy "notification_reads_select_own"
  on public.notification_reads for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notification_reads_insert_own"
  on public.notification_reads for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "notification_reads_delete_own"
  on public.notification_reads for delete
  to authenticated
  using (auth.uid() = user_id);
