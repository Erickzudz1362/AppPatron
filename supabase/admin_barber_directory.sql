create or replace function public.get_admin_barber_directory()
returns table (
  id uuid,
  user_id uuid,
  name text,
  active boolean,
  specialties text[],
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo administradores';
  end if;

  return query
  select
    b.id,
    b.user_id,
    coalesce(
      nullif(trim(p.name), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      nullif(split_part(u.email, '@', 1), ''),
      'Barbero'
    ) as name,
    coalesce(b.active, true) as active,
    coalesce(b.specialties, array[]::text[]) as specialties,
    b.created_at
  from public.barbers b
  left join public.profiles p on p.id = b.user_id
  left join auth.users u on u.id = b.user_id
  order by b.created_at desc nulls last, b.id desc;
end;
$$;

revoke all on function public.get_admin_barber_directory() from public;
grant execute on function public.get_admin_barber_directory() to authenticated;
grant execute on function public.get_admin_barber_directory() to service_role;
