-- Ejecuta este script en Supabase SQL Editor.
-- Alinea los estados reales que usa la app y deja lista la tabla de notificaciones dirigidas.

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'));

alter table public.notifications
  add column if not exists target_user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_notifications_target_user_id
  on public.notifications (target_user_id);
