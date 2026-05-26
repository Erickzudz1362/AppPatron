-- Ejecuta este script en Supabase SQL Editor.
-- Habilita el bucket home-carousel y sus permisos para:
-- - leer imagenes publicamente
-- - subir, editar y borrar desde la app con un usuario admin autenticado

insert into storage.buckets (id, name, public)
values ('home-carousel', 'home-carousel', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "home_carousel_public_read" on storage.objects;
create policy "home_carousel_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'home-carousel');

drop policy if exists "home_carousel_admin_upload" on storage.objects;
create policy "home_carousel_admin_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'home-carousel'
    and public.is_admin()
  );

drop policy if exists "home_carousel_admin_update" on storage.objects;
create policy "home_carousel_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'home-carousel'
    and public.is_admin()
  )
  with check (
    bucket_id = 'home-carousel'
    and public.is_admin()
  );

drop policy if exists "home_carousel_admin_delete" on storage.objects;
create policy "home_carousel_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'home-carousel'
    and public.is_admin()
  );
