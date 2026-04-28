-- Tablas base para panel admin móvil.

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent integer not null check (discount_percent > 0 and discount_percent <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.coupons enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all"
  on public.coupons for all
  to authenticated
  using (public.is_admin());

drop policy if exists "settings_admin_all" on public.app_settings;
create policy "settings_admin_all"
  on public.app_settings for all
  to authenticated
  using (public.is_admin());

insert into public.app_settings(key, value)
values
  ('whatsapp_contact', 'https://wa.me/59165358449'),
  ('min_reservation_hours', '2')
on conflict (key) do nothing;

