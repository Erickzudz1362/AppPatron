-- Permite que la app avise en español cuando un correo ya tiene cuenta.
-- Ejecutar una vez en Supabase SQL Editor.

create or replace function public.email_exists(p_email text)
returns boolean
language sql
security definer
set search_path = auth, public
stable
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
    limit 1
  );
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon;
grant execute on function public.email_exists(text) to authenticated;
