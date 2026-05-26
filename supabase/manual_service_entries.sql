create extension if not exists pgcrypto;

create table if not exists public.manual_service_entries (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  amount numeric(10,2) not null check (amount >= 0),
  client_name text,
  notes text,
  performed_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_manual_service_entries_barber on public.manual_service_entries(barber_id);
create index if not exists idx_manual_service_entries_service on public.manual_service_entries(service_id);
create index if not exists idx_manual_service_entries_performed_at on public.manual_service_entries(performed_at desc);

create or replace function public.set_updated_at_manual_service_entries()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_manual_service_entries_updated_at on public.manual_service_entries;
create trigger trg_manual_service_entries_updated_at
before update on public.manual_service_entries
for each row
execute function public.set_updated_at_manual_service_entries();

alter table public.manual_service_entries enable row level security;

drop policy if exists "manual_entries_admin_all" on public.manual_service_entries;
create policy "manual_entries_admin_all"
  on public.manual_service_entries
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "manual_entries_barber_select_own" on public.manual_service_entries;
create policy "manual_entries_barber_select_own"
  on public.manual_service_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.barbers b
      where b.id = manual_service_entries.barber_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "manual_entries_barber_insert_own" on public.manual_service_entries;
create policy "manual_entries_barber_insert_own"
  on public.manual_service_entries
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.barbers b
      where b.id = manual_service_entries.barber_id
        and b.user_id = auth.uid()
    )
  );
