-- Crear tabla de avisos/promociones para la app cliente.
-- Ejecutar una sola vez en Supabase SQL Editor.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'aviso' check (type in ('promo', 'aviso', 'sistema')),
  title text not null,
  message text not null,
  body text,
  link text,
  target_user_id uuid references auth.users(id) on delete cascade,
  read boolean not null default false,
  is_active boolean not null default true,
  date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_created_at on public.notifications (created_at desc);
create index if not exists idx_notifications_is_active on public.notifications (is_active);
create index if not exists idx_notifications_type on public.notifications (type);
create index if not exists idx_notifications_target_user_id on public.notifications (target_user_id);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_active" on public.notifications;
drop policy if exists "notifications_all_admin" on public.notifications;

-- Clientes y cualquier usuario autenticado pueden leer solo avisos activos.
create policy "notifications_select_active"
  on public.notifications for select
  to authenticated
  using (
    is_active = true
    and (
      target_user_id is null
      or target_user_id = auth.uid()
    )
  );

-- Solo admin gestiona crear/editar/eliminar avisos.
create policy "notifications_all_admin"
  on public.notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Mantener updated_at al editar.
create or replace function public.set_updated_at_notifications()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row
execute function public.set_updated_at_notifications();

-- Datos de ejemplo (opcional: elimina si no quieres seed).
insert into public.notifications (type, title, message, link, is_active)
values
  ('promo', 'Promo de fin de semana', '10% de descuento pagando por QR.', 'https://wa.me/59165358449', true),
  ('aviso', 'Horario especial', 'Este domingo abrimos de 09:00 a 14:00.', null, true)
on conflict do nothing;
