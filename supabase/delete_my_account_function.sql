-- Ejecutar en Supabase SQL Editor una sola vez.
-- Permite que el usuario autenticado elimine su cuenta y datos asociados.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- IDs de barbero ligados al usuario (si aplica).
  -- Se usa para limpiar disponibilidad y citas donde el usuario sea barbero.
  delete from public.availability_blocks
  where barber_id in (select b.id from public.barbers b where b.user_id = uid);

  delete from public.appointments
  where client_id = uid
     or barber_id in (select b.id from public.barbers b where b.user_id = uid);

  delete from public.barbers
  where user_id = uid;

  delete from public.profiles
  where id = uid;

  -- Elimina usuario de Auth (último paso).
  delete from auth.users
  where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
