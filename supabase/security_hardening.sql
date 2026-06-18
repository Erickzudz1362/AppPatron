-- Ejecutar en Supabase SQL Editor.
-- Endurece funciones y storage sin romper el flujo actual de la app.

-- 1) Evitar que anon pueda ejecutar funciones SECURITY DEFINER por RPC.
revoke execute on function public.adjust_profile_visit_count(uuid, integer) from anon;
revoke execute on function public.cleanup_old_notifications() from anon;
revoke execute on function public.delete_my_account() from anon;
revoke execute on function public.expire_unconfirmed_appointments() from anon;
revoke execute on function public.get_admin_barber_directory() from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.get_staff_booking_details(text, text, uuid) from anon;

-- 2) Mantener solo permisos necesarios.
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_admin_barber_directory() to authenticated;
grant execute on function public.get_staff_booking_details(text, text, uuid) to authenticated;
grant execute on function public.adjust_profile_visit_count(uuid, integer) to authenticated;
grant execute on function public.cleanup_old_notifications() to service_role;
grant execute on function public.expire_unconfirmed_appointments() to service_role;

-- 3) Corregir search_path mutable en triggers/funciones comunes.
alter function public.set_updated_at_notifications() set search_path = public;
alter function public.update_updated_at_column() set search_path = public;
alter function public.handle_new_user() set search_path = public;

-- 4) Si quieres eliminar el warning de leaked passwords:
-- Dashboard -> Auth -> Settings -> Password Security -> Enable leaked password protection.
