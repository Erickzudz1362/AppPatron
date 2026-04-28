alter table public.coupons enable row level security;

drop policy if exists "coupons_select_active" on public.coupons;

create policy "coupons_select_active"
  on public.coupons
  for select
  to authenticated
  using (active = true);
