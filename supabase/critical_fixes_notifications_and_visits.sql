-- Fixes críticos:
-- 1) Notificaciones dirigidas por usuario para evitar fugas entre clientes.
-- 2) Ajuste atómico de visit_count desde SQL/RPC.

alter table public.notifications
  add column if not exists target_user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_notifications_target_user_id
  on public.notifications (target_user_id);

drop policy if exists "notifications_select_active" on public.notifications;

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

create or replace function public.adjust_profile_visit_count(p_user_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_barber boolean;
  next_value integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1
    from public.barbers b
    where b.user_id = auth.uid()
  ) into caller_is_barber;

  if not public.is_admin() and not caller_is_barber then
    raise exception 'Forbidden';
  end if;

  update public.profiles
  set visit_count = greatest(0, coalesce(visit_count, 0) + coalesce(p_delta, 0))
  where id = p_user_id
  returning visit_count into next_value;

  if next_value is null then
    raise exception 'Profile not found';
  end if;

  return next_value;
end;
$$;

revoke all on function public.adjust_profile_visit_count(uuid, integer) from public;
grant execute on function public.adjust_profile_visit_count(uuid, integer) to authenticated;

