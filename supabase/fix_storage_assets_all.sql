-- Ejecuta este archivo en Supabase SQL Editor.
-- Deja listos los buckets usados por la app:
-- - home-carousel: carrusel principal, promociones, galeria y avatares configurables.
-- - payment-assets: QR general de pago.
-- - barber-photos: fotos de barberos/perfiles.

insert into storage.buckets (id, name, public)
values
  ('home-carousel', 'home-carousel', true),
  ('payment-assets', 'payment-assets', true),
  ('barber-photos', 'barber-photos', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "app_assets_public_read" on storage.objects;
create policy "app_assets_public_read"
  on storage.objects for select
  to public
  using (bucket_id in ('home-carousel', 'payment-assets', 'barber-photos'));

drop policy if exists "app_assets_admin_insert" on storage.objects;
create policy "app_assets_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('home-carousel', 'payment-assets')
    and public.is_admin()
  );

drop policy if exists "app_assets_admin_update" on storage.objects;
create policy "app_assets_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('home-carousel', 'payment-assets')
    and public.is_admin()
  )
  with check (
    bucket_id in ('home-carousel', 'payment-assets')
    and public.is_admin()
  );

drop policy if exists "app_assets_admin_delete" on storage.objects;
create policy "app_assets_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('home-carousel', 'payment-assets')
    and public.is_admin()
  );

drop policy if exists "barber_photos_authenticated_insert" on storage.objects;
create policy "barber_photos_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'barber-photos');

drop policy if exists "barber_photos_authenticated_update" on storage.objects;
create policy "barber_photos_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'barber-photos')
  with check (bucket_id = 'barber-photos');

drop policy if exists "barber_photos_authenticated_delete" on storage.objects;
create policy "barber_photos_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'barber-photos'
    and (
      public.is_admin()
      or owner = auth.uid()
    )
  );
