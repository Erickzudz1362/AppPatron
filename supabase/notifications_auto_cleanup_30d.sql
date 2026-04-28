-- Limpieza automática de notificaciones con más de 30 días.
-- Ejecutar en Supabase SQL Editor.

-- 1) Función de limpieza (borrar notificaciones antiguas).
create or replace function public.cleanup_old_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notifications
  where coalesce(created_at, now()) < now() - interval '30 days';
$$;

revoke all on function public.cleanup_old_notifications() from public;
grant execute on function public.cleanup_old_notifications() to service_role;

-- 2) Programar ejecución diaria con pg_cron.
-- Nota: si ya existe el job, primero lo borramos para evitar duplicados.
do $$
declare
  v_jobid int;
begin
  select jobid into v_jobid
  from cron.job
  where jobname = 'cleanup-old-notifications-30d'
  limit 1;

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;

  perform cron.schedule(
    'cleanup-old-notifications-30d',
    '15 3 * * *', -- todos los días 03:15
    $cron$select public.cleanup_old_notifications();$cron$
  );
exception
  when undefined_table then
    raise notice 'pg_cron no está habilitado. Programa este SQL como Scheduled Function en Supabase Dashboard: select public.cleanup_old_notifications();';
end $$;

